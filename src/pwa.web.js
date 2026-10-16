/* eslint-env browser */
let state = { ready: false, failed: false, update: false };
let installPrompt;
let registration;
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
export async function checkForAppUpdate() {
  if (!navigator.onLine) throw new Error('offline');
  if (!registration) throw new Error('unavailable');
  await registration.update();
}
export function reloadUpdatedApp() {
  window.location.reload();
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
    let alreadyControlled = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      // Do not reload: an open form may contain unsaved work.
      if (alreadyControlled) notify({ update: true });
      alreadyControlled = true;
    });
    registration = await navigator.serviceWorker.register(
      new URL('./sw.js', document.baseURI),
      { updateViaCache: 'none' },
    );
    registration.addEventListener('updatefound', () => {
      const worker = registration.installing;
      worker?.addEventListener('statechange', () => {
        if (
          worker.state === 'activated' &&
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
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && navigator.onLine)
        void registration.update().catch(() => {});
    });
  } catch {
    notify({ failed: true });
  }
}
