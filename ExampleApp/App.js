import { useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import {
  FileSelectionType,
  SmartFilePickerAction,
  SmartFilePickerHost,
  openSmartFilePicker
} from 'react-native-smart-file-picker';

function App() {
  const hostTheme = useMemo(() => {
    return {
      backdropColor: 'rgba(0,0,0,0.45)',
      sheetBackgroundColor: '#FFFFFF',
      titleColor: '#0B0F14',
      subtitleColor: 'rgba(11,15,20,0.6)',
      itemTextColor: '#0B0F14',
      secondaryButtonBackground: '#111',
      secondaryButtonText: '#fff',
    };
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar backgroundColor={'#F5F7FA'} barStyle="dark-content" />
      <AppContent />
      <SmartFilePickerHost theme={hostTheme} />
    </SafeAreaProvider>
  );
}

function AppContent() {
  const insets = useSafeAreaInsets();
  const [medias, setMedias] = useState([]);
  const [lastError, setLastError] = useState(null);

  const colors = useMemo(() => {
    return {
      bg: '#F5F7FA',
      card: '#FFFFFF',
      text: '#0B0F14',
      muted: 'rgba(11,15,20,0.6)',
      button: '#0B5FFF',
      buttonText: '#FFFFFF',
      border: 'rgba(11,15,20,0.12)',
    };
  }, []);

  const open = async (type, multiple) => {
    setLastError(null);
    try {
      const res = await openSmartFilePicker({
        type,
        multiple,
        documentMimeType: '*/*',
        enableDocumentWithOriginalName: true,
        crop: { enabled: type === FileSelectionType.PICK_IMAGE && !multiple, aspectRatio: { mode: 'free' } },
        compress: { enabled: type === FileSelectionType.PICK_IMAGE || type === FileSelectionType.CAPTURE_IMAGE, quality: 85, format: 'jpeg', maxWidth: 1920, maxHeight: 1920 },
        ui: {
          title: 'Smart File Picker',
          subtitle: 'Camera, gallery, documents (dynamic UI)',
        },
      });
      setMedias(res.medias ?? []);
    } catch (e) {
      setLastError(e?.message ?? String(e));
    }
  };

  const openGroup = async (group) => {
    setLastError(null);
    try {
      const isImage = group === 'image';
      const res = await openSmartFilePicker({
        multiple: false,
        documentMimeType: '*/*',
        enableDocumentWithOriginalName: true,
        crop: { enabled: isImage, aspectRatio: { mode: 'free' } },
        compress: isImage
          ? { enabled: true, quality: 85, format: 'jpeg', maxWidth: 1920, maxHeight: 1920 }
          : { enabled: false },
        ui: {
          title: isImage ? 'Image' : 'Video',
          subtitle: isImage ? 'Pick or capture an image' : 'Pick or capture a video',
          actions: isImage
            ? [SmartFilePickerAction.PICK_IMAGE, SmartFilePickerAction.CAPTURE_IMAGE]
            : [SmartFilePickerAction.PICK_VIDEO, SmartFilePickerAction.CAPTURE_VIDEO],
        },
      });
      setMedias(res.medias ?? []);
    } catch (e) {
      setLastError(e?.message ?? String(e));
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.h1, { color: colors.text }]}>react-native-smart-file-picker</Text>
        <Text style={[styles.p, { color: colors.muted }]}>
          Demo: open the dynamic bottom-sheet and pick/capture media or documents.
        </Text>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.h2, { color: colors.text }]}>Quick actions</Text>
          <View style={styles.row}>
            <ActionButton
              title="All (sheet)"
              onPress={() => open(FileSelectionType.ALL, false)}
              bg={colors.button}
              fg={colors.buttonText}
            />
            <ActionButton
              title="Images (multi)"
              onPress={() => open(FileSelectionType.PICK_IMAGE, true)}
              bg={colors.button}
              fg={colors.buttonText}
            />
          </View>
          <View style={styles.row}>
            <ActionButton
              title="Capture image"
              onPress={() => open(FileSelectionType.CAPTURE_IMAGE, false)}
              bg={colors.button}
              fg={colors.buttonText}
            />
            <ActionButton
              title="Pick document"
              onPress={() => open(FileSelectionType.PICK_DOCUMENT, true)}
              bg={colors.button}
              fg={colors.buttonText}
            />
          </View>
          <View style={styles.row}>
            <ActionButton
              title="Image"
              onPress={() => openGroup('image')}
              bg={colors.button}
              fg={colors.buttonText}
            />
            <ActionButton
              title="Video"
              onPress={() => openGroup('video')}
              bg={colors.button}
              fg={colors.buttonText}
            />
          </View>
        </View>

        {!!lastError && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.h2, { color: colors.text }]}>Last error</Text>
            <Text style={[styles.mono, { color: colors.muted }]}>{lastError}</Text>
          </View>
        )}

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.resultsHeader}>
            <Text style={[styles.h2, { color: colors.text }]}>Selected</Text>
            <Text style={[styles.p, { color: colors.muted }]}>{medias.length} item(s)</Text>
          </View>

          {medias.length === 0 ? (
            <Text style={[styles.p, { color: colors.muted }]}>Nothing selected yet.</Text>
          ) : (
            medias.map((m, idx) => (
              <View key={`${m.localPath ?? m.uri}-${idx}`} style={[styles.mediaRow, { borderColor: colors.border }]}>
                {m.kind === 'image' ? (
                  <Image
                    source={{ uri: m.localPath ?? m.uri }}
                    style={styles.thumb}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.thumb, styles.thumbFallback, { borderColor: colors.border }]}>
                    <Text style={{ color: colors.muted, fontWeight: '700' }}>
                      {m.kind === 'video' ? 'VID' : 'DOC'}
                    </Text>
                  </View>
                )}
                <View style={styles.mediaMeta}>
                  <Text style={[styles.mediaTitle, { color: colors.text }]} numberOfLines={1}>
                    {m.fileName ?? m.uri}
                  </Text>
                  <Text style={[styles.mediaSub, { color: colors.muted }]} numberOfLines={2}>
                    {m.mimeType ?? 'unknown'} • {formatBytes(m.fileSize)}
                  </Text>
                  {!!m.localPath && (
                    <Text style={[styles.mediaSub, { color: colors.muted }]} numberOfLines={1}>
                      {m.localPath}
                    </Text>
                  )}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function ActionButton(props) {
  return (
    <Pressable
      onPress={props.onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: props.bg, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <Text style={[styles.buttonText, { color: props.fg }]}>{props.title}</Text>
    </Pressable>
  );
}

function formatBytes(input) {
  const bytes = typeof input === 'number' && Number.isFinite(input) ? input : 0;
  if (bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let v = bytes;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 12,
  },
  h1: { fontSize: 22, fontWeight: '800' },
  h2: { fontSize: 16, fontWeight: '800', marginBottom: 10 },
  p: { fontSize: 13, fontWeight: '500' },
  mono: { fontSize: 12, fontWeight: '600' },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: 14,
  },
  row: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  button: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { fontSize: 13, fontWeight: '800' },
  resultsHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  mediaRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  thumb: { width: 56, height: 56, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.08)' },
  thumbFallback: { alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth },
  mediaMeta: { flex: 1, justifyContent: 'center' },
  mediaTitle: { fontSize: 14, fontWeight: '800' },
  mediaSub: { fontSize: 12, fontWeight: '600', marginTop: 2 },
});

export default App;
