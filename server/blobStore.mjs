import { get, put, BlobPreconditionFailedError } from '@vercel/blob';

export function createBlobStore({ readBlob = get, writeBlob = put } = {}) {
  const path = 'student-portal/accounts.json';
  const readOptions = {
    access: 'private',
    useCache: false,
    // Compression changes the strong ETag to W/..., which cannot be used
    // for conditional writes. Request the exact stored representation.
    headers: { 'Accept-Encoding': 'identity' },
  };
  return {
    async read() {
      const result = await readBlob(path, readOptions);
      if (!result) return null;
      if (!result.blob.etag || result.blob.etag.startsWith('W/'))
        throw new Error('Strong storage version unavailable');
      return {
        value: await new Response(result.stream).json(),
        etag: result.blob.etag,
      };
    },
    async write(value, etag) {
      try {
        await writeBlob(path, JSON.stringify(value), {
          access: 'private',
          addRandomSuffix: false,
          contentType: 'application/json',
          allowOverwrite: !!etag,
          ...(etag ? { ifMatch: etag } : {}),
        });
      } catch (e) {
        // SDK subclasses retain Error.name; use instanceof, not the name.
        if (
          e instanceof BlobPreconditionFailedError ||
          (!etag && (await readBlob(path, readOptions)))
        )
          e.code = 'conflict';
        throw e;
      }
    },
  };
}
