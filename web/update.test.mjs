import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const source = (await readFile('src/pwa.web.js', 'utf8')).replace(
  /export /g,
  '',
);
function runtime(controlled = true) {
  const windowEvents = {},
    workerEvents = {},
    documentEvents = {},
    registrationEvents = {};
  let reloads = 0,
    checks = 0;
  const registration = {
    active: {},
    installing: null,
    update: async () => {
      checks++;
    },
    addEventListener: (name, cb) => {
      registrationEvents[name] = cb;
    },
  };
  const context = {
    URL,
    document: {
      baseURI: 'https://example.test/',
      visibilityState: 'visible',
      addEventListener: (name, cb) => {
        documentEvents[name] = cb;
      },
    },
    window: {
      addEventListener: (name, cb) => {
        windowEvents[name] = cb;
      },
      location: {
        reload: () => {
          reloads++;
        },
      },
    },
    navigator: {
      onLine: true,
      serviceWorker: {
        controller: controlled ? {} : null,
        ready: Promise.resolve(registration),
        register: async () => registration,
        addEventListener: (name, cb) => {
          workerEvents[name] = cb;
        },
      },
    },
  };
  vm.createContext(context);
  vm.runInContext(
    source +
      '\nthis.api = {startOfflineApp, getOfflineState, reloadUpdatedApp, checkForAppUpdate};',
    context,
  );
  return {
    ...context.api,
    windowEvents,
    workerEvents,
    documentEvents,
    get reloads() {
      return reloads;
    },
    get checks() {
      return checks;
    },
  };
}
test('activating a new worker offers an update but never reloads an unsaved form', async () => {
  const app = runtime();
  await app.startOfflineApp();
  app.workerEvents.controllerchange();
  assert.equal(app.getOfflineState().update, true);
  assert.equal(app.reloads, 0);
  app.reloadUpdatedApp();
  assert.equal(app.reloads, 1);
});
test('first install does not announce an update; manual checks and returning online check for one', async () => {
  const app = runtime(false);
  await app.startOfflineApp();
  app.workerEvents.controllerchange();
  assert.equal(app.getOfflineState().update, false);
  await app.checkForAppUpdate();
  app.windowEvents.online();
  app.documentEvents.visibilitychange();
  assert.equal(app.checks, 3);
  assert.equal(app.reloads, 0);
});
