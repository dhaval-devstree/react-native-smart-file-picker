package com.smartfilepicker

import android.Manifest
import android.app.Activity
import android.content.ClipData
import android.content.Intent
import android.database.Cursor
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.media.MediaMetadataRetriever
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.OpenableColumns
import android.content.pm.PackageManager
import androidx.core.content.FileProvider
import androidx.exifinterface.media.ExifInterface
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
import com.yalantis.ucrop.UCrop
import java.io.File
import java.io.FileOutputStream
import java.util.UUID
import java.util.concurrent.Executors

class SmartFilePickerModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext), ActivityEventListener {

  private val ioExecutor = Executors.newSingleThreadExecutor()
  private val mainHandler = Handler(Looper.getMainLooper())

  private var pendingPromise: Promise? = null
  private var pendingAction: String? = null
  private var pendingOptions: ReadableMap? = null

  private var pendingCameraOutputUri: Uri? = null
  private var pendingCameraOutputFile: File? = null
  private var pendingCropRequest: CropRequest? = null
  private var pendingVideoTrimOriginalUri: Uri? = null
  private var pendingVideoTrimSourceFile: File? = null

  data class CropRequest(
    val source: Uri,
    val options: ReadableMap
  )

  init {
    reactContext.addActivityEventListener(this)
  }

  override fun getName(): String = "SmartFilePicker"

  @ReactMethod
  fun performAction(action: String, options: ReadableMap, promise: Promise) {
    if (pendingPromise != null) {
      promise.reject("E_IN_PROGRESS", "Another picker request is already in progress")
      return
    }
    val activity = reactApplicationContext.currentActivity
    if (activity == null) {
      promise.reject("E_NO_ACTIVITY", "Current activity is null")
      return
    }

    pendingPromise = promise
    pendingAction = action
    pendingOptions = options

    when (action) {
      "CAPTURE_IMAGE", "CAPTURE_VIDEO" -> {
        if (!isPermissionGranted(activity, Manifest.permission.CAMERA)) {
          reject("E_PERMISSION_DENIED", "Camera permission denied")
          return
        }
        startCameraFlow(activity, action, options)
      }
      "PICK_IMAGE" -> startPickFlow(activity, "image/*", options)
      "PICK_VIDEO" -> startPickFlow(activity, "video/*", options)
      "PICK_DOCUMENT" -> {
        val type = options.optString("documentMimeType") ?: "*/*"
        startPickFlow(activity, type, options)
      }
      else -> {
        reject("E_BAD_ACTION", "Unknown action: $action")
      }
    }
  }

  @ReactMethod
  fun clearCache(promise: Promise) {
    ioExecutor.execute {
      try {
        val dir = File(reactContext.cacheDir, "smart-file-picker")
        if (dir.exists()) {
          dir.deleteRecursively()
        }
        promise.resolve(null)
      } catch (e: Exception) {
        promise.reject("E_CLEAR_CACHE", e.message ?: "Failed to clear cache")
      }
    }
  }

  @ReactMethod
  fun getCachePath(promise: Promise) {
    try {
      promise.resolve(ensureCacheDir().absolutePath)
    } catch (e: Exception) {
      promise.reject("E_CACHE_PATH", e.message ?: "Failed to get cache path")
    }
  }

