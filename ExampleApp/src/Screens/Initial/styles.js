import { StyleSheet } from 'react-native';
import Colors from '../../Helper/Colors';

export default StyleSheet.create({
  flexStyle: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: Colors.WHITE
  },
  contentContainer: {
    padding: 16,
    gap: 14
  },
  titleTxt: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.BLACK_LIGHT
  },
  subtitleTxt: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.BACKGROUND
  },
  cardView: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    backgroundColor: Colors.WHITE,
    borderColor: Colors.BACKGROUND_LIGHT
  },
  cardTitleTxt: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 10,
    color: Colors.BLACK_LIGHT
  },
  sectionTitleTxt: {
    marginTop: 14,
    marginBottom: 8,
    fontSize: 14,
    fontWeight: '900',
    color: Colors.BLACK_LIGHT
  },
  infoTxt: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.BACKGROUND,
  },
  footerInfoTxt: {
    marginTop: 14,
    fontSize: 12,
    fontWeight: '600',
    color: Colors.BACKGROUND
  },
  bulletsView: { gap: 8 },
  bulletRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start'
  },
  bulletDot: {
    marginTop: 7,
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: Colors.BLUE
  },
  bulletTxt: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.BACKGROUND
  },
  primaryButtonView: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.BLUE
  },
  primaryButtonTxt: {
    fontSize: 14,
    fontWeight: '900',
    color: Colors.WHITE
  }
});
