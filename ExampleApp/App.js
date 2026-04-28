// Global Imports
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { clearSmartFilePickerCache, getSmartFilePickerCachePath } from 'react-native-smart-file-picker';

// Local Imports
import AppNavigator from './AppNavigator';

const App = (props) => {

  useEffect(() => {
    clearSmartFilePickerCache().catch(() => { });
    getSmartFilePickerCachePath()
      .then((path) => console.log('CACHEDIR : PATH ==> ', path))
      .catch(() => { });
  }, []);

  return (
    <SafeAreaProvider style={{ flex: 1 }}>
      <AppNavigator props={props} />
    </SafeAreaProvider>
  );
};

export default App;