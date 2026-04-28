// Global Imports
import React from 'react';
import { ScrollView, StatusBar, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

// Local Imports
import styles from './styles';
import Colors from '../../Helper/Colors';
import { navigateToPage } from '../../../AppNavigator';

const Initial = () => {

  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <StatusBar backgroundColor={Colors.WHITE} barStyle='dark-content' />
      <View style={styles.container}>
        <ScrollView contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom }]}>
          <View>
            <Text style={styles.titleTxt}>React Native Smart File Picker</Text>
            <Text style={styles.subtitleTxt}>Pick or capture images/videos, select documents, and optionally crop/compress — all from a dynamic bottom sheet.</Text>
          </View>
          <View style={styles.cardView}>
            <Text style={styles.cardTitleTxt}>Description</Text>
            <Text style={styles.infoTxt}>`react-native-smart-file-picker` is a single, consistent picker experience for common upload flows in mobile apps. It opens a
              dynamic bottom-sheet so users can quickly choose where they want to select files from, without you having to build separate UIs
              for camera, gallery, and documents.</Text>
            <Text style={styles.sectionTitleTxt}>What users can do</Text>
            <View style={styles.bulletsView}>
              <View style={styles.bulletRow}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletTxt}>Pick images from the gallery or capture a new photo.</Text>
              </View>
              <View style={styles.bulletRow}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletTxt}>Pick videos from the gallery or record a new video.</Text>
              </View>
              <View style={styles.bulletRow}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletTxt}>Pick documents (any mime type) with original filename support.</Text>
              </View>
            </View>
            <Text style={styles.sectionTitleTxt}>Helpful options</Text>
            <View style={styles.bulletsView}>
              <View style={styles.bulletRow}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletTxt}>Single or multiple selection depending on your use case.</Text>
              </View>
              <View style={styles.bulletRow}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletTxt}>Optional crop (useful for profile pictures and banners).</Text>
              </View>
              <View style={styles.bulletRow}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletTxt}>Optional image compression to reduce upload size.</Text>
              </View>
              <View style={styles.bulletRow}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletTxt}>Customizable bottom-sheet UI (title, subtitle, actions, and theme).</Text>
              </View>
            </View>
            <Text style={styles.sectionTitleTxt}>What you get back</Text>
            <Text style={styles.infoTxt}>The picker returns a list of selected items (media/documents) including common metadata like `uri`, `localPath` (when available),
              `fileName`, `mimeType`, `fileSize`, and `kind` (image/video/doc).</Text>
            <Text style={styles.footerInfoTxt}>Tap “Open media picker” to try the demo screen. It shows quick actions, the bottom-sheet host with theming, and a list preview of
              the selected items.</Text>
          </View>
          <TouchableOpacity activeOpacity={0.8}
            onPress={() => navigateToPage('MediaPicker')} style={styles.primaryButtonView}>
            <Text style={styles.primaryButtonTxt}>Open media picker</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

export default Initial;