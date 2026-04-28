# react-native-smart-file-picker

A user-friendly yet highly customizable file picker for React Native (Android + iOS).

- Dynamic bottom-sheet UI (JS) you can theme and customize
- Capture image / capture video (camera)
- Pick image(s) / pick video(s)
- Pick documents (custom mime types)
- Optional image crop and compression (native)

## Installation

```sh
npm i react-native-smart-file-picker
cd ios && pod install && cd ..
```

### `react-native-permissions` configuration

This library requests runtime permissions using `react-native-permissions`.

`react-native-permissions` is a peer dependency of this package, so your app must install and configure it.

```sh
yarn add react-native-permissions
cd ios && pod install && cd ..
```

How permission is handled:

- The library calls `request(PERMISSIONS.*.*)` before opening camera-based flows.
- If the user denies permission, it shows an alert and can take the user to device settings.
- If permission is denied/blocked/unavailable, `openSmartFilePicker(...)` resolves with an empty result (`{ medias: [] }`).

Configure the iOS permission handlers in your app `Podfile` (choose what you need):

- `Camera` (required for `CAPTURE_IMAGE` / `CAPTURE_VIDEO`)
- `Microphone` (required for `CAPTURE_VIDEO` on iOS)
- `PhotoLibrary` (only required for `PICK_IMAGE` / `PICK_VIDEO` on iOS < 14)

