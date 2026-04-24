export enum FileSelectionType {
  ALL = "ALL",
  IMAGE = "IMAGE",
  VIDEO = "VIDEO",
  CAPTURE_IMAGE = "CAPTURE_IMAGE",
  CAPTURE_VIDEO = "CAPTURE_VIDEO",
  PICK_IMAGE = "PICK_IMAGE",
  PICK_VIDEO = "PICK_VIDEO",
  TAKE_IMAGE_VIDEO = "TAKE_IMAGE_VIDEO",
  PICK_IMAGE_VIDEO = "PICK_IMAGE_VIDEO",
  PICK_DOCUMENT = "PICK_DOCUMENT"
}

export const SmartFilePickerAction = {
  CAPTURE_IMAGE: "CAPTURE_IMAGE",
  PICK_IMAGE: "PICK_IMAGE",
  CAPTURE_VIDEO: "CAPTURE_VIDEO",
  PICK_VIDEO: "PICK_VIDEO",
  PICK_DOCUMENT: "PICK_DOCUMENT"
} as const;

export type SmartFilePickerAction =
  | "CAPTURE_IMAGE"
  | "PICK_IMAGE"
  | "CAPTURE_VIDEO"
  | "PICK_VIDEO"
  | "PICK_DOCUMENT";

export type SmartFilePickerUiAction =
  | SmartFilePickerAction
  | {
      action: SmartFilePickerAction;
      label?: string;
    };

export type ImageCompressFormat = "jpeg" | "png" | "webp";

export type CropAspectRatio =
  | { mode: "free" }
  | { mode: "fixed"; x: number; y: number }
  | { mode: "square" };

export type CropOptions = {
  enabled: boolean;
  aspectRatio?: CropAspectRatio;
  maxResultSize?: { width: number; height: number };
};

export type CompressOptions = {
  enabled: boolean;
  quality?: number; // 0..100
  format?: ImageCompressFormat;
  maxWidth?: number;
  maxHeight?: number;
};

export type SmartFilePickerTheme = {
  backdropColor?: string;
  sheetBackgroundColor?: string;
  titleColor?: string;
  subtitleColor?: string;
  primaryButtonBackground?: string;
  primaryButtonText?: string;
  secondaryButtonBackground?: string;
  secondaryButtonText?: string;
  itemIconColor?: string;
  itemTextColor?: string;
};

export type SmartFilePickerLabels = Partial<{
  title: string;
  cancel: string;
  captureImage: string;
  pickImage: string;
  captureVideo: string;
  pickVideo: string;
  pickDocument: string;
}>;

export type PermissionPrompt = {
  title?: string;
  description?: string;
  cancel?: string;
  ok?: string;
  /**
   * When true (default), the OK button opens device settings.
   */
  openSettings?: boolean;
};

export type SmartFilePickerOptions = {
  type?: FileSelectionType;
  multiple?: boolean;
  documentMimeType?: string; // e.g. "*/*", "application/pdf"
  enableDocumentWithOriginalName?: boolean;
  direct?: boolean;
  crop?: CropOptions;
  compress?: CompressOptions;
  permission?: PermissionPrompt;
  theme?: SmartFilePickerTheme;
  labels?: SmartFilePickerLabels;
  ui?: {
    title?: string;
    subtitle?: string;
    actions?: SmartFilePickerUiAction[];
  };
};

export type MediaKind = "image" | "video" | "document";

export type Media = {
  kind: MediaKind;
  uri: string; // original uri (content:// or file://)
  localPath?: string; // file:// temp file path after processing/copy
  fileName?: string;
  mimeType?: string;
  fileSize?: number;
  width?: number;
  height?: number;
  durationMs?: number;
};

export type SmartFilePickerResult = {
  medias: Media[];
};
