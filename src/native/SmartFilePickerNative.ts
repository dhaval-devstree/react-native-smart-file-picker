import { NativeModules, Platform } from "react-native";
import type { SmartFilePickerOptions, SmartFilePickerResult } from "../types";
import { ensurePermissionsForAction } from "../permissions";

type NativeSmartFilePicker = {
  performAction(action: string, options: SmartFilePickerOptions): Promise<SmartFilePickerResult>;
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
  const ok = await ensurePermissionsForAction(action, options);
  if (!ok) return { medias: [] };
  return getNative().performAction(action, options);
}
