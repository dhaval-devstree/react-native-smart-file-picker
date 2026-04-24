import Foundation
import PhotosUI
import Photos
import React
import TOCropViewController
import UniformTypeIdentifiers
import AVFoundation
import UIKit
import MobileCoreServices

@objc(RNSmartFilePicker)
class RNSmartFilePicker: NSObject {
  private enum MediaPickKind {
    case images
    case videos
  }
  private var pendingResolve: RCTPromiseResolveBlock?
  private var pendingReject: RCTPromiseRejectBlock?
  private var pendingOptions: NSDictionary?
  private var pendingAction: String?

  private var pendingPickedImages: [UIImage] = []
  private var pendingPickedImageIndex: Int = 0
  private var pendingMedias: [[String: Any]] = []

  private var cropController: TOCropViewController?

  @objc
  static func requiresMainQueueSetup() -> Bool {
    true
  }

  @objc(performAction:options:resolver:rejecter:)
  func performAction(_ action: String, options: NSDictionary, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    if pendingResolve != nil {
      reject("E_IN_PROGRESS", "Another picker request is already in progress", nil)
      return
    }

    pendingResolve = resolve
    pendingReject = reject
    pendingOptions = options
    pendingAction = action
    pendingPickedImages = []
    pendingPickedImageIndex = 0
    pendingMedias = []

    DispatchQueue.main.async {
      switch action {
      case "CAPTURE_IMAGE":
        guard self.ensureCameraPermissionGranted(forVideo: false) else { return }
        self.presentCamera(mediaTypes: ["public.image"])
      case "CAPTURE_VIDEO":
        guard self.ensureCameraPermissionGranted(forVideo: true) else { return }
        self.presentCamera(mediaTypes: ["public.movie"])
      case "PICK_IMAGE":
        self.presentPhotoPicker(kind: .images)
      case "PICK_VIDEO":
        self.presentPhotoPicker(kind: .videos)
      case "PICK_DOCUMENT":
        self.presentDocumentPicker()
      default:
        self.rejectAndClear(code: "E_BAD_ACTION", message: "Unknown action: \(action)")
      }
    }
  }

  private func presentCamera(mediaTypes: [String]) {
    guard UIImagePickerController.isSourceTypeAvailable(.camera) else {
      rejectAndClear(code: "E_CAMERA", message: "Camera not available")
      return
    }
    let picker = UIImagePickerController()
    picker.sourceType = .camera
    picker.mediaTypes = mediaTypes
    picker.delegate = self
    picker.videoQuality = .typeHigh
    present(picker)
  }

  @available(iOS 14.0, *)
  private func presentPHPicker(filter: PHPickerFilter) {
    let multiple = (pendingOptions?["multiple"] as? Bool) ?? false
    var config = PHPickerConfiguration(photoLibrary: .shared())
    config.selectionLimit = multiple ? 0 : 1
    config.filter = filter
    let picker = PHPickerViewController(configuration: config)
    picker.delegate = self
    present(picker)
  }

