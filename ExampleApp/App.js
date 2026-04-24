// Global Imports
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Local Imports
import AppNavigator from './AppNavigator';

const App = (props) => {

  return (
    <SafeAreaProvider style={{ flex: 1 }}>
      <AppNavigator props={props} />
    </SafeAreaProvider>
  );
};

export default App;