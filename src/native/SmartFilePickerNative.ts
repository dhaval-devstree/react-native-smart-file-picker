import { NativeModules, Platform } from "react-native";
import type { SmartFilePickerOptions, SmartFilePickerResult } from "../types";
import { ensurePermissionsForAction, showPermissionDeniedAlertForAction } from "../permissions";
import { SmartFilePickerError } from "../errors";

type NativeSmartFilePicker = {
  performAction(action: string, options: SmartFilePickerOptions): Promise<SmartFilePickerResult>;
  clearCache(): Promise<void>;
  getCachePath(): Promise<string>;
};

const LINKING_ERROR =
  `The package 'react-native-smart-file-picker' doesn't seem to be linked. ` +
  `Make sure you ran pod install (iOS) and rebuilt the app.`;

const moduleName = Platform.select({ ios: "RNSmartFilePicker", android: "SmartFilePicker" })!;

const Native: NativeSmartFilePicker | undefined = (NativeModules as any)[moduleName];

function getNative(): NativeSmartFilePicker {
  if (!Native) {
    throw new Error(LINKING_ERROR);
  }
  return Native;
}

export async function performAction(action: string, options: SmartFilePickerOptions): Promise<SmartFilePickerResult> {
  try {
    const ok = await ensurePermissionsForAction(action, options);
    if (!ok) return { medias: [] };
  } catch (e) {
    // Keep parity with the "permission denied => empty medias" behavior and avoid crashing the app.
    if (e instanceof SmartFilePickerError) {
      console.warn(`[react-native-smart-file-picker] ${e.code}: ${e.message}`);
      return { medias: [] };
    }
    throw e;
  }

  try {
    return await getNative().performAction(action, options);
  } catch (e: any) {
    const code = e?.code;
    if (code === "E_PERMISSION_DENIED" || code === "E_PERMISSION_BLOCKED" || code === "E_PERMISSION_UNAVAILABLE") {
      showPermissionDeniedAlertForAction(options, action);
      return { medias: [] };
    }
    throw e;
  }
}

export async function clearCache(): Promise<void> {
  return getNative().clearCache();
}

export async function getCachePath(): Promise<string> {
  return getNative().getCachePath();
}