  private func presentPhotoPicker(kind: MediaPickKind) {
    if #available(iOS 14.0, *) {
      presentPHPicker(filter: kind == .videos ? .videos : .images)
      return
    }
    guard ensurePhotoLibraryPermissionGranted() else { return }
    // iOS < 14 fallback: single selection only.
    let picker = UIImagePickerController()
    picker.sourceType = .photoLibrary
    picker.delegate = self
    if kind == .videos {
      picker.mediaTypes = ["public.movie"]
    } else {
      picker.mediaTypes = ["public.image"]
    }
    present(picker)
  }

  private func presentDocumentPicker() {
    let mime = (pendingOptions?["documentMimeType"] as? String) ?? "*/*"
    let multiple = (pendingOptions?["multiple"] as? Bool) ?? false

    if #available(iOS 14.0, *) {
      let types: [UTType]
      if mime == "*/*" || mime == "*" {
        types = [.data]
      } else if let ut = UTType(mimeType: mime) {
        types = [ut]
      } else {
        types = [.data]
      }

      let picker = UIDocumentPickerViewController(forOpeningContentTypes: types, asCopy: false)
      picker.allowsMultipleSelection = multiple
      picker.delegate = self
      present(picker)
    } else {
      let uti: String
      if mime == "*/*" || mime == "*" {
        uti = kUTTypeData as String
      } else if let preferred = UTTypeCreatePreferredIdentifierForTag(kUTTagClassMIMEType, mime as CFString, nil)?.takeRetainedValue() {
        uti = preferred as String
      } else {
        uti = kUTTypeData as String
      }
      let picker = UIDocumentPickerViewController(documentTypes: [uti], in: .open)
      picker.allowsMultipleSelection = multiple
      picker.delegate = self
      present(picker)
    }
  }

  private func present(_ vc: UIViewController) {
    guard let top = topViewController() else {
      rejectAndClear(code: "E_NO_VIEW", message: "Unable to find a view controller to present from")
      return
    }
    if #available(iOS 13.0, *) {
      vc.overrideUserInterfaceStyle = .light
    }
    top.present(vc, animated: true)
  }

  private func topViewController() -> UIViewController? {
    let keyWindow: UIWindow?
    if #available(iOS 13.0, *) {
      keyWindow = UIApplication.shared.connectedScenes
        .compactMap { $0 as? UIWindowScene }
        .flatMap { $0.windows }
        .first { $0.isKeyWindow }
    } else {
      keyWindow = UIApplication.shared.keyWindow
    }
    var top = keyWindow?.rootViewController
    while let presented = top?.presentedViewController {
      top = presented
    }
    return top
  }

  private func isCropEnabled() -> Bool {
    guard let crop = pendingOptions?["crop"] as? NSDictionary else { return false }
    return (crop["enabled"] as? Bool) ?? false
  }

  private func cropAspect() -> NSDictionary? {
    guard let crop = pendingOptions?["crop"] as? NSDictionary else { return nil }
    return crop["aspectRatio"] as? NSDictionary
  }

  private func cropMaxResultSize() -> NSDictionary? {
    guard let crop = pendingOptions?["crop"] as? NSDictionary else { return nil }
    return crop["maxResultSize"] as? NSDictionary
  }

  private func compressOptions() -> NSDictionary? {
    guard let c = pendingOptions?["compress"] as? NSDictionary else { return nil }
    guard (c["enabled"] as? Bool) == true else { return nil }
    return c
  }

  private func cacheDir() -> URL {
    let dir = URL(fileURLWithPath: NSTemporaryDirectory(), isDirectory: true)
      .appendingPathComponent("smart-file-picker", isDirectory: true)
    try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
    return dir
  }

  private func resolveEmptyAndClear() {
    let result: [String: Any] = ["medias": []]
    let res = pendingResolve
    clearPending()
    res?(result)
  }

  private func resolveAndClear(medias: [[String: Any]]) {
    let result: [String: Any] = ["medias": medias]
    let res = pendingResolve
    clearPending()
    res?(result)
  }

  private func rejectAndClear(code: String, message: String, error: Error? = nil) {
    let rej = pendingReject
    clearPending()
    rej?(code, message, error)
  }

  private func ensureCameraPermissionGranted(forVideo: Bool) -> Bool {
    let camera = AVCaptureDevice.authorizationStatus(for: .video)
    if camera != .authorized {
      rejectAndClear(code: "E_PERMISSION_DENIED", message: "Camera permission denied")
      return false
    }

    if forVideo {
      let mic = AVCaptureDevice.authorizationStatus(for: .audio)
      if mic != .authorized {
        rejectAndClear(code: "E_PERMISSION_DENIED", message: "Microphone permission denied")
        return false
      }
    }

    return true
  }

  private func ensurePhotoLibraryPermissionGranted() -> Bool {
    // Only used for iOS < 14 UIImagePickerController flow.
    let status: PHAuthorizationStatus
    if #available(iOS 14.0, *) {
      status = PHPhotoLibrary.authorizationStatus(for: .readWrite)
    } else {
      status = PHPhotoLibrary.authorizationStatus()
    }
    if status == .authorized {
      return true
    }
    if #available(iOS 14.0, *), status == .limited {
      return true
    }
    rejectAndClear(code: "E_PERMISSION_DENIED", message: "Photo library permission denied")
    return false
  }

  private func clearPending() {
    pendingResolve = nil
    pendingReject = nil
    pendingOptions = nil
    pendingAction = nil
    pendingPickedImages = []
    pendingPickedImageIndex = 0
    pendingMedias = []
    cropController = nil
  }

  private func processPickedImagesIfNeeded() {
    // Called after we have pendingPickedImages set.
    if pendingPickedImages.isEmpty {
      resolveAndClear(medias: pendingMedias)
      return
    }
    if isCropEnabled(), pendingPickedImages.count > 1 {
      rejectAndClear(code: "E_CROP_MULTI", message: "Crop is not supported with multiple selection")
      return
    }
    processNextImage()
  }

  private func processNextImage() {
    if pendingPickedImageIndex >= pendingPickedImages.count {
      resolveAndClear(medias: pendingMedias)
      return
    }
    let image = pendingPickedImages[pendingPickedImageIndex]
    if isCropEnabled() {
      presentCrop(image: image)
    } else {
      do {
        let media = try writeImageToCache(image: image)
        pendingMedias.append(media)
        pendingPickedImageIndex += 1
        processNextImage()
      } catch {
        rejectAndClear(code: "E_PROCESS", message: error.localizedDescription, error: error)
      }
    }
  }

  private func presentCrop(image: UIImage) {
    let cropVC = TOCropViewController(image: image)
    cropVC.delegate = self

    if let aspect = cropAspect(), let mode = aspect["mode"] as? String {
      if mode == "square" {
        cropVC.aspectRatioPreset = TOCropViewControllerAspectRatioPreset.square
        cropVC.aspectRatioLockEnabled = true
        cropVC.resetAspectRatioEnabled = false
      } else if mode == "fixed",
                let x = aspect["x"] as? NSNumber,
                let y = aspect["y"] as? NSNumber {
        cropVC.aspectRatioPreset = CGSize(width: CGFloat(truncating: x), height: CGFloat(truncating: y))
        cropVC.aspectRatioLockEnabled = true
        cropVC.resetAspectRatioEnabled = false
      } else {
        cropVC.aspectRatioLockEnabled = false
      }
    } else {
      cropVC.aspectRatioLockEnabled = false
    }

    cropController = cropVC
    present(cropVC)
  }

  private func writeImageToCache(image: UIImage) throws -> [String: Any] {
    let compress = compressOptions()
    let quality = ((compress?["quality"] as? NSNumber)?.intValue ?? 100).clamped(to: 0...100)
    let format = (compress?["format"] as? String)?.lowercased() ?? "jpeg"
    let maxW = (compress?["maxWidth"] as? NSNumber)?.intValue ?? 0
    let maxH = (compress?["maxHeight"] as? NSNumber)?.intValue ?? 0

    // Apply crop max result size (if set) before compression scaling.
    let cropMax = cropMaxResultSize()
    let cropMaxW = (cropMax?["width"] as? NSNumber)?.intValue ?? 0
    let cropMaxH = (cropMax?["height"] as? NSNumber)?.intValue ?? 0

    let croppedLimited = scale(image: image, maxWidth: cropMaxW, maxHeight: cropMaxH)
    let scaled = scale(image: croppedLimited, maxWidth: maxW, maxHeight: maxH)

    let outExt: String
    let data: Data?
    switch format {
    case "png":
      outExt = "png"
      data = scaled.pngData()
    case "webp":
      outExt = "jpg"
      data = scaled.jpegData(compressionQuality: CGFloat(quality) / 100.0)
    default:
      outExt = "jpg"
      data = scaled.jpegData(compressionQuality: CGFloat(quality) / 100.0)
    }
    guard let bytes = data else {
      throw NSError(domain: "SmartFilePicker", code: 1, userInfo: [NSLocalizedDescriptionKey: "Failed to encode image"])
    }

    let url = cacheDir().appendingPathComponent("img_\(UUID().uuidString).\(outExt)")
    try bytes.write(to: url, options: .atomic)

    let fileSize = (try? FileManager.default.attributesOfItem(atPath: url.path)[.size] as? NSNumber)?.doubleValue
    var media: [String: Any] = [
      "kind": "image",
      "uri": url.absoluteString,
      "localPath": url.absoluteString,
      "fileName": url.lastPathComponent
    ]
    if let fileSize { media["fileSize"] = fileSize }
    media["width"] = Int(scaled.size.width)
    media["height"] = Int(scaled.size.height)
    media["mimeType"] = (outExt == "png") ? "image/png" : "image/jpeg"
    return media
  }

  private func scale(image: UIImage, maxWidth: Int, maxHeight: Int) -> UIImage {
    guard maxWidth > 0 || maxHeight > 0 else { return image }
    let srcW = image.size.width
    let srcH = image.size.height
    let wLimit = maxWidth > 0 ? CGFloat(maxWidth) : srcW
    let hLimit = maxHeight > 0 ? CGFloat(maxHeight) : srcH
    let ratio = min(wLimit / srcW, hLimit / srcH, 1.0)
    guard ratio < 1.0 else { return image }
    let newSize = CGSize(width: max(srcW * ratio, 1), height: max(srcH * ratio, 1))
    UIGraphicsBeginImageContextWithOptions(newSize, false, 1.0)
    image.draw(in: CGRect(origin: .zero, size: newSize))
    let out = UIGraphicsGetImageFromCurrentImageContext()
    UIGraphicsEndImageContext()
    return out ?? image
  }

  private func preferredMimeType(forExtension ext: String) -> String? {
    if #available(iOS 14.0, *) {
      return UTType(filenameExtension: ext)?.preferredMIMEType
    }
    if let uti = UTTypeCreatePreferredIdentifierForTag(kUTTagClassFilenameExtension, ext as CFString, nil)?.takeRetainedValue(),
       let mime = UTTypeCopyPreferredTagWithClass(uti, kUTTagClassMIMEType)?.takeRetainedValue() {
      return mime as String
    }
    return nil
  }

  private func copyFileToCache(originalURL: URL, preferredName: String?, forceExtension: String?) throws -> [String: Any] {
    let didStart = originalURL.startAccessingSecurityScopedResource()
    defer { if didStart { originalURL.stopAccessingSecurityScopedResource() } }

    let dir = cacheDir()
    let name: String
    if let preferredName, !preferredName.isEmpty {
      name = preferredName
    } else {
      let ext = forceExtension ?? (originalURL.pathExtension.isEmpty ? "bin" : originalURL.pathExtension)
      name = "doc_\(UUID().uuidString).\(ext)"
    }
    let sanitized = name.replacingOccurrences(of: "[:/\\\\?%*|\"<>]", with: "_", options: .regularExpression)
    let outURL = dir.appendingPathComponent(sanitized)

    if FileManager.default.fileExists(atPath: outURL.path) {
      try FileManager.default.removeItem(at: outURL)
    }
    try FileManager.default.copyItem(at: originalURL, to: outURL)

    let fileSize = (try? FileManager.default.attributesOfItem(atPath: outURL.path)[.size] as? NSNumber)?.doubleValue
    let mime = outURL.pathExtension.isEmpty ? nil : preferredMimeType(forExtension: outURL.pathExtension)
    var media: [String: Any] = [
      "uri": originalURL.absoluteString,
      "localPath": outURL.absoluteString,
      "fileName": outURL.lastPathComponent
    ]
    if let fileSize { media["fileSize"] = fileSize }
    if let mime { media["mimeType"] = mime }
    return media
  }
}

