import { createBlobStore } from '../server/blobStore.mjs';
import { createPortalService } from '../server/portal.mjs';

const store = createBlobStore();
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  const secret = process.env.PORTAL_SESSION_SECRET;
  const ownerHash = process.env.PORTAL_OWNER_HASH;
  if (!secret || !ownerHash)
    return res.status(503).json({ error: 'notConfigured' });
  if (!['GET', 'POST'].includes(req.method))
    return res.status(405).json({ error: 'method' });
  if (req.method === 'POST') {
    const origins = [
      'https://permis-tn.vercel.app',
      `https://${process.env.VERCEL_URL}`,
    ];
    if (
      !origins.includes(req.headers.origin) ||
      !req.headers['content-type']?.startsWith('application/json')
    )
      return res.status(403).json({ error: 'origin' });
    if (JSON.stringify(req.body ?? {}).length > 1000000)
      return res.status(413).json({ error: 'tooLarge' });
  }
  const token = req.headers.cookie
    ?.split(';')
    .map(v => v.trim())
    .find(v => v.startsWith('ptn_session='))
    ?.slice(12);
  try {
    const service = createPortalService({ store, secret, ownerHash });
    const result = await service({
      action: req.query.action,
      method: req.method,
      body: req.body,
      token,
      ip: String(
        req.headers['x-vercel-forwarded-for'] ??
          req.headers['x-forwarded-for'] ??
          req.socket?.remoteAddress ??
          'unknown',
      ).split(',')[0],
    });
    if (result.cookie || result.clearCookie) {
      res.setHeader(
        'Set-Cookie',
        `ptn_session=${
          result.cookie ?? ''
        }; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${
          result.clearCookie ? 0 : 604800
        }`,
      );
    }
    return res.status(result.status).json(result.body);
  } catch {
    // Never log passwords, session cookies, summaries or private storage URLs.
    return res.status(503).json({ error: 'temporarilyUnavailable' });
  }
}