  private fun isPermissionGranted(activity: Activity, permission: String): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return true
    return activity.checkSelfPermission(permission) == android.content.pm.PackageManager.PERMISSION_GRANTED
  }

  private fun startCameraFlow(activity: Activity, action: String, options: ReadableMap) {
    try {
      if (action == "CAPTURE_IMAGE") {
        val cacheDir = ensureCacheDir()
        val authority = "${reactContext.packageName}.smartfilepicker.provider"
        val file = File(cacheDir, "capture_${UUID.randomUUID()}.jpg")
        try {
          file.parentFile?.mkdirs()
          if (!file.exists()) file.createNewFile()
        } catch (_: Exception) {}
        val uri = FileProvider.getUriForFile(reactContext, authority, file)
        pendingCameraOutputUri = uri
        pendingCameraOutputFile = file
        val intent = Intent(android.provider.MediaStore.ACTION_IMAGE_CAPTURE).apply {
          putExtra(android.provider.MediaStore.EXTRA_OUTPUT, uri)
          addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION)
          clipData = ClipData.newRawUri("output", uri)
        }
        val resInfoList =
          reactContext.packageManager.queryIntentActivities(intent, PackageManager.MATCH_DEFAULT_ONLY)
        for (resolveInfo in resInfoList) {
          val packageName = resolveInfo.activityInfo.packageName
          reactContext.grantUriPermission(
            packageName,
            uri,
            Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION
          )
        }
        activity.startActivityForResult(intent, REQ_CAPTURE_IMAGE)
      } else {
        // NOTE: Many camera apps (and the Android emulator camera) ignore EXTRA_OUTPUT for video and can
        // return an empty file. Prefer letting the camera decide the output and return a content:// Uri.
        pendingCameraOutputUri = null
        pendingCameraOutputFile = null
        val intent = Intent(android.provider.MediaStore.ACTION_VIDEO_CAPTURE).apply {
          addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        activity.startActivityForResult(intent, REQ_CAPTURE_VIDEO)
      }
    } catch (e: Exception) {
      reject("E_CAMERA", e.message ?: "Failed to start camera")
    }
  }

  private fun startPickFlow(activity: Activity, mimeType: String, options: ReadableMap) {
    try {
      val multiple = options.optBoolean("multiple", false)
      val intent = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
        addCategory(Intent.CATEGORY_OPENABLE)
        type = mimeType
        putExtra(Intent.EXTRA_ALLOW_MULTIPLE, multiple)
      }
      val reqCode = when (pendingAction) {
        "PICK_IMAGE" -> REQ_PICK_IMAGE
        "PICK_VIDEO" -> REQ_PICK_VIDEO
        else -> REQ_PICK_DOCUMENT
      }
      activity.startActivityForResult(intent, reqCode)
    } catch (e: Exception) {
      reject("E_PICK", e.message ?: "Failed to start picker")
    }
  }

  override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
    if (pendingPromise == null) return
    if (resultCode != Activity.RESULT_OK) {
      resolveEmpty()
      return
    }

    when (requestCode) {
      REQ_CAPTURE_IMAGE -> {
        val outputFile = pendingCameraOutputFile
        val outputUri = pendingCameraOutputUri
        pendingCameraOutputUri = null
        pendingCameraOutputFile = null
        val uri =
          if (outputFile != null && outputFile.exists() && outputFile.length() > 0) Uri.fromFile(outputFile)
          else outputUri ?: data?.data
        if (uri == null) {
          reject("E_CAMERA", "Missing camera output uri")
          return
        }
        handleSingleUri(kind = "image", uri = uri)
      }
      REQ_CAPTURE_VIDEO -> {
        val dataUri = data?.data
        val outputFile = pendingCameraOutputFile
        val outputUri = pendingCameraOutputUri
        pendingCameraOutputUri = null
        pendingCameraOutputFile = null

        val uri = dataUri
          ?: if (outputFile != null && waitForNonEmptyFile(outputFile, timeoutMs = 2500)) Uri.fromFile(outputFile)
          else outputUri
        if (uri == null) {
          reject("E_CAMERA", "Missing captured video uri")
          return
        }
        handleSingleUri(kind = "video", uri = uri)
      }
      REQ_PICK_IMAGE -> handlePickedUris(kind = "image", data = data)
      REQ_PICK_VIDEO -> handlePickedUris(kind = "video", data = data)
      REQ_PICK_DOCUMENT -> handlePickedUris(kind = "document", data = data)
      UCrop.REQUEST_CROP -> {
        val output = data?.let { UCrop.getOutput(it) }
        val cropReq = pendingCropRequest
        pendingCropRequest = null
        if (output == null || cropReq == null) {
          reject("E_CROP", "Crop failed")
          return
        }
        handleSingleUri(kind = "image", uri = output, alreadyCropped = true)
      }
      UCrop.RESULT_ERROR -> {
        val error = data?.let { UCrop.getError(it) }
        pendingCropRequest = null
        reject("E_CROP", error?.message ?: "Crop failed")
      }
      REQ_TRIM_VIDEO -> {
        val original = pendingVideoTrimOriginalUri
        val sourceFile = pendingVideoTrimSourceFile
        val options = pendingOptions
        pendingVideoTrimOriginalUri = null
        pendingVideoTrimSourceFile = null

        if (data == null || original == null || options == null) {
          reject("E_TRIM", "Video trim failed")
          return
        }

        val trimmedPath = data.getStringExtra(VideoTrimActivity.EXTRA_OUTPUT_PATH)
        if (trimmedPath.isNullOrBlank()) {
          // User cancelled trim (back button). Clean up temp cached copy and return original Uri info (no localPath).
          try { sourceFile?.delete() } catch (_: Exception) {}
          ioExecutor.execute {
            try {
              val media = buildVideoMediaFromContentUri(original)
              val result = Arguments.createMap().apply {
                putArray("medias", Arguments.createArray().apply { pushMap(media) })
              }
              resolve(result)
            } catch (e: Exception) {
              // Fallback: behave like cancel.
              resolveEmpty()
            }
          }
          return
        }

        ioExecutor.execute {
          try {
            try { sourceFile?.delete() } catch (_: Exception) {}
            val normalized = normalizeTrimmedVideoFile(File(trimmedPath))
            val cached = copyFilePathToCache(normalized, preferredExt = "mp4")
            if (cached.absolutePath != normalized.absolutePath) {
              try { normalized.delete() } catch (_: Exception) {}
            }
            val minMs = videoTrimMinDurationMs(options) ?: 0L
            if (minMs > 0L) {
              val duration = videoDurationMs(cached)
              if (duration in 1 until minMs) {
                try { cached.delete() } catch (_: Exception) {}
                reject("E_TRIM_MIN_DURATION", "Trimmed video is shorter than the minimum duration")
                return@execute
              }
            }
            val media = buildVideoMediaFromFile(original, cached)
            val result = Arguments.createMap().apply {
              putArray("medias", Arguments.createArray().apply { pushMap(media) })
            }
            resolve(result)
          } catch (e: Exception) {
            reject("E_TRIM", e.message ?: "Video trim failed")
          }
        }
      }
    }
  }

  override fun onNewIntent(intent: Intent) = Unit

  private fun handlePickedUris(kind: String, data: Intent?) {
    if (data == null) {
      reject("E_PICK", "No data returned")
      return
    }
    val uris = mutableListOf<Uri>()
    val clip = data.clipData
    if (clip != null) {
      for (i in 0 until clip.itemCount) {
        uris.add(clip.getItemAt(i).uri)
      }
    } else {
      data.data?.let { uris.add(it) }
    }
    if (uris.isEmpty()) {
      reject("E_PICK", "No uri returned")
      return
    }
    val crop = pendingOptions?.optMap("crop")
    val cropEnabled = crop?.optBoolean("enabled", false) == true
    if (kind == "image" && cropEnabled && uris.size > 1) {
      reject("E_CROP_MULTI", "Crop is not supported with multiple selection")
      return
    }
    if (kind == "image" && cropEnabled) {
      startCrop(uris[0], crop!!)
      return
    }
    val videoTrimEnabled = kind == "video" && isVideoTrimEnabled(pendingOptions)
    if (videoTrimEnabled) {
      if (uris.size > 1) {
        reject("E_TRIM_MULTI", "Video trim is not supported with multiple selection")
        return
      }
      startVideoTrimFlow(uris[0])
      return
    }
    handleUris(kind, uris)
  }

  private fun handleSingleUri(kind: String, uri: Uri, alreadyCropped: Boolean = false) {
    val crop = pendingOptions?.optMap("crop")
    val cropEnabled = crop?.optBoolean("enabled", false) == true
    if (kind == "image" && cropEnabled && !alreadyCropped) {
      startCrop(uri, crop!!)
      return
    }
    val videoTrimEnabled = kind == "video" && isVideoTrimEnabled(pendingOptions)
    if (videoTrimEnabled) {
      startVideoTrimFlow(uri)
      return
    }
    handleUris(kind, listOf(uri))
  }

  private fun startVideoTrimFlow(originalUri: Uri) {
    val activity = reactApplicationContext.currentActivity
    val options = pendingOptions
    if (activity == null || options == null) {
      reject("E_NO_ACTIVITY", "Current activity is null")
      return
    }
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.N) {
      reject("E_TRIM_UNSUPPORTED", "Video trim is only supported on Android 7.0+")
      return
    }

    ioExecutor.execute {
      try {
        val sourceFile = copyUriToCache(originalUri, options, preferredExt = guessVideoExt(originalUri))
        pendingVideoTrimOriginalUri = originalUri
        pendingVideoTrimSourceFile = sourceFile
        val maxDurationMs = videoTrimMaxDurationMs(options)
        val minDurationMs = videoTrimMinDurationMs(options)
        mainHandler.post {
          try {
            val intent = Intent(activity, VideoTrimActivity::class.java).apply {
              putExtra(VideoTrimActivity.EXTRA_INPUT_URI, Uri.fromFile(sourceFile).toString())
              if (maxDurationMs != null) putExtra(VideoTrimActivity.EXTRA_MAX_DURATION_MS, maxDurationMs)
              if (minDurationMs != null) putExtra(VideoTrimActivity.EXTRA_MIN_DURATION_MS, minDurationMs)
            }
            activity.startActivityForResult(intent, REQ_TRIM_VIDEO)
          } catch (e: Exception) {
            try { sourceFile.delete() } catch (_: Exception) {}
            pendingVideoTrimOriginalUri = null
            pendingVideoTrimSourceFile = null
            reject("E_TRIM", e.message ?: "Failed to start video trim")
          }
        }
      } catch (e: SecurityException) {
        reject("E_PERMISSION_DENIED", "Storage permission denied")
      } catch (e: Exception) {
        reject("E_TRIM", e.message ?: "Failed to prepare video for trim")
      }
    }
  }

  private fun startCrop(source: Uri, cropOptions: ReadableMap) {
    val activity = reactApplicationContext.currentActivity
    if (activity == null) {
      reject("E_NO_ACTIVITY", "Current activity is null")
      return
    }
    try {
      val destFile = File(ensureCacheDir(), "crop_${UUID.randomUUID()}.jpg")
      val destUri = Uri.fromFile(destFile)

      val uCrop = UCrop.of(source, destUri)
      val aspect = cropOptions.optMap("aspectRatio")
      if (aspect != null) {
        val mode = aspect.optString("mode")
        if (mode == "square") {
          uCrop.withAspectRatio(1f, 1f)
        } else if (mode == "fixed") {
          val x = aspect.optDouble("x")?.toFloat() ?: 1f
          val y = aspect.optDouble("y")?.toFloat() ?: 1f
          uCrop.withAspectRatio(x, y)
        }
      }
      val max = cropOptions.optMap("maxResultSize")
      if (max != null) {
        val w = max.optInt("width") ?: 0
        val h = max.optInt("height") ?: 0
        if (w > 0 && h > 0) uCrop.withMaxResultSize(w, h)
      }

      pendingCropRequest = CropRequest(source = source, options = cropOptions)
      uCrop.start(activity)
    } catch (e: Exception) {
      reject("E_CROP", e.message ?: "Failed to start crop")
    }
  }

  private fun handleUris(kind: String, uris: List<Uri>) {
    val options = pendingOptions
    if (options == null) {
      reject("E_INTERNAL", "Missing pending options")
      return
    }
    ioExecutor.execute {
      try {
        val medias = Arguments.createArray()
        for (uri in uris) {
          val media = when (kind) {
            "image" -> buildImageMedia(uri, options)
            "video" -> buildVideoMedia(uri, options)
            else -> buildDocumentMedia(uri, options)
          }
          medias.pushMap(media)
        }
        val result = Arguments.createMap().apply {
          putArray("medias", medias)
        }
        resolve(result)
      } catch (e: SecurityException) {
        reject("E_PERMISSION_DENIED", "Storage permission denied")
      } catch (e: Exception) {
        reject("E_PROCESS", e.message ?: "Failed to process media")
      }
    }
  }

  private fun buildImageMedia(uri: Uri, options: ReadableMap): WritableMap {
    val compress = options.optMap("compress")
    val compressEnabled = compress?.optBoolean("enabled", false) == true

    val sourceFile = copyUriToCache(uri, options, preferredExt = guessImageExt(uri))
    val processedFile =
      if (compressEnabled) {
        val out = transcodeImage(
          sourceFile,
          quality = compress?.optInt("quality") ?: 100,
          format = compress?.optString("format") ?: "jpeg",
          maxWidth = compress?.optInt("maxWidth") ?: 0,
          maxHeight = compress?.optInt("maxHeight") ?: 0
        )
        // Avoid keeping both original and compressed copies in cache.
        if (out.absolutePath != sourceFile.absolutePath) {
          try { sourceFile.delete() } catch (_: Exception) {}
        }
        out
      } else {
        sourceFile
      }

    val (w, h) = decodeImageSize(processedFile)
    val mime = guessMimeFromExt(processedFile.extension, fallback = contentType(uri))

    return Arguments.createMap().apply {
      putString("kind", "image")
      putString("uri", uri.toString())
      putString("localPath", Uri.fromFile(processedFile).toString())
      putString("fileName", processedFile.name)
      putString("mimeType", mime)
      putDouble("fileSize", processedFile.length().toDouble())
      if (w != null) putInt("width", w)
      if (h != null) putInt("height", h)
    }
  }

  private fun buildVideoMedia(uri: Uri, options: ReadableMap): WritableMap {
    val file = copyUriToCache(uri, options, preferredExt = guessVideoExt(uri))
    val retriever = MediaMetadataRetriever()
    var durationMs: Int? = null
    try {
      retriever.setDataSource(reactContext, Uri.fromFile(file))
      val d = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)
      durationMs = d?.toIntOrNull()
    } catch (_: Exception) {
    } finally {
      try { retriever.release() } catch (_: Exception) {}
    }
    val mime = guessMimeFromExt(file.extension, fallback = contentType(uri))
    return Arguments.createMap().apply {
      putString("kind", "video")
      putString("uri", uri.toString())
      putString("localPath", Uri.fromFile(file).toString())
      putString("fileName", file.name)
      putString("mimeType", mime)
      putDouble("fileSize", file.length().toDouble())
      if (durationMs != null) putInt("durationMs", durationMs)
    }
  }

  private fun buildVideoMediaFromFile(originalUri: Uri, file: File): WritableMap {
    val retriever = MediaMetadataRetriever()
    var durationMs: Int? = null
    try {
      retriever.setDataSource(file.absolutePath)
      val d = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)
      durationMs = d?.toIntOrNull()
    } catch (_: Exception) {
    } finally {
      try { retriever.release() } catch (_: Exception) {}
    }
    val mime = guessMimeFromExt(file.extension, fallback = contentType(originalUri))
    return Arguments.createMap().apply {
      putString("kind", "video")
      putString("uri", originalUri.toString())
      putString("localPath", Uri.fromFile(file).toString())
      putString("fileName", file.name)
      putString("mimeType", mime)
      putDouble("fileSize", file.length().toDouble())
      if (durationMs != null) putInt("durationMs", durationMs)
    }
  }

  private fun buildVideoMediaFromContentUri(originalUri: Uri): WritableMap {
    val retriever = MediaMetadataRetriever()
    var durationMs: Int? = null
    try {
      retriever.setDataSource(reactContext, originalUri)
      durationMs = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)?.toIntOrNull()
    } catch (_: Exception) {
    } finally {
      try { retriever.release() } catch (_: Exception) {}
    }

    val mime = contentType(originalUri) ?: "video/*"
    val name = queryDisplayName(originalUri)
    val size = querySize(originalUri)

    return Arguments.createMap().apply {
      putString("kind", "video")
      putString("uri", originalUri.toString())
      if (!name.isNullOrBlank()) putString("fileName", name)
      putString("mimeType", mime)
      if (size != null) putDouble("fileSize", size.toDouble())
      if (durationMs != null) putInt("durationMs", durationMs)
    }
  }

  private fun videoDurationMs(file: File): Long {
    val retriever = MediaMetadataRetriever()
    return try {
      retriever.setDataSource(file.absolutePath)
      retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)?.toLongOrNull() ?: 0L
    } catch (_: Exception) {
      0L
    } finally {
      try { retriever.release() } catch (_: Exception) {}
    }
  }

  private fun normalizeTrimmedVideoFile(file: File): File {
    // Some trimmer outputs end up with a ".null" extension which breaks fileName UX and mime guessing.
    val ext = file.extension.lowercase()
    if (ext != "null" && ext.isNotBlank()) return file
    val parent = file.parentFile ?: return file
    val fixed = File(parent, "${file.nameWithoutExtension}.mp4")
    if (fixed.exists()) {
      try { fixed.delete() } catch (_: Exception) {}
    }
    return try {
      if (file.renameTo(fixed)) fixed
      else {
        file.copyTo(fixed, overwrite = true)
        try { file.delete() } catch (_: Exception) {}
        fixed
      }
    } catch (_: Exception) {
      file
    }
  }

  private fun copyFilePathToCache(source: File, preferredExt: String?): File {
    val ext = when {
      source.extension.isNotBlank() && source.extension.lowercase() != "null" -> source.extension
      !preferredExt.isNullOrBlank() -> preferredExt
      else -> "mp4"
    }
    val outFile = File(ensureCacheDir(), "trim_${UUID.randomUUID()}.$ext")
    if (outFile.exists()) {
      try { outFile.delete() } catch (_: Exception) {}
    }
    source.inputStream().use { input ->
      FileOutputStream(outFile).use { output ->
        input.copyTo(output)
      }
    }
    return outFile
  }

  private fun buildDocumentMedia(uri: Uri, options: ReadableMap): WritableMap {
    val file = copyUriToCache(uri, options, preferredExt = guessDocExt(uri))
    val mime = contentType(uri) ?: guessMimeFromExt(file.extension, fallback = null)
    return Arguments.createMap().apply {
      putString("kind", "document")
      putString("uri", uri.toString())
      putString("localPath", Uri.fromFile(file).toString())
      putString("fileName", file.name)
      if (mime != null) putString("mimeType", mime)
      putDouble("fileSize", file.length().toDouble())
    }
  }

  private fun copyUriToCache(uri: Uri, options: ReadableMap, preferredExt: String?): File {
    val enableOriginalName = options.optBoolean("enableDocumentWithOriginalName", false)
    val displayName = if (enableOriginalName) queryDisplayName(uri) else null
    val baseName = displayName ?: "pick_${UUID.randomUUID()}"
    val ext = when {
      baseName.contains(".") -> null
      !preferredExt.isNullOrBlank() -> preferredExt
      else -> null
    }
    val fileName = if (ext == null) baseName else "$baseName.$ext"
    val outFile = File(ensureCacheDir(), sanitizeFilename(fileName))

    var lastErr: Exception? = null
    for (attempt in 0..6) {
      try {
        if (outFile.exists()) outFile.delete()
        reactContext.contentResolver.openInputStream(uri).use { input ->
          if (input == null) throw IllegalStateException("Cannot open input stream")
          FileOutputStream(outFile).use { output ->
            input.copyTo(output)
          }
        }
        if (outFile.length() > 0L) break
        // Some providers (notably camera/video) may finish writing asynchronously.
        Thread.sleep(250)
      } catch (e: SecurityException) {
        // Permission denied: don't retry.
        throw e
      } catch (e: Exception) {
        lastErr = e
        if (attempt == 6) throw e
        Thread.sleep(250)
      }
    }
    if (outFile.length() == 0L && lastErr != null) throw lastErr
    return outFile
  }

  private fun waitForNonEmptyFile(file: File, timeoutMs: Long): Boolean {
    val start = System.currentTimeMillis()
    while (System.currentTimeMillis() - start < timeoutMs) {
      if (file.exists() && file.length() > 0L) return true
      try { Thread.sleep(120) } catch (_: Exception) {}
    }
    return file.exists() && file.length() > 0L
  }

  private fun transcodeImage(sourceFile: File, quality: Int, format: String, maxWidth: Int, maxHeight: Int): File {
    val bitmap = decodeBitmapWithOrientation(sourceFile)
    val scaled = scaleBitmap(bitmap, maxWidth, maxHeight)
    if (scaled !== bitmap) bitmap.recycle()

    val compressFormat: Bitmap.CompressFormat =
      when (format.lowercase()) {
        "png" -> Bitmap.CompressFormat.PNG
        "webp" -> if (Build.VERSION.SDK_INT >= 30) Bitmap.CompressFormat.WEBP_LOSSY else Bitmap.CompressFormat.WEBP
        else -> Bitmap.CompressFormat.JPEG
      }

    val ext = when (compressFormat) {
      Bitmap.CompressFormat.PNG -> "png"
      Bitmap.CompressFormat.JPEG -> "jpg"
      else -> "webp"
    }

    val outFile = File(ensureCacheDir(), "img_${UUID.randomUUID()}.$ext")
    FileOutputStream(outFile).use { os ->
      scaled.compress(compressFormat, quality.coerceIn(0, 100), os)
    }
    scaled.recycle()
    return outFile
  }

  private fun decodeBitmapWithOrientation(file: File): Bitmap {
    val bitmap = BitmapFactory.decodeFile(file.absolutePath) ?: throw IllegalStateException("Failed to decode bitmap")
    val exif = try { ExifInterface(file.absolutePath) } catch (_: Exception) { null }
    val orientation = exif?.getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL)
      ?: ExifInterface.ORIENTATION_NORMAL
    val rotation = when (orientation) {
      ExifInterface.ORIENTATION_ROTATE_90 -> 90
      ExifInterface.ORIENTATION_ROTATE_180 -> 180
      ExifInterface.ORIENTATION_ROTATE_270 -> 270
      else -> 0
    }
    if (rotation == 0) return bitmap
    val matrix = android.graphics.Matrix().apply { postRotate(rotation.toFloat()) }
    val rotated = Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true)
    bitmap.recycle()
    return rotated
  }

  private fun scaleBitmap(bitmap: Bitmap, maxWidth: Int, maxHeight: Int): Bitmap {
    if (maxWidth <= 0 && maxHeight <= 0) return bitmap
    val srcW = bitmap.width.toFloat()
    val srcH = bitmap.height.toFloat()
    val wLimit = if (maxWidth > 0) maxWidth.toFloat() else srcW
    val hLimit = if (maxHeight > 0) maxHeight.toFloat() else srcH
    val ratio = minOf(wLimit / srcW, hLimit / srcH, 1f)
    if (ratio >= 1f) return bitmap
    val dstW = (srcW * ratio).toInt().coerceAtLeast(1)
    val dstH = (srcH * ratio).toInt().coerceAtLeast(1)
    return Bitmap.createScaledBitmap(bitmap, dstW, dstH, true)
  }

  private fun decodeImageSize(file: File): Pair<Int?, Int?> {
    return try {
      val opts = BitmapFactory.Options().apply { inJustDecodeBounds = true }
      BitmapFactory.decodeFile(file.absolutePath, opts)
      Pair(opts.outWidth.takeIf { it > 0 }, opts.outHeight.takeIf { it > 0 })
    } catch (_: Exception) {
      Pair(null, null)
    }
  }

  private fun contentType(uri: Uri): String? = try { reactContext.contentResolver.getType(uri) } catch (_: Exception) { null }

  private fun queryDisplayName(uri: Uri): String? {
    var cursor: Cursor? = null
    try {
      cursor = reactContext.contentResolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)
      if (cursor != null && cursor.moveToFirst()) {
        return cursor.getString(0)
      }
    } catch (_: Exception) {
    } finally {
      try { cursor?.close() } catch (_: Exception) {}
    }
    return null
  }

  private fun querySize(uri: Uri): Long? {
    var cursor: Cursor? = null
    try {
      cursor = reactContext.contentResolver.query(uri, arrayOf(OpenableColumns.SIZE), null, null, null)
      if (cursor != null && cursor.moveToFirst()) {
        val idx = cursor.getColumnIndex(OpenableColumns.SIZE)
        if (idx >= 0) return cursor.getLong(idx).takeIf { it >= 0L }
      }
    } catch (_: Exception) {
    } finally {
      try { cursor?.close() } catch (_: Exception) {}
    }
    return null
  }

  private fun ensureCacheDir(): File {
    val dir = File(reactContext.cacheDir, "smart-file-picker")
    if (!dir.exists()) dir.mkdirs()
    return dir
  }

  private fun sanitizeFilename(name: String): String {
    return name.replace(Regex("[\\\\/:*?\"<>|]"), "_")
  }

  private fun guessImageExt(uri: Uri): String? {
    val t = contentType(uri) ?: return null
    return when {
      t.contains("png") -> "png"
      t.contains("webp") -> "webp"
      else -> "jpg"
    }
  }

  private fun guessVideoExt(uri: Uri): String? {
    val t = contentType(uri) ?: return "mp4"
    return if (t.contains("mp4")) "mp4" else "mp4"
  }

  private fun guessDocExt(uri: Uri): String? {
    val name = queryDisplayName(uri) ?: return null
    val idx = name.lastIndexOf('.')
    if (idx <= 0 || idx == name.length - 1) return null
    return name.substring(idx + 1)
  }

  private fun ReadableMap.optBoolean(key: String, fallback: Boolean = false): Boolean {
    return try {
      if (!hasKey(key) || isNull(key)) fallback else getBoolean(key)
    } catch (_: Exception) {
      fallback
    }
  }

  private fun ReadableMap.optInt(key: String): Int? {
    return try {
      if (!hasKey(key) || isNull(key)) null else getInt(key)
    } catch (_: Exception) {
      null
    }
  }

  private fun ReadableMap.optDouble(key: String): Double? {
    return try {
      if (!hasKey(key) || isNull(key)) null else getDouble(key)
    } catch (_: Exception) {
      null
    }
  }

  private fun ReadableMap.optString(key: String): String? {
    return try {
      if (!hasKey(key) || isNull(key)) null else getString(key)
    } catch (_: Exception) {
      null
    }
  }

  private fun ReadableMap.optMap(key: String): ReadableMap? {
    return try {
      if (!hasKey(key) || isNull(key)) null else getMap(key)
    } catch (_: Exception) {
      null
    }
  }

  private fun guessMimeFromExt(ext: String, fallback: String?): String? {
    val e = ext.lowercase()
    return when (e) {
      "jpg", "jpeg" -> "image/jpeg"
      "png" -> "image/png"
      "webp" -> "image/webp"
      "mp4" -> "video/mp4"
      "pdf" -> "application/pdf"
      else -> fallback
    }
  }

  private fun resolve(map: WritableMap) {
    val p = pendingPromise ?: return
    clearPending()
    mainHandler.post { p.resolve(map) }
  }

  private fun resolveEmpty() {
    val result = Arguments.createMap().apply {
      putArray("medias", Arguments.createArray())
    }
    resolve(result)
  }

  private fun reject(code: String, message: String) {
    val p = pendingPromise ?: return
    clearPending()
    mainHandler.post { p.reject(code, message) }
  }

  private fun clearPending() {
    pendingPromise = null
    pendingAction = null
    pendingOptions = null
    pendingCameraOutputUri = null
    pendingCameraOutputFile = null
    pendingCropRequest = null
    pendingVideoTrimOriginalUri = null
    pendingVideoTrimSourceFile = null
  }

  companion object {
    private const val REQ_CAPTURE_IMAGE = 9402
    private const val REQ_CAPTURE_VIDEO = 9403
    private const val REQ_PICK_IMAGE = 9404
    private const val REQ_PICK_VIDEO = 9405
    private const val REQ_PICK_DOCUMENT = 9406
    private const val REQ_TRIM_VIDEO = 9407
  }

  private fun isVideoTrimEnabled(options: ReadableMap?): Boolean {
    val video = options?.optMap("video") ?: return false
    val trim = video.optMap("trim") ?: return false
    return trim.optBoolean("enabled", false)
  }

  private fun videoTrimMaxDurationMs(options: ReadableMap): Long? {
    val video = options.optMap("video") ?: return null
    val trim = video.optMap("trim") ?: return null
    val ms = trim.optInt("maxDurationMs") ?: return null
    return ms.toLong().takeIf { it > 0 }
  }

  private fun videoTrimMinDurationMs(options: ReadableMap): Long? {
    val video = options.optMap("video") ?: return null
    val trim = video.optMap("trim") ?: return null
    val ms = trim.optInt("minDurationMs") ?: return null
    return ms.toLong().takeIf { it > 0 }
  }
}