private extension Comparable {
  func clamped(to limits: ClosedRange<Self>) -> Self {
    min(max(self, limits.lowerBound), limits.upperBound)
  }
}

extension RNSmartFilePicker: UINavigationControllerDelegate, UIImagePickerControllerDelegate {
  func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
    picker.dismiss(animated: true) {
      self.resolveEmptyAndClear()
    }
  }

  func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]) {
    let action = pendingAction
    picker.dismiss(animated: true) {
      if action == "CAPTURE_VIDEO" || action == "PICK_VIDEO" {
        guard let url = info[.mediaURL] as? URL else {
          self.rejectAndClear(code: "E_PICK", message: "Missing video URL")
          return
        }
        do {
          let media = try self.copyVideoToCache(originalURL: url)
          self.resolveAndClear(medias: [media])
        } catch {
          self.rejectAndClear(code: "E_PROCESS", message: error.localizedDescription, error: error)
        }
        return
      }

      if let image = info[.originalImage] as? UIImage {
        self.pendingPickedImages = [image]
        self.pendingPickedImageIndex = 0
        self.processPickedImagesIfNeeded()
        return
      }
      self.rejectAndClear(code: "E_PICK", message: "Missing image")
    }
  }

  private func copyVideoToCache(originalURL: URL) throws -> [String: Any] {
    let dir = cacheDir()
    let ext = originalURL.pathExtension.isEmpty ? "mp4" : originalURL.pathExtension
    let fileURL = dir.appendingPathComponent("vid_\(UUID().uuidString).\(ext)")
    try FileManager.default.copyItem(at: originalURL, to: fileURL)

    let asset = AVURLAsset(url: fileURL)
    let durationMs = Int(CMTimeGetSeconds(asset.duration) * 1000.0)
    let fileSize = (try? FileManager.default.attributesOfItem(atPath: fileURL.path)[.size] as? NSNumber)?.doubleValue
    let mime = preferredMimeType(forExtension: fileURL.pathExtension) ?? "video/*"
    var media: [String: Any] = [
      "kind": "video",
      "uri": originalURL.absoluteString,
      "localPath": fileURL.absoluteString,
      "fileName": fileURL.lastPathComponent,
      "durationMs": durationMs,
      "mimeType": mime
    ]
    if let fileSize { media["fileSize"] = fileSize }
    return media
  }
}

