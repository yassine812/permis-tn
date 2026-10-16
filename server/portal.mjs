import {
  createHash,
  createHmac,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'node:crypto';
import { promisify } from 'node:util';
const scrypt = promisify(scryptCallback);
const stages = ['code', 'conduite', 'manoeuvre'];
const safeEqual = (a, b) => {
  const x = Buffer.from(a),
    y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};
export async function hashPassword(
  password,
  salt = randomBytes(16).toString('hex'),
) {
  const hash = await scrypt(password, salt, 32);
  return `${salt}:${hash.toString('hex')}`;
}
export async function verifyPassword(password, hash) {
  if (
    typeof password !== 'string' ||
    password.length < 8 ||
    password.length > 128
  )
    return false;
  return safeEqual(await hashPassword(password, hash.split(':')[0]), hash);
}
export function signSession(claims, key, now = Date.now()) {
  const body = Buffer.from(
    JSON.stringify({ ...claims, exp: now + 7 * 86400000 }),
  ).toString('base64url');
  return `${body}.${createHmac('sha256', key)
    .update(body)
    .digest('base64url')}`;
}
export function readSession(token, key, now = Date.now()) {
  try {
    if (!token || token.length > 1500) return null;
    const [body, signature, extra] = token.split('.');
    if (
      extra ||
      !signature ||
      !safeEqual(
        signature,
        createHmac('sha256', key).update(body).digest('base64url'),
      )
    )
      return null;
    const claims = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (
      !Number.isFinite(claims.exp) ||
      claims.exp <= now ||
      !['owner', 'student'].includes(claims.role)
    )
      return null;
    return claims;
  } catch {
    return null;
  }
}
const failure = (status, error) => ({ status, body: { error } });
const success = body => ({ status: 200, body });
const empty = () => ({ version: 1, accounts: {}, attempts: {} });
const publicAccounts = state =>
  Object.entries(state.accounts).map(([id, a]) => ({
    id,
    username: a.username,
    enabled: a.enabled,
    updatedAt: a.dashboard.updatedAt,
  }));
const digest = value => createHash('sha256').update(value).digest('hex');
function cleanDashboard(d) {
  if (
    !d ||
    d.version !== 1 ||
    typeof d.name !== 'string' ||
    !d.name.trim() ||
    d.name.length > 100 ||
    typeof d.school !== 'string' ||
    d.school.length > 100 ||
    !stages.includes(d.stage) ||
    typeof d.updatedAt !== 'string' ||
    !Number.isFinite(Date.parse(d.updatedAt)) ||
    !Array.isArray(d.categories) ||
    d.categories.length !== 3
  )
    throw new Error('invalid');
  const number = (v, nullable = true) => {
    if (v === null && nullable) return null;
    if (!Number.isSafeInteger(v) || v < 0 || v > 1e14)
      throw new Error('invalid');
    return v;
  };
  return {
    version: 1,
    updatedAt: d.updatedAt,
    name: d.name,
    school: d.school,
    stage: d.stage,
    minutes: number(d.minutes, false),
    total: number(d.total),
    paid: number(d.paid),
    due: number(d.due),
    credit: number(d.credit),
    categories: stages.map((stage, i) => {
      const r = d.categories[i];
      if (
        r.stage !== stage ||
        !['notTaken', 'passed', 'failed'].includes(r.result)
      )
        throw new Error('invalid');
      return {
        stage,
        result: r.result,
        minutes: number(r.minutes, false),
        rate: number(r.rate),
        total: number(r.total),
        paid: number(r.paid, false),
        due: number(r.due),
        credit: number(r.credit),
      };
    }),
  };
}

export function createPortalService({
  store,
  secret,
  ownerHash,
  ownerLogin = 'moniteur',
  now = Date.now,
}) {
  const ownerVersion = digest(ownerHash).slice(0, 24);
  async function read() {
    const row = await store.read();
    return { state: row?.value ?? empty(), etag: row?.etag };
  }
  async function mutate(change) {
    for (let i = 0; i < 3; i++) {
      const { state, etag } = await read();
      const result = await change(state);
      if (!result.write) return result.response;
      try {
        await store.write(state, etag);
        return result.response;
      } catch (e) {
        if (e.code !== 'conflict') throw e;
      }
    }
    return failure(409, 'retry');
  }
  const authorizedOwner = claims =>
    claims?.role === 'owner' &&
    claims.sub === ownerLogin &&
    claims.ver === ownerVersion;
  async function accountFor(claims) {
    if (claims?.role !== 'student') return null;
    const { state } = await read();
    const account = Object.hasOwn(state.accounts, claims.sub)
      ? state.accounts[claims.sub]
      : null;
    return account?.enabled && account.authVersion === claims.ver
      ? account
      : null;
  }
  return async function handle({
    action,
    method,
    body = {},
    token,
    ip = 'unknown',
  }) {
    const claims = readSession(token, secret, now());
    if (action === 'session' && method === 'GET') {
      if (authorizedOwner(claims)) return success({ role: 'owner' });
      if (await accountFor(claims)) return success({ role: 'student' });
      return success({ role: null });
    }
    if (action === 'logout' && method === 'POST')
      return { ...success({ ok: true }), clearCookie: true };
    if (action === 'login' && method === 'POST') {
      const username =
        typeof body.username === 'string'
          ? body.username.trim().toLowerCase()
          : '';
      if (
        !/^[a-z0-9-]{3,60}$/.test(username) ||
        typeof body.password !== 'string' ||
        body.password.length > 128
      )
        return failure(401, 'invalidLogin');
      const keys = [digest(`ip:${ip}`), digest(`login:${username}`)];
      return mutate(async state => {
        const time = now();
        for (const [key, v] of Object.entries(state.attempts))
          if (v.until <= time) delete state.attempts[key];
        if (keys.some(key => state.attempts[key]?.count >= 8))
          return { response: failure(429, 'locked') };
        // Bound unauthenticated writes even when attackers rotate account names.
        if (
          Object.keys(state.attempts).length > 500 &&
          keys.some(key => !state.attempts[key])
        )
          return { response: failure(429, 'locked') };
        const record = Object.entries(state.accounts).find(
          ([, a]) => a.username === username,
        );
        const isOwner = username === ownerLogin;
        const hash = isOwner
          ? ownerHash
          : record?.[1].passwordHash ?? ownerHash;
        const valid = await verifyPassword(body.password, hash);
        if (!valid || (!isOwner && !record?.[1].enabled)) {
          keys.forEach(key => {
            state.attempts[key] = {
              count: (state.attempts[key]?.count ?? 0) + 1,
              until: time + 15 * 60000,
            };
          });
          return { write: true, response: failure(401, 'invalidLogin') };
        }
        keys.forEach(key => {
          delete state.attempts[key];
        });
        const role = isOwner ? 'owner' : 'student';
        return {
          write: true,
          response: {
            ...success({ role }),
            cookie: signSession(
              {
                role,
                sub: isOwner ? ownerLogin : record[0],
                ver: isOwner ? ownerVersion : record[1].authVersion,
              },
              secret,
              time,
            ),
          },
        };
      });
    }
    if (action === 'dashboard' && method === 'GET') {
      const account = await accountFor(claims);
      return account
        ? success({ dashboard: account.dashboard })
        : failure(401, 'loginRequired');
    }
    if (!authorizedOwner(claims)) return failure(403, 'ownerRequired');
    if (action === 'accounts' && method === 'GET') {
      const { state } = await read();
      return success({ accounts: publicAccounts(state) });
    }
    if (action === 'sync' && method === 'POST') {
      let rows;
      try {
        if (!Array.isArray(body.students) || body.students.length > 500)
          throw new Error();
        const ids = new Set();
        rows = body.students.map(row => {
          if (
            !row ||
            typeof row.id !== 'string' ||
            !/^[a-zA-Z0-9_-]{1,100}$/.test(row.id) ||
            ['__proto__', 'constructor', 'prototype'].includes(row.id) ||
            ids.has(row.id) ||
            typeof row.enabled !== 'boolean'
          )
            throw new Error();
          ids.add(row.id);
          return {
            id: row.id,
            enabled: row.enabled,
            dashboard: row.enabled ? cleanDashboard(row.dashboard) : null,
          };
        });
      } catch {
        return failure(400, 'invalidData');
      }
      return mutate(async state => {
        const credentials = [];
        for (const row of rows) {
          const old = state.accounts[row.id];
          if (!row.enabled) {
            if (old) {
              old.enabled = false;
              old.authVersion = randomBytes(16).toString('hex');
            }
            continue;
          }
          if (!old) {
            if (Object.keys(state.accounts).length >= 500)
              return { response: failure(400, 'accountLimit') };
            const username = `eleve-${randomBytes(8).toString('hex')}`;
            const password = randomBytes(15).toString('base64url');
            state.accounts[row.id] = {
              username,
              passwordHash: await hashPassword(password),
              authVersion: randomBytes(16).toString('hex'),
              enabled: true,
              dashboard: row.dashboard,
            };
            credentials.push({ id: row.id, username, password });
          } else {
            old.dashboard = row.dashboard;
            old.enabled = true;
          }
        }
        return {
          write: true,
          response: success({ accounts: publicAccounts(state), credentials }),
        };
      });
    }
    if (action === 'reset' && method === 'POST') {
      return mutate(async state => {
        const account =
          typeof body.id === 'string' && Object.hasOwn(state.accounts, body.id)
            ? state.accounts[body.id]
            : null;
        if (!account) return { response: failure(404, 'notFound') };
        const password = randomBytes(15).toString('base64url');
        account.passwordHash = await hashPassword(password);
        account.authVersion = randomBytes(16).toString('hex');
        delete state.attempts[digest(`login:${account.username}`)];
        return {
          write: true,
          response: success({
            credentials: [
              { id: body.id, username: account.username, password },
            ],
          }),
        };
      });
    }
    return failure(405, 'method');
  };
}
