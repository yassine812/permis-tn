import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createPortalService,
  hashPassword,
  signSession,
  readSession,
} from './portal.mjs';

const secret = 'test-secret-only-for-tests-012345678901234567890123456789';
const password = 'test-owner-password-unique';
const ownerHash = await hashPassword(password);
const makeDashboard = name => ({
  version: 1,
  name,
  school: 'École test',
  stage: 'code',
  updatedAt: '2026-10-16T10:00:00.000Z',
  minutes: 120,
  total: 60000,
  paid: 30000,
  due: 30000,
  credit: 0,
  categories: ['code', 'conduite', 'manoeuvre'].map((stage, i) => ({
    stage,
    minutes: i === 0 ? 120 : 0,
    rate: 30000,
    total: i === 0 ? 60000 : 0,
    paid: i === 0 ? 30000 : 0,
    due: i === 0 ? 30000 : 0,
    credit: 0,
    result: 'notTaken',
  })),
});
function fixture() {
  let row = null,
    version = 0,
    time = Date.parse('2026-10-16T12:00:00Z');
  const store = {
    async read() {
      return row
        ? { value: structuredClone(row), etag: String(version) }
        : null;
    },
    async write(value, etag) {
      if ((row && etag !== String(version)) || (!row && etag))
        throw Object.assign(new Error(), { code: 'conflict' });
      row = structuredClone(value);
      version++;
    },
  };
  const service = createPortalService({
    store,
    secret,
    ownerHash,
    now: () => time,
  });
  const request = (action, body, token, ip = 'test-ip') =>
    service({
      action,
      body,
      token,
      ip,
      method: body === undefined ? 'GET' : 'POST',
    });
  return {
    request,
    read: () => row,
    advance: () => {
      time += 16 * 60000;
    },
  };
}
test('only instructor can create accounts and each student can only see their own summary', async () => {
  const f = fixture();
  assert.equal((await f.request('sync', { students: [] })).status, 403);
  const teacher = await f.request('login', { username: 'moniteur', password });
  assert.equal(teacher.status, 200);
  const a = makeDashboard('Ines'),
    b = makeDashboard('Amine');
  const created = await f.request(
    'sync',
    {
      students: [
        {
          id: 's1',
          enabled: true,
          dashboard: { ...a, phone: 'PRIVATE', notes: 'SECRET' },
        },
        { id: 's2', enabled: true, dashboard: b },
      ],
    },
    teacher.cookie,
  );
  assert.equal(created.body.credentials.length, 2);
  const [first, second] = created.body.credentials;
  assert.notEqual(first.username, second.username);
  assert.notEqual(first.password, second.password);
  assert.ok(!JSON.stringify(f.read()).includes(first.password));
  const pupil = await f.request('login', first);
  assert.equal(pupil.body.role, 'student');
  const dash = await f.request('dashboard', undefined, pupil.cookie);
  assert.equal(dash.body.dashboard.name, 'Ines');
  assert.ok(!JSON.stringify(dash.body).includes('Amine'));
  assert.ok(!JSON.stringify(dash.body).includes('PRIVATE'));
  assert.ok(!JSON.stringify(dash.body).includes('SECRET'));
  assert.equal(
    (await f.request('sync', { students: [] }, pupil.cookie)).status,
    403,
  );
  assert.equal(
    (await f.request('reset', { id: 's2' }, pupil.cookie)).status,
    403,
  );
  assert.equal(
    (await f.request('accounts', undefined, pupil.cookie)).status,
    403,
  );
  const again = await f.request(
    'sync',
    {
      students: [
        { id: 's1', enabled: true, dashboard: { ...a, paid: 60000, due: 0 } },
      ],
    },
    teacher.cookie,
  );
  assert.equal(again.body.credentials.length, 0);
  assert.equal(
    (await f.request('dashboard', undefined, pupil.cookie)).body.dashboard.paid,
    60000,
  );
});
test('password reset and access revocation invalidate existing student sessions', async () => {
  const f = fixture(),
    teacher = await f.request('login', { username: 'moniteur', password });
  const added = await f.request(
    'sync',
    {
      students: [{ id: 's', enabled: true, dashboard: makeDashboard('Test') }],
    },
    teacher.cookie,
  );
  const initial = added.body.credentials[0],
    logged = await f.request('login', initial);
  const reset = await f.request('reset', { id: 's' }, teacher.cookie);
  assert.equal(
    (await f.request('dashboard', undefined, logged.cookie)).status,
    401,
  );
  assert.equal((await f.request('login', initial)).status, 401);
  const fresh = await f.request('login', reset.body.credentials[0]);
  assert.equal(fresh.status, 200);
  await f.request(
    'sync',
    { students: [{ id: 's', enabled: false }] },
    teacher.cookie,
  );
  assert.equal(
    (await f.request('dashboard', undefined, fresh.cookie)).status,
    401,
  );
  assert.equal(
    (await f.request('login', reset.body.credentials[0])).status,
    401,
  );
});
test('forged and expired sessions fail and login attempts are persistently limited', async () => {
  const f = fixture();
  assert.equal(
    (await f.request('accounts', undefined, 'fake.cookie')).status,
    403,
  );
  const token = signSession(
    { role: 'owner', sub: 'moniteur', ver: 'wrong' },
    secret,
  );
  assert.equal((await f.request('accounts', undefined, token)).status, 403);
  assert.equal(
    readSession(
      signSession({ role: 'student', sub: 'x' }, secret, 0),
      secret,
      8 * 86400000,
    ),
    null,
  );
  for (let i = 0; i < 8; i++)
    assert.equal(
      (
        await f.request('login', {
          username: 'moniteur',
          password: 'wrong-pass',
        })
      ).status,
      401,
    );
  assert.equal(
    (await f.request('login', { username: 'moniteur', password })).status,
    429,
  );
  f.advance();
  assert.equal(
    (await f.request('login', { username: 'moniteur', password })).status,
    200,
  );
});
test('invalid summaries and prototype keys cannot alter stored records', async () => {
  const f = fixture(),
    teacher = await f.request('login', { username: 'moniteur', password });
  for (const bad of [
    { ...makeDashboard('Test'), paid: -10 },
    { ...makeDashboard('Test'), categories: [] },
    { ...makeDashboard('Test'), updatedAt: 'not-a-date' },
  ]) {
    assert.equal(
      (
        await f.request(
          'sync',
          { students: [{ id: 's', enabled: true, dashboard: bad }] },
          teacher.cookie,
        )
      ).status,
      400,
    );
  }
  assert.equal(
    (
      await f.request(
        'sync',
        {
          students: [
            { id: '__proto__', enabled: true, dashboard: makeDashboard('Bad') },
          ],
        },
        teacher.cookie,
      )
    ).status,
    400,
  );
});
