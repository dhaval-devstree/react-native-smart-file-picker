import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import type {
  SmartFilePickerAction,
  SmartFilePickerTheme,
  SmartFilePickerOptions,
  SmartFilePickerResult,
  SmartFilePickerUiAction
} from "../types";
import { FileSelectionType } from "../types";
import { performAction } from "../native/SmartFilePickerNative";
import { SmartFilePickerBridge, type OpenRequest } from "./smartFilePickerBridge";

type ActionId = "captureImage" | "pickImage" | "captureVideo" | "pickVideo" | "pickDocument";
type UiActionItem = { id: ActionId; label?: string };

export type SmartFilePickerHostProps = {
  /**
   * Default theme for the bottom-sheet UI. Can be overridden per-call via `openSmartFilePicker({ theme })`.
   */
  theme?: SmartFilePickerTheme;
};

function actionsForType(type: FileSelectionType): UiActionItem[] {
  switch (type) {
    case FileSelectionType.IMAGE:
      return [{ id: "captureImage" }, { id: "pickImage" }];
    case FileSelectionType.VIDEO:
      return [{ id: "captureVideo" }, { id: "pickVideo" }];
    case FileSelectionType.CAPTURE_IMAGE:
      return [{ id: "captureImage" }];
    case FileSelectionType.CAPTURE_VIDEO:
      return [{ id: "captureVideo" }];
    case FileSelectionType.PICK_IMAGE:
      return [{ id: "pickImage" }];
    case FileSelectionType.PICK_VIDEO:
      return [{ id: "pickVideo" }];
    case FileSelectionType.TAKE_IMAGE_VIDEO:
      return [{ id: "captureImage" }, { id: "captureVideo" }];
    case FileSelectionType.PICK_IMAGE_VIDEO:
      return [{ id: "pickImage" }, { id: "pickVideo" }];
    case FileSelectionType.PICK_DOCUMENT:
      return [{ id: "pickDocument" }];
    case FileSelectionType.ALL:
    default:
      return [
        { id: "captureImage" },
        { id: "pickImage" },
        { id: "captureVideo" },
        { id: "pickVideo" },
        { id: "pickDocument" }
      ];
  }
}

function actionsFromUiOptions(actions?: SmartFilePickerUiAction[]): UiActionItem[] | null {
  if (!actions || actions.length == 0) return null;
  const mapped: UiActionItem[] = [];
  for (const entry of actions) {
    const action: SmartFilePickerAction = typeof entry == "string" ? entry : entry.action;
    const label = typeof entry == "string" ? undefined : entry.label;
    switch (action) {
      case "CAPTURE_IMAGE":
        mapped.push({ id: "captureImage", label });
        break;
      case "PICK_IMAGE":
        mapped.push({ id: "pickImage", label });
        break;
      case "CAPTURE_VIDEO":
        mapped.push({ id: "captureVideo", label });
        break;
      case "PICK_VIDEO":
        mapped.push({ id: "pickVideo", label });
        break;
      case "PICK_DOCUMENT":
        mapped.push({ id: "pickDocument", label });
        break;
    }
  }
  return mapped;
}

