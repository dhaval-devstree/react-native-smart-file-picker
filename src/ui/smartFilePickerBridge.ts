import type {
  SmartFilePickerAction,
  SmartFilePickerOptions,
  SmartFilePickerResult,
  SmartFilePickerUiAction
} from "../types";
import { FileSelectionType } from "../types";
import { performAction } from "../native/SmartFilePickerNative";
import { SmartFilePickerError } from "../errors";

type OpenRequest = {
  options: SmartFilePickerOptions;
  resolve: (value: SmartFilePickerResult) => void;
  reject: (reason?: any) => void;
};

class Bridge {
  private current: OpenRequest | null = null;
  private listeners = new Set<(req: OpenRequest) => void>();

  open(options: SmartFilePickerOptions): Promise<SmartFilePickerResult> {
    if (this.current) {
      this.current.reject(new Error("SmartFilePicker is already open"));
      this.current = null;
    }
    return new Promise((resolve, reject) => {
      // If the host isn't mounted, fall back to "direct" mode (no bottom-sheet UI).
      // This enables calling `openSmartFilePicker(...)` from a button handler without rendering `<SmartFilePickerHost />`,
      // as long as the request resolves to a single action (or `direct: true`).
      if (this.listeners.size === 0) {
        void (async () => {
          try {
            const result = await openWithoutHost(options);
            resolve(result);
          } catch (e) {
            reject(e);
          }
        })();
        return;
      }

      const req: OpenRequest = { options, resolve, reject };
      this.current = req;
      for (const l of this.listeners) l(req);
    });
  }

  subscribe(listener: (req: OpenRequest) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  clear(req: OpenRequest) {
    if (this.current === req) this.current = null;
  }
}

export const SmartFilePickerBridge = new Bridge();
export type { OpenRequest };

type ActionId = "captureImage" | "pickImage" | "captureVideo" | "pickVideo" | "pickDocument";

function actionsForType(type: FileSelectionType): ActionId[] {
  switch (type) {
    case FileSelectionType.IMAGE:
      return ["captureImage", "pickImage"];
    case FileSelectionType.VIDEO:
      return ["captureVideo", "pickVideo"];
    case FileSelectionType.CAPTURE_IMAGE:
      return ["captureImage"];
    case FileSelectionType.CAPTURE_VIDEO:
      return ["captureVideo"];
    case FileSelectionType.PICK_IMAGE:
      return ["pickImage"];
    case FileSelectionType.PICK_VIDEO:
      return ["pickVideo"];
    case FileSelectionType.TAKE_IMAGE_VIDEO:
      return ["captureImage", "captureVideo"];
    case FileSelectionType.PICK_IMAGE_VIDEO:
      return ["pickImage", "pickVideo"];
    case FileSelectionType.PICK_DOCUMENT:
      return ["pickDocument"];
    case FileSelectionType.ALL:
    default:
      return ["captureImage", "pickImage", "captureVideo", "pickVideo", "pickDocument"];
  }
}

function actionsFromUiOptions(actions?: SmartFilePickerUiAction[]): ActionId[] | null {
  if (!actions || actions.length === 0) return null;
  const mapped: ActionId[] = [];
  for (const entry of actions) {
    const action: SmartFilePickerAction = typeof entry === "string" ? entry : entry.action;
    switch (action) {
      case "CAPTURE_IMAGE":
        mapped.push("captureImage");
        break;
      case "PICK_IMAGE":
        mapped.push("pickImage");
        break;
      case "CAPTURE_VIDEO":
        mapped.push("captureVideo");
        break;
      case "PICK_VIDEO":
        mapped.push("pickVideo");
        break;
      case "PICK_DOCUMENT":
        mapped.push("pickDocument");
        break;
    }
  }
  return mapped;
}

function nativeActionName(action: ActionId): string {
  switch (action) {
    case "captureImage":
      return "CAPTURE_IMAGE";
    case "pickImage":
      return "PICK_IMAGE";
    case "captureVideo":
      return "CAPTURE_VIDEO";
    case "pickVideo":
      return "PICK_VIDEO";
    case "pickDocument":
      return "PICK_DOCUMENT";
  }
}

async function openWithoutHost(options: SmartFilePickerOptions): Promise<SmartFilePickerResult> {
  const type = options.type ?? FileSelectionType.ALL;
  const actions = actionsFromUiOptions(options.ui?.actions) ?? actionsForType(type);

  const shouldForceDirect = options.direct === true;
  const shouldForceSheet = options.direct === false;
  const shouldAutoDirect = !shouldForceSheet && (shouldForceDirect || actions.length === 1);

  if (!shouldAutoDirect) {
    throw new SmartFilePickerError(
      "E_NO_VIEW",
      "SmartFilePickerHost is required to show the bottom-sheet UI. Either mount <SmartFilePickerHost /> once at the app root, or use `direct: true` / a single action."
    );
  }

  return performAction(nativeActionName(actions[0]!), options);
}

