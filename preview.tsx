// Browser entry point; production supports home-screen installation.
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { startOfflineApp } from './src/pwa.web';
import StudentPortal from './src/StudentPortal.web';
import { isStudentEntry } from './src/portalAudience.web';
const studentView = isStudentEntry();
createRoot(document.getElementById('root')!).render(
  studentView ? <StudentPortal /> : <App />,
);
if (import.meta.env.PROD) {
  void startOfflineApp();
}
