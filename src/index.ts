export * from "./types";
export * from "./errors";
export * from "./permissions";
export * from "./ui/SmartFilePickerHost";
export * from "./ui/openSmartFilePicker";
import * as SmartFilePickerNative from "./native/SmartFilePickerNative";

export { SmartFilePickerNative };
export { performAction } from "./native/SmartFilePickerNative";
export { clearCache as clearSmartFilePickerCache } from "./native/SmartFilePickerNative";
export { getCachePath as getSmartFilePickerCachePath } from "./native/SmartFilePickerNative";
