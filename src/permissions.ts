import { Alert, Linking, Platform } from "react-native";
import type { SmartFilePickerOptions } from "./types";
import { SmartFilePickerError } from "./errors";

declare const require: (moduleId: string) => any;

type RNPermissionsModule = {
  PERMISSIONS: any;
  RESULTS: Record<string, string>;
  check: (permission: string) => Promise<string>;
  request: (permission: string, rationale?: any) => Promise<string>;
};

function getRNPermissions(): RNPermissionsModule {
  // Keep this as a runtime `require` so the library can still load even if the app
  // hasn't installed/configured react-native-permissions yet.
  let mod: RNPermissionsModule | undefined;
  try {
    mod = require("react-native-permissions") as RNPermissionsModule | undefined;
  } catch (_e) {
    mod = undefined;
  }
  if (!mod?.PERMISSIONS || !mod?.RESULTS || !mod?.check || !mod?.request) {
    throw new SmartFilePickerError(
      "E_MISSING_REACT_NATIVE_PERMISSIONS",
      "Missing react-native-permissions. Install and configure it in your app to use react-native-smart-file-picker permission handling."
    );
  }
  return mod;
}

function iosMajorVersion(): number {
  if (Platform.OS !== "ios") return 0;
  const raw = Platform.Version;
  const asString = typeof raw == "string" ? raw : String(raw);
  const major = parseInt(asString.split(".")[0] ?? "0", 10);
  return Number.isFinite(major) ? major : 0;
}

function permissionsForAction(action: string): string[] {
  if (Platform.OS == "android") {
    if (action == "CAPTURE_IMAGE" || action == "CAPTURE_VIDEO") {
      const { PERMISSIONS } = getRNPermissions();
      return [PERMISSIONS.ANDROID.CAMERA];
    }
    return [];
  }

  if (Platform.OS == "ios") {
    switch (action) {
      case "CAPTURE_IMAGE":
        return [getRNPermissions().PERMISSIONS.IOS.CAMERA];
      case "CAPTURE_VIDEO":
        return [getRNPermissions().PERMISSIONS.IOS.CAMERA, getRNPermissions().PERMISSIONS.IOS.MICROPHONE];
      case "PICK_IMAGE":
      case "PICK_VIDEO": {
        // iOS 14+ uses PHPicker which doesn't require photo library permission.
        // iOS < 14 uses UIImagePickerController which does.
        return iosMajorVersion() >= 14 ? [] : [getRNPermissions().PERMISSIONS.IOS.PHOTO_LIBRARY];
      }
      default:
        return [];
    }
  }

  return [];
}

function isGranted(status: string, RESULTS: Record<string, string>): boolean {
  return status == RESULTS.GRANTED || status == RESULTS.LIMITED;
}

function defaultPromptForPermission(permission: string): { title: string; description: string } {
  const lower = permission.toLowerCase();
  if (lower.includes("camera")) {
    return {
      title: "Camera Permission",
      description: "This app would like to access your camera to continue."
    };
  }
  if (lower.includes("microphone")) {
    return {
      title: "Microphone Permission",
      description: "This app would like to access your microphone to continue."
    };
  }
  if (lower.includes("photo")) {
    return {
      title: "Photo Library Permission",
      description: "This app would like to access your photo library to continue."
    };
  }
  return {
    title: "Permission Required",
    description: "This app needs permission to continue."
  };
}

function showPermissionDeniedAlert(options: SmartFilePickerOptions, permission: string) {
  const prompt = options.permission ?? {};
  const defaults = defaultPromptForPermission(permission);
  const title = prompt.title ?? defaults.title;
  const description = prompt.description ?? defaults.description;
  const cancel = prompt.cancel ?? "Cancel";
  const ok = prompt.ok ?? "OK";
  const shouldOpenSettings = prompt.openSettings !== false;

  Alert.alert(title, description, [
    { text: cancel, style: "cancel" },
    ...(shouldOpenSettings ? [{ text: ok, onPress: () => Linking.openSettings(), isPreferred: true } as any] : [])
  ]);
}

/**
 * Returns:
 * - `true` when all required permissions are granted
 * - `false` when permission is denied/blocked/unavailable and the user has been prompted
 *
 * Throws only when `react-native-permissions` is missing/misconfigured.
 */
export async function ensurePermissionsForAction(action: string, options: SmartFilePickerOptions): Promise<boolean> {
  const permissions = permissionsForAction(action);
  if (permissions.length == 0) return true;
  const perms = getRNPermissions();

  for (const permission of permissions) {
    const status = await perms.request(permission);
    if (isGranted(status, perms.RESULTS)) continue;

    showPermissionDeniedAlert(options, permission);
    return false;
  }

  return true;
}