@available(iOS 14.0, *)
extension RNSmartFilePicker: PHPickerViewControllerDelegate {
  func picker(_ picker: PHPickerViewController, didFinishPicking results: [PHPickerResult]) {
    if results.isEmpty {
      picker.dismiss(animated: true) {
        self.resolveEmptyAndClear()
      }
      return
    }

    let action = pendingAction
    let multiple = (pendingOptions?["multiple"] as? Bool) ?? false
    if !multiple, results.count > 1 {
      // Shouldn't happen with config, but guard anyway.
    }

    let group = DispatchGroup()
    var loadError: Error?

    if action == "PICK_VIDEO" {
      var medias: [[String: Any]] = []
      for r in results {
        group.enter()
        let provider = r.itemProvider
        if provider.hasItemConformingToTypeIdentifier(UTType.movie.identifier) {
          provider.loadFileRepresentation(forTypeIdentifier: UTType.movie.identifier) { url, error in
            defer { group.leave() }
            if let error { loadError = error; return }
            guard let url else { loadError = NSError(domain: "SmartFilePicker", code: 2, userInfo: [NSLocalizedDescriptionKey: "Missing picked video url"]); return }
            do {
              let copied = try self.copyFileToCache(originalURL: url, preferredName: nil, forceExtension: nil)
              var media = copied
              media["kind"] = "video"
              if media["mimeType"] == nil { media["mimeType"] = "video/*" }
              let asset = AVURLAsset(url: URL(string: copied["localPath"] as! String)!)
              let durationMs = Int(CMTimeGetSeconds(asset.duration) * 1000.0)
              media["durationMs"] = durationMs
              medias.append(media)
            } catch {
              loadError = error
            }
          }
        } else {
          group.leave()
        }
      }
      group.notify(queue: .main) {
        picker.dismiss(animated: true) {
          if let loadError {
            self.rejectAndClear(code: "E_PICK", message: loadError.localizedDescription, error: loadError)
          } else {
            self.resolveAndClear(medias: medias)
          }
        }
      }
      return
    }

    // Images
    var images: [UIImage] = []
    for r in results {
      group.enter()
      let provider = r.itemProvider
      if provider.canLoadObject(ofClass: UIImage.self) {
        provider.loadObject(ofClass: UIImage.self) { obj, error in
          defer { group.leave() }
          if let error { loadError = error; return }
          if let img = obj as? UIImage {
            images.append(img)
          }
        }
      } else {
        group.leave()
      }
    }

    group.notify(queue: .main) {
      picker.dismiss(animated: true) {
        if let loadError {
          self.rejectAndClear(code: "E_PICK", message: loadError.localizedDescription, error: loadError)
          return
        }
        if images.isEmpty {
          self.resolveEmptyAndClear()
          return
        }
        self.pendingPickedImages = images
        self.pendingPickedImageIndex = 0
        self.processPickedImagesIfNeeded()
      }
    }
  }
}

