// Global Imports
import { useState } from 'react';
import { Image, Platform, ScrollView, StatusBar, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  FileSelectionType, SmartFilePickerAction,
  SmartFilePickerHost, openSmartFilePicker
} from 'react-native-smart-file-picker';

// Local Imports
import styles from './styles';
import Colors from '../../Helper/Colors';

const BOTTOM_SHEET_THEME = {
  backdropColor: Colors.BACKGROUND_LIGHT_CONTRAST,
  sheetBackgroundColor: Colors.WHITE,
  titleColor: Colors.BLACK_LIGHT,
  subtitleColor: Colors.BACKGROUND,
  itemTextColor: Colors.BLACK_LIGHT,
  secondaryButtonBackground: Colors.BLACK_LIGHT_CONTRAST,
  secondaryButtonText: Colors.WHITE
};

const MediaPicker = () => {

  const insets = useSafeAreaInsets();

  const [selectedMedias, setSelectedMedias] = useState([]);
  const [lastErrorMessage, setLastErrorMessage] = useState(null);

  /*
  .##........#######...######...####..######.
  .##.......##.....##.##....##...##..##....##
  .##.......##.....##.##.........##..##......
  .##.......##.....##.##...####..##..##......
  .##.......##.....##.##....##...##..##......
  .##.......##.....##.##....##...##..##....##
  .########..#######...######...####..######.
  */

  const handleFormatMediaSize = (mediaSize) => {
    const bytes = typeof mediaSize == 'number' && Number.isFinite(mediaSize) ? mediaSize : 0;
    if (bytes <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    let v = bytes;
    let i = 0;
    while (v >= 1024 && i < units.length - 1) {
      v /= 1024;
      i += 1;
    };
    return `${v.toFixed(i == 0 ? 0 : 1)} ${units[i]}`;
  };

  const handleSingleOptionSheet = async (type, multiple) => {
    setLastErrorMessage(null);
    try {
      const res = await openSmartFilePicker({
        type,
        multiple,
        documentMimeType: '*/*',
        enableDocumentWithOriginalName: true,
        crop: { enabled: false },
        compress: {
          enabled: type == FileSelectionType.PICK_IMAGE || type == FileSelectionType.CAPTURE_IMAGE,
          quality: 85, format: 'jpeg', maxWidth: 1920, maxHeight: 1920
        },
        ui: {
          title: 'Smart File Picker',
          subtitle: 'Camera, gallery, documents (dynamic UI)',
        }
      });
      setSelectedMedias(res.medias ?? []);
    } catch (e) {
      console.log('handleSingleOptionSheet : e ==> ', e);
      setLastErrorMessage(e?.message ?? String(e));
    }
  };

  const handleMultipleOptionSheet = async (type) => {
    setLastErrorMessage(null);
    try {
      const isImage = type == 'image';
      const res = await openSmartFilePicker({
        multiple: false,
        documentMimeType: '*/*',
        enableDocumentWithOriginalName: true,
        crop: { enabled: false },
        compress: isImage
          ? { enabled: true, quality: 85, format: 'jpeg', maxWidth: 1920, maxHeight: 1920 }
          : { enabled: false },
        ui: {
          title: isImage ? 'Image' : 'Video',
          subtitle: isImage ? 'Pick or capture an image' : 'Pick or capture a video',
          actions: isImage
            ? [SmartFilePickerAction.CAPTURE_IMAGE, SmartFilePickerAction.PICK_IMAGE]
            : [SmartFilePickerAction.CAPTURE_VIDEO, SmartFilePickerAction.PICK_VIDEO],
        }
      });
      setSelectedMedias(res.medias ?? []);
    } catch (e) {
      console.log('handleMultipleOptionSheet : e ==> ', e);
      setLastErrorMessage(e?.message ?? String(e));
    }
  };

  const handleImageWithCrop = async (type) => {
    setLastErrorMessage(null);
    try {
      const res = await openSmartFilePicker({
        type,
        multiple: false,
        documentMimeType: '*/*',
        enableDocumentWithOriginalName: true,
        crop: { enabled: true, aspectRatio: { mode: 'free' } },
        compress: { enabled: true, quality: 85, format: 'jpeg', maxWidth: 1920, maxHeight: 1920 },
        ui: {
          title: 'Smart File Picker',
          subtitle: type == FileSelectionType.CAPTURE_IMAGE ? 'Capture image with crop' : 'Pick image with crop',
        }
      });
      setSelectedMedias(res.medias ?? []);
    } catch (e) {
      console.log('handleImageWithCrop : e ==> ', e);
      setLastErrorMessage(e?.message ?? String(e));
    }
  };

  const handleVideoWithTrim = async (type) => {
    setLastErrorMessage(null);
    try {
      const res = await openSmartFilePicker({
        type,
        multiple: false,
        documentMimeType: '*/*',
        enableDocumentWithOriginalName: true,
        crop: { enabled: false },
        compress: { enabled: false },
        video: { trim: { enabled: true, minDurationMs: 10_000 } },
        ui: {
          title: 'Smart File Picker',
          subtitle: type == FileSelectionType.CAPTURE_VIDEO ? 'Capture video with trim UI' : 'Pick video with trim UI',
        }
      });
      setSelectedMedias(res.medias ?? []);
    } catch (e) {
      console.log('handleVideoWithTrim : e ==> ', e);
      setLastErrorMessage(e?.message ?? String(e));
    }
  };

  const _onPressCaptureImageButton = () => handleSingleOptionSheet(FileSelectionType.CAPTURE_IMAGE, false);
  const _onPressPickImageButton = () => handleSingleOptionSheet(FileSelectionType.PICK_IMAGE, false);
  const _onPressCaptureVideoButton = () => handleSingleOptionSheet(FileSelectionType.CAPTURE_VIDEO, false);
  const _onPressPickVideoButton = () => handleSingleOptionSheet(FileSelectionType.PICK_VIDEO, false);
  const _onPressCaptureVideoWithTrimButton = () => handleVideoWithTrim(FileSelectionType.CAPTURE_VIDEO);
  const _onPressPickVideoWithTrimButton = () => handleVideoWithTrim(FileSelectionType.PICK_VIDEO);
  const _onPressPickMultiImagesButton = () => handleSingleOptionSheet(FileSelectionType.PICK_IMAGE, true);
  const _onPressPickMultiVideosButton = () => handleSingleOptionSheet(FileSelectionType.PICK_VIDEO, true);
  const _onPressPickDocumentButton = () => handleSingleOptionSheet(FileSelectionType.PICK_DOCUMENT, false);
  const _onPressPickMultiDocumentButton = () => handleSingleOptionSheet(FileSelectionType.PICK_DOCUMENT, true);
  const _onPressImageSheetButton = () => handleMultipleOptionSheet('image');
  const _onPressVideoSheetButton = () => handleMultipleOptionSheet('video');
  const _onPressCaptureImageWithCroppingButton = () => handleImageWithCrop(FileSelectionType.CAPTURE_IMAGE);
  const _onPressPickImageWithCroppingButton = () => handleImageWithCrop(FileSelectionType.PICK_IMAGE);
  const _onPressPickAnyMediaButton = () => handleSingleOptionSheet(FileSelectionType.ALL, false);

  /*
  ..######...#######..##.....##.########...#######..##....##.########.##....##.########
  .##....##.##.....##.###...###.##.....##.##.....##.###...##.##.......###...##....##...
  .##.......##.....##.####.####.##.....##.##.....##.####..##.##.......####..##....##...
  .##.......##.....##.##.###.##.########..##.....##.##.##.##.######...##.##.##....##...
  .##.......##.....##.##.....##.##........##.....##.##..####.##.......##..####....##...
  .##....##.##.....##.##.....##.##........##.....##.##...###.##.......##...###....##...
  ..######...#######..##.....##.##.........#######..##....##.########.##....##....##...
  */

  const renderMainView = () => {
    return (
      <SafeAreaView edges={['top']} style={styles.container}>
        <StatusBar backgroundColor={Colors.WHITE} barStyle='dark-content' />
        <View style={styles.container}>
          <ScrollView contentContainerStyle={[styles.mainContainer, { paddingBottom: insets.bottom }]}>
            {renderHeaderView()}
            {renderQuickActionsView()}
            {selectedMedias?.length > 0 ? renderSelectedMediaView() : null}
            {!!lastErrorMessage ? renderErrorView() : null}
          </ScrollView>
        </View>
        <SmartFilePickerHost theme={BOTTOM_SHEET_THEME} />
      </SafeAreaView>
    );
  };

  const renderHeaderView = () => {
    return (
      <View>
        <Text style={styles.headerTitleTxt}>React Native Smart File Picker</Text>
        <Text style={styles.infoTxt}>Open the dynamic bottom-sheet and pick/capture media or documents.</Text>
      </View>
    );
  };

  const renderQuickActionsView = () => {
    return (
      <View style={styles.cardView}>
        <Text style={styles.cardViewTitleTxt}>Quick actions</Text>
        <View style={styles.actionButtonView}>
          {renderActionButton(`Capture Image`, _onPressCaptureImageButton)}
          {renderActionButton(`Pick Image`, _onPressPickImageButton)}
        </View>
        <View style={styles.actionButtonView}>
          {renderActionButton(`Capture Video`, _onPressCaptureVideoButton)}
          {renderActionButton(`Pick Video`, _onPressPickVideoButton)}
        </View>
        <View style={styles.actionButtonView}>
          {renderActionButton(`Capture Video (Trim)`, _onPressCaptureVideoWithTrimButton)}
          {renderActionButton(`Pick Video (Trim)`, _onPressPickVideoWithTrimButton)}
        </View>
        <View style={styles.actionButtonView}>
          {renderActionButton(`Pick Multi Images`, _onPressPickMultiImagesButton)}
          {renderActionButton(`Pick Multi Videos`, _onPressPickMultiVideosButton)}
        </View>
        <View style={styles.actionButtonView}>
          {renderActionButton(`Pick Document`, _onPressPickDocumentButton)}
          {renderActionButton(`Pick Multi Document`, _onPressPickMultiDocumentButton)}
        </View>
        <View style={styles.actionButtonView}>
          {renderActionButton(`Image`, _onPressImageSheetButton)}
          {renderActionButton(`Video`, _onPressVideoSheetButton)}
        </View>
        <View style={styles.actionButtonView}>
          {renderActionButton(`Capture Image with Cropping`, _onPressCaptureImageWithCroppingButton)}
          {renderActionButton(`Pick Image with Cropping`, _onPressPickImageWithCroppingButton)}
        </View>
        <View style={styles.actionButtonView}>
          {renderActionButton(`Pick Any Media`, _onPressPickAnyMediaButton)}
        </View>
      </View>
    );
  };

  const renderActionButton = (title, onPress) => {
    return (
      <TouchableOpacity onPress={onPress}
        activeOpacity={0.8} style={styles.buttonView}>
        <Text style={styles.buttonTxt}>{title}</Text>
      </TouchableOpacity>
    );
  };

  const renderSelectedMediaView = () => {
    return (
      <View style={styles.cardView}>
        <View style={styles.selectedItemView}>
          <Text style={styles.cardViewTitleTxt}>Selected Media</Text>
          <Text style={styles.infoTxt}>{selectedMedias?.length} {selectedMedias?.length > 1 ? 'items' : 'item'}</Text>
        </View>
        {selectedMedias?.map((item, index) => {
          return (
            <View key={index} style={styles.selectedMediaSubView}>
              {item?.kind == 'image' ?
                <Image source={{ uri: item?.localPath ?? item?.uri }} style={styles.selectedMediaImageView} resizeMode="cover" /> :
                <View style={[styles.selectedMediaImageView, styles.selectedMediaImagePlaceholderView]}>
                  <Text style={styles.selectedMediaImagePlaceholderTxt}>{item?.kind == 'video' ? 'VID' : 'DOC'}</Text>
                </View>}
              <View style={styles.selectedMediaItemMetaView}>
                <Text style={styles.selectedMediaItemTitleTxt} numberOfLines={1}>{item?.fileName ?? item?.uri}</Text>
                <Text style={styles.selectedMediaItemSubTxt} numberOfLines={2}>{item?.mimeType ?? 'unknown'} • {handleFormatMediaSize(item?.fileSize)}</Text>
                {!!item?.localPath ? <Text style={styles.selectedMediaItemSubTxt} numberOfLines={1}>{item?.localPath}</Text> : null}
              </View>
            </View>
          )
        })}
      </View>
    );
  };

  const renderErrorView = () => {
    return (
      <View style={styles.cardView}>
        <Text style={styles.cardViewTitleTxt}>Last error</Text>
        <Text style={styles.errorViewTxt}>{lastErrorMessage}</Text>
      </View>
    );
  };

  return renderMainView();
};

export default MediaPicker;
