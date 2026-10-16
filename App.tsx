import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Application from './src/Application';
import { PortalProvider } from './src/Portal';
export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <PortalProvider>
        <Application />
      </PortalProvider>
    </SafeAreaProvider>
  );
}
