import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider} from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/authcontext';
import AppNavigator from './src/navigation/appnavigator';

export default function App() {
  return (
    //Gesture Handler Root View zaruri hai gesture handler ke liye
    <GestureHandlerRootView style={{flex:1}}>
      {/*SafeAreaProvider-notch aur navigation bar se bachne ke liye*/}
      <SafeAreaProvider>
        <AuthProvider>
          <AppNavigator />
          <StatusBar style="light" />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}


