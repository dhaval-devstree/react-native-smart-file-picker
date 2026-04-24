import { StyleSheet } from 'react-native';
import Colors from '../../Helper/Colors';

export default StyleSheet.create({
  flexStyle: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: Colors.WHITE
  },
  mainContainer: {
    padding: 16,
    gap: 12
  },
  headerTitleTxt: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.BLACK_LIGHT
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10
  },
  backButtonView: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: Colors.WHITE,
    borderColor: Colors.BACKGROUND_LIGHT
  },
  backButtonTxt: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.BLACK_LIGHT
  },
  cardViewTitleTxt: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 10,
    color: Colors.BLACK_LIGHT
  },
  sectionTitleTxt: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 10,
    color: Colors.BLACK_LIGHT
  },
  infoTxt: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.BACKGROUND
  },
  errorViewTxt: {
    fontSize: 12,
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
  actionButtonView: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10
  },
  buttonView: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.BLUE
  },
  buttonTxt: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.WHITE,
    textAlign: 'center'
  },
  selectedItemView: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between'
  },
  selectedMediaSubView: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderColor: Colors.BACKGROUND_LIGHT
  },
  selectedMediaImageView: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.08)'
  },
  selectedMediaImagePlaceholderView: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.BACKGROUND_LIGHT
  },
  selectedMediaImagePlaceholderTxt: {
    color: Colors.BACKGROUND,
    fontWeight: '700'
  },
  selectedMediaItemMetaView: {
    flex: 1,
    justifyContent: 'center'
  },
  selectedMediaItemTitleTxt: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.BLACK_LIGHT
  },
  selectedMediaItemSubTxt: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
    color: Colors.BACKGROUND
  }
})
