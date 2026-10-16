import test from 'node:test';
import assert from 'node:assert/strict';
import { BlobPreconditionFailedError } from '@vercel/blob';
import { createBlobStore } from './blobStore.mjs';

test('private storage uses consistent uncompressed reads and exact conditional writes', async () => {
  const store = createBlobStore({
    readBlob: async (_, options) => {
      assert.equal(options.useCache, false);
      assert.equal(options.access, 'private');
      assert.equal(options.headers['Accept-Encoding'], 'identity');
      return {
        stream: new Response('{"version":1}').body,
        blob: { etag: '"one"' },
      };
    },
    writeBlob: async (_, body, options) => {
      assert.equal(body, '{"version":2}');
      assert.equal(options.ifMatch, '"one"');
      assert.equal(options.access, 'private');
      assert.equal(options.allowOverwrite, true);
    },
  });
  const row = await store.read();
  assert.equal(row.value.version, 1);
  await store.write({ version: 2 }, row.etag);
});

test('storage fails closed for weak ETags and detects SDK conflicts', async () => {
  const store = createBlobStore({
    readBlob: async () => ({ blob: { etag: 'W/"one"' } }),
    writeBlob: async () => {
      throw new BlobPreconditionFailedError();
    },
  });
  await assert.rejects(store.read(), /Strong storage version/);
  await assert.rejects(store.write({}, '"one"'), { code: 'conflict' });
});

test('simultaneous first writes retry instead of overwriting the winner', async () => {
  const store = createBlobStore({
    readBlob: async () => ({ blob: { etag: '"one"' } }),
    writeBlob: async (_, body, options) => {
      assert.equal(options.allowOverwrite, false);
      assert.equal(options.ifMatch, undefined);
      throw new Error('already exists');
    },
  });
  await assert.rejects(store.write({}), { code: 'conflict' });
});
