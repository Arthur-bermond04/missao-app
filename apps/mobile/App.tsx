import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './src/navigation/AppNavigator';
import { ToastHost } from './src/components/ui/ToastHost';

export default function App() {
  return (
    <SafeAreaProvider>
      <AppNavigator />
      <ToastHost />
      <StatusBar style="light" />
    </SafeAreaProvider>
  );
}
