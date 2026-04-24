import type { SmartFilePickerOptions, SmartFilePickerResult } from "../types";
import { SmartFilePickerBridge } from "./smartFilePickerBridge";

export function openSmartFilePicker(options: SmartFilePickerOptions = {}): Promise<SmartFilePickerResult> {
  return SmartFilePickerBridge.open(options);
}

