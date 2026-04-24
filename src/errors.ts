export type SmartFilePickerErrorCode =
  | "E_IN_PROGRESS"
  | "E_NO_ACTIVITY"
  | "E_NO_VIEW"
  | "E_BAD_ACTION"
  | "E_PICK"
  | "E_CAMERA"
  | "E_CROP"
  | "E_PERMISSION_UNAVAILABLE"
  | "E_PERMISSION_DENIED"
  | "E_PERMISSION_BLOCKED"
  | "E_MISSING_REACT_NATIVE_PERMISSIONS";

export class SmartFilePickerError extends Error {
  code: SmartFilePickerErrorCode;

  constructor(code: SmartFilePickerErrorCode, message: string) {
    super(message);
    this.name = "SmartFilePickerError";
    this.code = code;
  }
}

export class SmartFilePickerPermissionError extends SmartFilePickerError {
  permission: string;
  status: string;
  action: string;

  constructor(params: { code: SmartFilePickerErrorCode; message: string; permission: string; status: string; action: string }) {
    super(params.code, params.message);
    this.name = "SmartFilePickerPermissionError";
    this.permission = params.permission;
    this.status = params.status;
    this.action = params.action;
  }
}