extension RNSmartFilePicker: UIDocumentPickerDelegate {
  func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) {
    controller.dismiss(animated: true) {
      self.resolveEmptyAndClear()
    }
  }

  func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) {
    controller.dismiss(animated: true) {
      if urls.isEmpty {
        self.resolveEmptyAndClear()
        return
      }
      do {
        let enableOriginalName = (self.pendingOptions?["enableDocumentWithOriginalName"] as? Bool) ?? false
        let medias = try urls.map { url -> [String: Any] in
          let preferred = enableOriginalName ? url.lastPathComponent : nil
          var media = try self.copyFileToCache(originalURL: url, preferredName: preferred, forceExtension: nil)
          media["kind"] = "document"
          return media
        }
        self.resolveAndClear(medias: medias)
      } catch {
        self.rejectAndClear(code: "E_PICK", message: error.localizedDescription, error: error)
      }
    }
  }
}

extension RNSmartFilePicker: TOCropViewControllerDelegate {
  func cropViewController(_ cropViewController: TOCropViewController, didCropTo image: UIImage, with cropRect: CGRect, angle: Int) {
    cropViewController.dismiss(animated: true) {
      do {
        let media = try self.writeImageToCache(image: image)
        self.pendingMedias.append(media)
        self.pendingPickedImageIndex += 1
        self.processNextImage()
      } catch {
        self.rejectAndClear(code: "E_PROCESS", message: error.localizedDescription, error: error)
      }
    }
  }

  func cropViewController(_ cropViewController: TOCropViewController, didFinishCancelled cancelled: Bool) {
    cropViewController.dismiss(animated: true) {
      self.resolveEmptyAndClear()
    }
  }
}
