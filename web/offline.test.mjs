import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import vm from 'node:vm';

// Execute the built worker against cache and network doubles, including failures.
const source = await readFile('preview-dist/sw.js', 'utf8');
const scope = 'https://example.test/permis-tn/';
const url = path => new URL(path, scope).href;
function runtime({ failInstall = false, workerScope = scope } = {}) {
  const listeners = {};
  const records = new Map();
  const cacheNames = new Map([
    ['unrelated-app', new Map()],
    [`permis-tn:${workerScope}:old`, new Map()],
  ]);
  let network = 0;
  let precached = [];
  let skippedWaiting = false;
  const context = {
    URL,
    self: {
      registration: { scope: workerScope },
      clients: { claim: async () => {} },
      skipWaiting: async () => {
        skippedWaiting = true;
      },
      addEventListener: (name, listener) => {
        listeners[name] = listener;
      },
    },
    caches: {
      open: async name => {
        cacheNames.set(name, records);
        return {
          addAll: async files => {
            if (failInstall) {
              throw Error('offline during installation');
            }
            precached = files;
            for (const file of files) {
              records.set(file, { url: file, fromCache: true });
            }
          },
          // Simulate Vary: Origin differing between precache and module fetches.
          match: async (request, options) =>
            options?.ignoreVary
              ? records.get(typeof request === 'string' ? request : request.url)
              : undefined,
        };
      },
      keys: async () => [...cacheNames.keys()],
      delete: async name => cacheNames.delete(name),
    },
    fetch: async () => {
      network++;
      throw Error('network offline');
    },
  };
  vm.runInNewContext(source, context);
  const lifecycle = name =>
    new Promise((resolve, reject) =>
      listeners[name]({ waitUntil: promise => promise.then(resolve, reject) }),
    );
  const request = (path, mode = 'cors', method = 'GET') => {
    let response;
    listeners.fetch({
      request: { url: new URL(path, workerScope).href, mode, method },
      respondWith: value => {
        response = value;
      },
    });
    return response;
  };
  return {
    lifecycle,
    request,
    cacheNames,
    get precached() {
      return precached;
    },
    get network() {
      return network;
    },
    get skippedWaiting() {
      return skippedWaiting;
    },
  };
}
test('all install files exist and work beneath the GitHub repository path', async () => {
  const worker = runtime();
  await worker.lifecycle('install');
  assert.ok(worker.precached.includes(url('index.html')));
  assert.ok(worker.precached.includes(url('manifest.webmanifest')));
  for (const file of worker.precached) {
    assert.ok(file.startsWith(scope));
    await access('preview-dist/' + file.slice(scope.length));
  }
});
test('cold navigation and every cached asset load without a network', async () => {
  const worker = runtime();
  await worker.lifecycle('install');
  assert.equal(
    (await worker.request('?installed=1', 'navigate')).url,
    url('index.html'),
  );
  for (const file of worker.precached) {
    assert.equal((await worker.request(file)).fromCache, true);
  }
  assert.equal(worker.network, 0);
});
test('updates remove only this app cache and leave unrelated caches alone', async () => {
  const worker = runtime();
  await worker.lifecycle('install');
  await worker.lifecycle('activate');
  assert.ok(worker.cacheNames.has('unrelated-app'));
  assert.ok(!worker.cacheNames.has(`permis-tn:${scope}:old`));
  assert.equal(worker.cacheNames.size, 2);
});
test('an incomplete offline installation fails instead of claiming readiness', async () => {
  const worker = runtime({ failInstall: true });
  await assert.rejects(worker.lifecycle('install'), /offline/);
  assert.equal(worker.skippedWaiting, false);
});

test('a complete update activates without waiting for every Safari window to close', async () => {
  const worker = runtime();
  assert.equal(worker.skippedWaiting, false);
  await worker.lifecycle('install');
  assert.equal(worker.skippedWaiting, true);
  assert.ok(worker.precached.includes(url('index.html')));
});
test('student writes and other origins are never intercepted', async () => {
  const worker = runtime();
  assert.equal(worker.request('data', 'cors', 'POST'), undefined);
  assert.equal(worker.request('https://other.example/'), undefined);
});

test('private portal GET responses bypass even the root-scope offline cache', () => {
  const worker = runtime({ workerScope: 'https://example.test/' });
  assert.equal(worker.request('/api/portal?action=dashboard'), undefined);
  assert.equal(
    worker.request('/api/portal?action=session', 'navigate'),
    undefined,
  );
  assert.equal(worker.network, 0);
});
