/* eslint-env browser */
let state = { ready: false, failed: false, update: false };
let installPrompt;
const listeners = new Set();
const notify = change => {
  state = { ...state, ...change };
  listeners.forEach(listener => listener(state));
};
export const getOfflineState = () => state;
export function watchOfflineState(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  installPrompt = event;
  notify({ canInstall: true });
});
window.addEventListener('appinstalled', () => {
  installPrompt = undefined;
  notify({ canInstall: false });
});
export async function installApp() {
  navigator.storage?.persist?.().catch(() => {});
  if (installPrompt) {
    await installPrompt.prompt();
    await installPrompt.userChoice;
    installPrompt = undefined;
    notify({ canInstall: false });
  }
}
export async function startOfflineApp() {
  if (!('serviceWorker' in navigator)) {
    notify({ failed: true });
    return;
  }
  try {
    const registration = await navigator.serviceWorker.register(
      new URL('./sw.js', document.baseURI),
      { updateViaCache: 'none' },
    );
    if (registration.waiting) {
      notify({ update: true });
    }
    registration.addEventListener('updatefound', () => {
      const worker = registration.installing;
      worker?.addEventListener('statechange', () => {
        if (
          worker.state === 'installed' &&
          navigator.serviceWorker.controller
        ) {
          notify({ update: true });
        }
        if (worker.state === 'redundant' && !registration.active) {
          notify({ failed: true });
        }
      });
    });
    await navigator.serviceWorker.ready;
    notify({ ready: true, failed: false });
    window.addEventListener('online', () => {
      void registration.update().catch(() => {});
    });
  } catch {
    notify({ failed: true });
  }
}