function actionLabel(action: ActionId, options: SmartFilePickerOptions, overrideLabel?: string): string {
  if (overrideLabel) return overrideLabel;
  const labels = options.labels ?? {};
  switch (action) {
    case "captureImage":
      return labels.captureImage ?? "Capture image";
    case "pickImage":
      return labels.pickImage ?? (options.multiple ? "Pick images" : "Pick image");
    case "captureVideo":
      return labels.captureVideo ?? "Capture video";
    case "pickVideo":
      return labels.pickVideo ?? "Pick video";
    case "pickDocument":
      return labels.pickDocument ?? (options.multiple ? "Pick documents" : "Pick document");
  }
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

export function SmartFilePickerHost(props: SmartFilePickerHostProps = {}): JSX.Element | null {
  const [req, setReq] = useState<OpenRequest | null>(null);
  const [busy, setBusy] = useState(false);
  const visible = !!req;
  const sheetY = useRef(new Animated.Value(0)).current;
  const autoRunForReq = useRef<OpenRequest | null>(null);

  useEffect(() => {
    return SmartFilePickerBridge.subscribe((r) => setReq(r));
  }, []);

  const options = req?.options ?? {};
  const type = options.type ?? FileSelectionType.ALL;
  const theme = useMemo(
    () => ({ ...(props.theme ?? {}), ...(options.theme ?? {}) }),
    [props.theme, options.theme]
  );

  const actions = useMemo(() => actionsForType(type), [type]);
  const overriddenActions = useMemo(
    () => actionsFromUiOptions(options.ui?.actions),
    [options.ui?.actions]
  );
  const finalActions = overriddenActions ?? actions;
  const shouldForceDirect = req?.options.direct == true;
  const shouldForceSheet = req?.options.direct == false;
  const shouldAutoDirect = !shouldForceSheet && (shouldForceDirect || finalActions.length == 1);

  useEffect(() => {
    if (visible && !shouldAutoDirect) {
      sheetY.setValue(1);
      Animated.timing(sheetY, { toValue: 0, duration: 180, useNativeDriver: true }).start();
    }
  }, [visible, sheetY, shouldAutoDirect]);

  const close = (result?: SmartFilePickerResult, error?: any) => {
    if (!req) return;
    const current = req;
    setBusy(false);
    setReq(null);
    SmartFilePickerBridge.clear(current);
    if (error) current.reject(error);
    else current.resolve(result ?? { medias: [] });
  };

  const onCancel = () => close({ medias: [] });

  const runAction = async (action: ActionId) => {
    if (!req || busy) return;
    setBusy(true);
    try {
      const result = await performAction(nativeActionName(action), req.options);
      close(result);
    } catch (e) {
      close(undefined, e);
    }
  };

  useEffect(() => {
    if (!req) return;
    if (!shouldAutoDirect) return;
    if (autoRunForReq.current == req) return;
    autoRunForReq.current = req;
    void runAction(finalActions[0].id);
  }, [req, shouldAutoDirect, finalActions]);

  if (!visible) return null;
  if (shouldAutoDirect) return null;

  const translateY = sheetY.interpolate({ inputRange: [0, 1], outputRange: [0, 420] });

  return (
    <Modal transparent animationType="none" visible onRequestClose={onCancel}>
      <View style={[styles.backdrop, { backgroundColor: theme.backdropColor ?? "rgba(0,0,0,0.5)" }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.sheetBackgroundColor ?? "#fff",
              transform: [{ translateY }]
            }
          ]}
        >
          <Text style={[styles.title, { color: theme.titleColor ?? "#111" }]}>
            {options.ui?.title ?? options.labels?.title ?? "Choose an option"}
          </Text>
          {!!options.ui?.subtitle && (
            <Text style={[styles.subtitle, { color: theme.subtitleColor ?? "rgba(0,0,0,0.55)" }]}>
              {options.ui.subtitle}
            </Text>
          )}
          <View style={styles.actions}>
            {finalActions.map((a) => (
              <Pressable
                key={`${a.id}-${a.label ?? ""}`}
                onPress={() => runAction(a.id)}
                disabled={busy}
                style={({ pressed }) => [
                  styles.actionItem,
                  {
                    opacity: pressed ? 0.7 : 1
                  }
                ]}
              >
                <Text style={[styles.actionText, { color: theme.itemTextColor ?? "#111" }]}>
                  {actionLabel(a.id, options, a.label)}
                </Text>
              </Pressable>
            ))}
          </View>
          <Pressable
            onPress={onCancel}
            disabled={busy}
            style={[
              styles.cancelButton,
              { backgroundColor: theme.secondaryButtonBackground ?? "#111" }
            ]}
          >
            <Text style={[styles.cancelText, { color: theme.secondaryButtonText ?? "#fff" }]}>
              {options.labels?.cancel ?? "Cancel"}
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end" },
  sheet: {
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16
  },
  title: { fontSize: 16, fontWeight: "600", marginBottom: 10 },
  subtitle: { marginTop: -4, marginBottom: 10, fontSize: 13, fontWeight: "500" },
  actions: { gap: 10 },
  actionItem: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.04)"
  },
  actionText: { fontSize: 15, fontWeight: "500" },
  cancelButton: {
    marginTop: 14,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center"
  },
  cancelText: { fontSize: 15, fontWeight: "600" }
});