Please refer to [`react-native-permissions`](https://www.npmjs.com/package/react-native-permissions) for installation and native setup.

### Need to declare Camera Permission on Android and iOS native side

#### Android (`android/app/src/main/AndroidManifest.xml`)

This library declares camera permission in its own manifest and it should be merged into your app automatically. If your setup disables manifest merging or you want to be explicit, ensure your app has:

```xml
<uses-permission android:name="android.permission.CAMERA" />
```

#### iOS (`ios/<YourApp>/Info.plist`)

Apple requires user-facing reason strings for protected resources. Add (as needed):

```xml
<key>NSCameraUsageDescription</key>
<string>We need camera access to capture photos/videos.</string>
```

For video capture on iOS, also add:

```xml
<key>NSMicrophoneUsageDescription</key>
<string>We need microphone access to record video audio.</string>
```

For iOS < 14 photo picking fallback, add:

```xml
<key>NSPhotoLibraryUsageDescription</key>
<string>We need access to your photo library to pick media.</string>
```

## Uses

### Basic (bottom-sheet UI)

If you want the bottom-sheet UI (multiple actions), mount `SmartFilePickerHost` in the same screen/component where you call `openSmartFilePicker(...)` (or in a shared layout used by those screens).

```tsx
import React from "react";
import { Button, View } from "react-native";
import { SmartFilePickerHost } from "react-native-smart-file-picker";
import { FileSelectionType, openSmartFilePicker } from "react-native-smart-file-picker";

export function UploadScreen() {
  const onPick = async () => {
    const result = await openSmartFilePicker({
      type: FileSelectionType.ALL,
      multiple: true,
      documentMimeType: "*/*"
    });
    console.log(result.medias);
  };

  return (
    <View style={{ flex: 1 }}>
      <Button title="Upload" onPress={onPick} />
      <SmartFilePickerHost />
    </View>
  );
}
```

Tip: If you want the picker available across your app, mount `SmartFilePickerHost` once in your root layout instead.

Open the picker:

```ts
import { FileSelectionType, openSmartFilePicker } from "react-native-smart-file-picker";

try {
  const result = await openSmartFilePicker({
    type: FileSelectionType.ALL,
    multiple: true,
    documentMimeType: "*/*"
  });
} catch (e: any) {
  console.log("Picker failed:", e?.code, e?.message);
}
```

Behavior:

- If the resolved UI has only one action, it runs it directly (no bottom-sheet).
- If there are multiple actions, it shows the bottom-sheet.
- You can override this with `direct: true` (always direct) or `direct: false` (always show sheet).

### Direct usage (no host)

If you only need a direct open (no bottom-sheet UI), you can call `openSmartFilePicker(...)` without mounting `SmartFilePickerHost`, as long as it resolves to a single action (or you force direct mode).

Example:

```ts
import { FileSelectionType, openSmartFilePicker } from "react-native-smart-file-picker";

const result = await openSmartFilePicker({
  direct: true,
  type: FileSelectionType.CAPTURE_IMAGE
});
```

If you want the bottom-sheet UI (multiple actions), mount `SmartFilePickerHost` once.

### With permission-denied dialog customization

If a required permission is not granted, the library shows an alert (with an option to open device settings) and resolves with an empty result (`{ medias: [] }`).

```ts
await openSmartFilePicker({
  type: FileSelectionType.CAPTURE_IMAGE,
  permission: {
    title: "Camera Permission",
    description: "We need camera access to take a photo.",
    cancel: "Cancel",
    ok: "OK",
    openSettings: true
  }
});
```

### With dynamic UI actions

```ts
import { SmartFilePickerAction, openSmartFilePicker } from "react-native-smart-file-picker";

await openSmartFilePicker({
  direct: false,
  ui: {
    title: "Upload",
    subtitle: "Choose a source",
    actions: [
      { action: SmartFilePickerAction.CAPTURE_IMAGE, label: "Camera (photo)" },
      { action: SmartFilePickerAction.PICK_IMAGE, label: "Gallery (photo)" },
      SmartFilePickerAction.PICK_DOCUMENT
    ]
  }
});
```

### Document picker (custom mime types)

```ts
import { FileSelectionType, openSmartFilePicker } from "react-native-smart-file-picker";

const result = await openSmartFilePicker({
  type: FileSelectionType.PICK_DOCUMENT,
  multiple: true,
  documentMimeType: "application/pdf",
  enableDocumentWithOriginalName: true
});
```

### Crop + compression (images)

```ts
import { FileSelectionType, openSmartFilePicker } from "react-native-smart-file-picker";

const result = await openSmartFilePicker({
  type: FileSelectionType.PICK_IMAGE,
  multiple: false,
  crop: { enabled: true, aspectRatio: { mode: "free" }, maxResultSize: { width: 2000, height: 2000 } },
  compress: { enabled: true, quality: 85, format: "jpeg", maxWidth: 1920, maxHeight: 1920 }
});
```

## Customisation

### `openSmartFilePicker(options?)`

Common options (see `src/types.ts` for the full list):

| Option | Default | Description |
|---|---|---|
| type | `ALL` | Which actions to show/run (camera/gallery/document). |
| multiple | `false` | Allow multiple selection (where supported). When `true`, `result.medias` may contain multiple items (array). |
| documentMimeType | `*/*` | Mime type for document picker. |
| enableDocumentWithOriginalName | `false` | Attempts to preserve the original file name for documents. |
| direct | auto | Force direct mode (skip sheet) or always show the sheet. |
| crop | disabled | Enable crop for a single picked image. |
| compress | disabled | Enable compression for images. |
| video | unset | Video-specific options (trim). |
| theme | defaults | Theme the bottom-sheet UI (or set defaults on `SmartFilePickerHost`). |
| ui | defaults | Override sheet title/subtitle/actions. |
| permission | defaults | Customize permission-denied alert copy/buttons. |

### Notes & limitations

- Crop is only supported for a single image. If `multiple: true` and crop is enabled, the picker returns an error.
- iOS < 14 uses `UIImagePickerController` for photo picking (single selection only). iOS 14+ uses `PHPicker` (supports multiple).
- The library copies picked/captured media to a temporary cache location and returns it as `localPath`.
- To delete all cached picker files, call `clearSmartFilePickerCache()` (or `SmartFilePickerNative.clearCache()`).

### Permission dialog keys

Used by `options.permission` when a required permission is not granted:

| Key | Default | Description |
|---|---|---|
| title | platform default | Alert title. |
| description | platform default | Alert description. |
| cancel | `Cancel` | Cancel button label. |
| ok | `OK` | OK button label. |
| openSettings | `true` | When `true`, OK opens device settings. |

Note: On Android, `PICK_IMAGE` / `PICK_VIDEO` may request media read permission (`READ_MEDIA_*` on Android 13+, or `READ_EXTERNAL_STORAGE` on older Androids) depending on the picker/trimmer behavior.

### Crop options

Used by `options.crop` (images only):

| Key | Default | Description |
|---|---|---|
| enabled | `false` | Enables crop UI for a single picked image. |
| aspectRatio | free | `{ mode: "free" }`, `{ mode: "square" }`, or `{ mode: "fixed", x, y }`. |
| maxResultSize | unset | `{ width, height }` to limit the cropped output size. |

### Compress options

Used by `options.compress` (images only):

| Key | Default | Description |
|---|---|---|
| enabled | `false` | Enables compression/scaling on the output image file. |
| quality | `100` | 0..100 (JPEG/WebP lossy). |
| format | `jpeg` | `jpeg`, `png`, or `webp` (platform support may vary). |
| maxWidth / maxHeight | unset | Resize to fit within bounds (keeps aspect ratio). |

Note: When `compress.enabled: true`, the library only keeps the compressed output in cache (it does not retain an additional original copy).

### Video options

Used by `options.video` (videos only):

| Key | Default | Description |
|---|---|---|
| trim | unset | Native (user-driven) trim UI: `{ enabled: true, minDurationMs?, maxDurationMs? }`. |

How it works:

- iOS: uses `UIImagePickerController` built-in editing UI (`allowsEditing = true`) for `CAPTURE_VIDEO` / `PICK_VIDEO` when `trim.enabled` is set. iOS only supports a single video in this mode.
- Android: uses `android-video-trimmer` UI (API 24+). The trimmed output is copied into this library’s cache before returning.

Duration rules:

- `maxDurationMs`: optional. When omitted, max is unlimited.
- `minDurationMs`: best-effort enforcement. Android enforces via the trim UI when `maxDurationMs` is also set; otherwise it is validated after trimming. iOS always validates after trimming.

Example:

```ts
await openSmartFilePicker({
  type: FileSelectionType.CAPTURE_VIDEO,
  video: { trim: { enabled: true, minDurationMs: 10000 } } // maxDurationMs is optional (unlimited when omitted)
});
```

### Host theme (recommended)

If you want to set the bottom-sheet theme once (instead of passing `theme` on every `openSmartFilePicker(...)` call), pass it to the host (wherever you mounted it):

```tsx
import { SmartFilePickerHost } from "react-native-smart-file-picker";

export function UploadScreen() {
  return (
    <>
      {/* your app */}
      <SmartFilePickerHost
        theme={{
          sheetBackgroundColor: "#fff",
          titleColor: "#111",
          subtitleColor: "rgba(0,0,0,0.55)"
        }}
      />
    </>
  );
}
```

Per-call `openSmartFilePicker({ theme })` still overrides these defaults.

### Theme keys

Theme applies to the JS bottom-sheet UI only (not the native camera/gallery/document screens):

| Key | Description |
|---|---|
| backdropColor | Backdrop overlay color. |
| sheetBackgroundColor | Bottom-sheet background color. |
| titleColor | Sheet title text color. |
| subtitleColor | Sheet subtitle text color. |
| itemTextColor | Action item text color. |
| secondaryButtonBackground | Cancel button background color. |
| secondaryButtonText | Cancel button text color. |

### iOS note (TOCropViewController)

If `pod install` fails with:

> The Swift pod `react-native-smart-file-picker` depends upon `TOCropViewController`, which does not define modules.

Add this to your app `ios/Podfile` inside your app target:

```rb
pod 'TOCropViewController', :modular_headers => true
```

Note: this library forces its native iOS UI (camera / pickers / crop) to `light` appearance on iOS 13+.

### Android setup (FileProvider + uCrop)

This library uses a `FileProvider` for camera output and ships a default manifest entry that should merge automatically. If your app overrides manifests heavily, ensure you have this in your app `AndroidManifest.xml` inside `<application>`:

```xml
<activity
  android:name="com.yalantis.ucrop.UCropActivity"
  android:exported="false"
  android:screenOrientation="portrait"
  android:theme="@style/Theme.AppCompat.Light.NoActionBar" />

<provider
  android:name="androidx.core.content.FileProvider"
  android:authorities="${applicationId}.smartfilepicker.provider"
  android:exported="false"
  android:grantUriPermissions="true">
  <meta-data
    android:name="android.support.FILE_PROVIDER_PATHS"
    android:resource="@xml/smart_file_picker_provider_paths" />
</provider>
```

### Android note (video trim dependency)

When `video.trim.enabled` is used on Android, this library relies on `android-video-trimmer` (JitPack). Ensure your app can resolve JitPack artifacts by adding:

```gradle
maven { url "https://jitpack.io" }
```

If your project uses Gradle `dependencyResolutionManagement` (common in newer RN/AGP setups), add the JitPack repo in your `android/settings.gradle` repositories as well.

## Response

`openSmartFilePicker()` resolves to:

```ts
type SmartFilePickerResult = {
  medias: Media[];
};

type Media = {
  kind: "image" | "video" | "document";
  uri: string;
  localPath?: string;
  fileName?: string;
  mimeType?: string;
  fileSize?: number;
  width?: number;
  height?: number;
  durationMs?: number;
};
```

What the fields mean:

- `uri`: original returned Uri (often `content://...` on Android, or `file://...` on iOS).
- `localPath`: a copied/processed temp file (`file://...`). Use this for upload/preview, or move it to app storage if you need it long-term.
- `fileName`: best-effort file name (can preserve original document name when `enableDocumentWithOriginalName: true`).
- `width`/`height`: only for images.
- `durationMs`: only for videos.

See `src/types.ts` for the full options and result types.

## Troubleshooting

### Nothing happens when calling `openSmartFilePicker(...)`

- For bottom-sheet UI, ensure `<SmartFilePickerHost />` is mounted in the same screen/layout that triggers it (and remains mounted while it’s open).
- For direct usage without the host, pass `direct: true` and make sure the request resolves to a single action.

### Getting `E_MISSING_REACT_NATIVE_PERMISSIONS`

- Install and configure `react-native-permissions` in your app (it is a peer dependency).

### iOS build fails with TOCropViewController modules error

- Apply the `:modular_headers => true` Podfile workaround shown above.
