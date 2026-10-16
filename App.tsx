import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Application from './src/Application';
import { PortalProvider } from './src/Portal';
import { ThemeProvider } from './src/theme';
export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <PortalProvider>
          <Application />
        </PortalProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
