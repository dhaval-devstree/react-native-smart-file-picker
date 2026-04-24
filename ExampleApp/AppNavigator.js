// Global Imports
import { memo } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createNavigationContainerRef, NavigationContainer } from '@react-navigation/native';

// Screen Imports
import Initial from './src/Screens/Initial';
import MediaPicker from './src/Screens/MediaPicker';

export const navigationRef = createNavigationContainerRef();

export const currentRoute = () => {
  if (navigationRef.isReady()) return navigationRef.getCurrentRoute()?.name;
  return undefined;
};

export const navigateToPage = (name, params) => {
  if (navigationRef.isReady()) {
    if (params !== undefined) navigationRef.navigate(name, params);
    else navigationRef.navigate(name);
  };
};

const Stack = createNativeStackNavigator();

const AppNavigator = ({ props, isFrom }) => {
  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator initialRouteName={'Initial'}
        screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="Initial" component={Initial} />
        <Stack.Screen name="MediaPicker" component={MediaPicker} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default memo(AppNavigator);