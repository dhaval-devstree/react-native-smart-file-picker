export * from "./types";
export * from "./errors";
export * from "./permissions";
export * from "./ui/SmartFilePickerHost";
export * from "./ui/openSmartFilePicker";
import * as SmartFilePickerNative from "./native/SmartFilePickerNative";

export { SmartFilePickerNative };
export { performAction } from "./native/SmartFilePickerNative";
