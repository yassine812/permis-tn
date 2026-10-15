// Browser entry point; production supports home-screen installation.
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { startOfflineApp } from './src/pwa.web';
createRoot(document.getElementById('root')!).render(<App />);
if (import.meta.env.PROD) {
  void startOfflineApp();
}
