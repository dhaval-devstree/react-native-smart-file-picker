// Global Imports
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { clearSmartFilePickerCache } from 'react-native-smart-file-picker';

// Local Imports
import AppNavigator from './AppNavigator';

const App = (props) => {

  useEffect(() => {
    clearSmartFilePickerCache().catch(() => { });
  }, []);

  return (
    <SafeAreaProvider style={{ flex: 1 }}>
      <AppNavigator props={props} />
    </SafeAreaProvider>
  );
};

export default App;