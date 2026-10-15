import {
  blankRates,
  blankPayments,
  blankResults,
  setExamResult,
  isCompleted,
  emptyData,
  hoursInput,
  moneyInput,
  parseBackup,
  saveHourEntry,
  saveLesson,
  saveStudent,
  Student,
  studentAccount,
  paymentFields,
  setLessonPayment,
} from '../src/domain';
const student: Student = {
  id: 's',
  name: 'Ines',
  phone: '',
  stage: 'code',
  notes: '',
  archived: false,
  rates: blankRates(),
  amountPaid: 0,
  paidByStage: blankPayments(),
  examResults: blankResults(),
};
const now = new Date('2026-10-15T12:00:00Z');
const base = () => saveStudent(emptyData(), student);

test('candidate rate is shared by all stages and payment choices survive backups without double counting', () => {
  let d = saveStudent(base(), { ...student, hourlyRate: 30000 });
  d = saveStudent(d, { ...student, id: 'other', hourlyRate: 40000 });
  for (const type of ['code', 'conduite', 'manoeuvre'] as const) {
    const entry = {
      id: type,
      studentId: 's',
      type,
      date: '2026-10-14',
      duration: 60,
      notes: '',
    };
    d = saveHourEntry(
      d,
      { ...entry, ...paymentFields(entry, type !== 'manoeuvre', 30000) },
      now,
    );
  }
  expect(studentAccount(d, d.students[0]).byStage).toMatchObject([
    { rate: 30000, total: 30000, paid: 30000, due: 0 },
    { rate: 30000, total: 30000, paid: 30000, due: 0 },
    { rate: 30000, total: 30000, paid: 0, due: 30000 },
  ]);
  const existing = d.hourEntries[0];
  d = saveHourEntry(
    d,
    { ...existing, ...paymentFields(existing, true, 30000) },
    now,
  );
  expect(d.hourEntries).toHaveLength(3);
  expect(studentAccount(d, d.students[0]).paid).toBe(60000);
  d = saveStudent(d, { ...d.students[0], hourlyRate: 35000 });
  expect(studentAccount(d, d.students[0])).toMatchObject({
    total: 105000,
    paid: 60000,
    due: 45000,
  });
  expect(d.students[1].hourlyRate).toBe(40000);
  d = saveHourEntry(
    d,
    { ...existing, ...paymentFields(existing, false, 35000) },
    now,
  );
  expect(studentAccount(d, d.students[0]).paid).toBe(30000);
  expect(parseBackup(JSON.stringify(d))).toEqual(d);
});

test('calendar payment updates money once and completed hours separately, preserving legacy receipts', () => {
  let d = saveStudent(base(), {
    ...student,
    hourlyRate: 30000,
    paidByStage: { ...blankPayments(), code: 10000 },
  });
  d = saveLesson(
    d,
    {
      id: 'p',
      studentId: 's',
      type: 'code',
      date: '2026-10-14',
      start: '08:00',
      duration: 60,
      paid: false,
      status: 'planned',
      notes: '',
    },
    now,
  );
  d = setLessonPayment(d, d.lessons[0], true);
  d = setLessonPayment(d, d.lessons[0], true);
  expect(studentAccount(d, d.students[0])).toMatchObject({
    minutes: 0,
    paid: 40000,
    credit: 40000,
  });
  d = saveLesson(d, { ...d.lessons[0], status: 'done' }, now);
  expect(studentAccount(d, d.students[0])).toMatchObject({
    minutes: 60,
    total: 30000,
    paid: 40000,
  });
  expect(parseBackup(JSON.stringify(d))).toEqual(d);
  d = setLessonPayment(d, d.lessons[0], false);
  expect(studentAccount(d, d.students[0]).paid).toBe(10000);
  d = setLessonPayment(d, d.lessons[0], true);
  d = saveLesson(d, { ...d.lessons[0], status: 'cancelled' }, now);
  expect(studentAccount(d, d.students[0])).toMatchObject({
    minutes: 0,
    paid: 40000,
    credit: 40000,
  });
  d = setLessonPayment(d, d.lessons[0], false);
  // Pre-existing informational flags must not invent a second receipt.
  const legacy = { ...d.lessons[0], paid: true, paidAmount: undefined };
  d = setLessonPayment(d, legacy, true);
  expect(studentAccount(d, d.students[0]).paid).toBe(10000);
});

test('invalid candidate prices and receipt amounts are rejected before restoring a backup', () => {
  for (const rate of [-1, 1.5, '30', Infinity]) {
    const raw = JSON.stringify({
      ...base(),
      students: [{ ...student, hourlyRate: rate }],
    });
    if (rate !== Infinity) {
      expect(() => parseBackup(raw)).toThrow('backupError');
    }
    expect(() =>
      paymentFields({ duration: 60 }, true, rate as number),
    ).toThrow();
  }
  const entry = {
    id: 'h',
    studentId: 's',
    type: 'code',
    date: '2026-10-14',
    duration: 60,
    notes: '',
  };
  for (const payment of [
    { paid: false, paidAmount: 1000 },
    { paid: true, paidAmount: -1000 },
    { paid: 'yes', paidAmount: 0 },
  ]) {
    expect(() =>
      parseBackup(
        JSON.stringify({ ...base(), hourEntries: [{ ...entry, ...payment }] }),
      ),
    ).toThrow('backupError');
  }
});
test('one shared tariff applies to existing and new students with category-specific payments', () => {
  let d = base();
  d.settings.rates = { code: 10000, conduite: 30000, manoeuvre: 40000 };
  d = saveStudent(d, { ...student, id: 'second' });
  for (const studentId of ['s', 'second']) {
    for (const type of ['code', 'conduite', 'manoeuvre'] as const) {
      d = saveHourEntry(
        d,
        {
          id: `${studentId}-${type}`,
          studentId,
          type,
          date: '2026-10-14',
          duration: 120,
          notes: '',
        },
        now,
      );
    }
  }
  const st = {
    ...d.students[0],
    paidByStage: { code: 25000, conduite: 20000, manoeuvre: 0 },
  };
  const account = studentAccount(d, st);
  expect(account.byStage).toMatchObject([
    { minutes: 120, total: 20000, paid: 25000, due: 0, credit: 5000 },
    { minutes: 120, total: 60000, paid: 20000, due: 40000, credit: 0 },
    { minutes: 120, total: 80000, paid: 0, due: 80000, credit: 0 },
  ]);
  expect(account).toMatchObject({
    total: 160000,
    paid: 45000,
    due: 120000,
    credit: 5000,
  });
  expect(studentAccount(d, d.students[1])).toMatchObject({
    total: 160000,
    paid: 0,
  });
  d.settings.rates.conduite = 35000;
  expect(studentAccount(d, st).total).toBe(170000);
  expect(studentAccount(d, d.students[1]).total).toBe(170000);
});
test('exam results persist independently for every category and can be corrected after a retake', () => {
  let d = base();
  d = setExamResult(d, 's', 'code', 'failed');
  d = setExamResult(d, 's', 'conduite', 'passed');
  d = setExamResult(d, 's', 'manoeuvre', 'failed');
  expect(parseBackup(JSON.stringify(d)).students[0].examResults).toEqual({
    code: 'failed',
    conduite: 'passed',
    manoeuvre: 'failed',
  });
  d = setExamResult(d, 's', 'code', 'passed');
  expect(d.students[0].examResults.code).toBe('passed');
  expect(d.students[0].stage).toBe('manoeuvre');
});
test('passed exams advance automatically, failures stay, final success completes the course', () => {
  let d = base();
  d = setExamResult(d, 's', 'code', 'failed');
  expect(d.students[0].stage).toBe('code');
  d = setExamResult(d, 's', 'code', 'passed');
  expect(d.students[0].stage).toBe('conduite');
  d = setExamResult(d, 's', 'conduite', 'passed');
  expect(d.students[0].stage).toBe('manoeuvre');
  expect(isCompleted(d.students[0])).toBe(false);
  d = setExamResult(d, 's', 'manoeuvre', 'passed');
  expect(isCompleted(d.students[0])).toBe(true);
  expect(parseBackup(JSON.stringify(d))).toEqual(d);
  d = setExamResult(d, 's', 'code', 'failed');
  expect(d.students[0].stage).toBe('code');
  expect(isCompleted(d.students[0])).toBe(false);
  d = setExamResult(d, 's', 'code', 'passed');
  expect(d.students[0].stage).toBe('manoeuvre');
  expect(isCompleted(d.students[0])).toBe(true);
  expect(d.students[0].paidByStage).toEqual(blankPayments());
  expect(d.hourEntries).toEqual([]);
});
test('opening existing data reconciles previously passed current stages', () => {
  const d = base();
  d.students[0] = {
    ...d.students[0],
    examResults: { ...blankResults(), code: 'passed' },
  };
  expect(parseBackup(JSON.stringify(d)).students[0].stage).toBe('conduite');
});
test('recording a later category success moves to its next category without moving backwards for old successes', () => {
  let d = setExamResult(base(), 's', 'conduite', 'passed');
  expect(d.students[0].stage).toBe('manoeuvre');
  d = setExamResult(d, 's', 'code', 'passed');
  expect(d.students[0].stage).toBe('manoeuvre');
});
test('v3 migration preserves unallocated payments and adopts only unambiguous shared rates', () => {
  const old = {
    ...base(),
    version: 3,
    students: [
      {
        ...student,
        rates: { code: 10000, conduite: 30000, manoeuvre: null },
        amountPaid: 20000,
      },
      {
        ...student,
        id: 's2',
        rates: { code: 10000, conduite: 40000, manoeuvre: null },
      },
    ],
  };
  const d = parseBackup(JSON.stringify(old));
  expect(d.settings.rates).toEqual({
    code: 10000,
    conduite: null,
    manoeuvre: null,
  });
  expect(d.students[0].rates).toEqual(old.students[0].rates);
  expect(d.students[0].amountPaid).toBe(20000);
  expect(d.students[0].paidByStage).toEqual(blankPayments());
  expect(studentAccount(d, d.students[0]).paid).toBe(20000);
  expect(parseBackup(JSON.stringify(d))).toEqual(d);
});
test('rejects invalid category payments, exam results, and shared rates in backups', () => {
  for (const changes of [
    { paidByStage: { ...blankPayments(), code: -1 } },
    { paidByStage: { ...blankPayments(), code: 0.5 } },
    { examResults: { ...blankResults(), conduite: 'invalid' } },
  ]) {
    expect(() =>
      parseBackup(
        JSON.stringify({ ...base(), students: [{ ...student, ...changes }] }),
      ),
    ).toThrow('backupError');
  }
  const d = base();
  d.settings.rates.code = -1;
  expect(() => parseBackup(JSON.stringify(d))).toThrow('backupError');
});
test('adds independent hours in all levels and includes completed calendar lessons once', () => {
  let d = base();
  for (const type of ['code', 'conduite', 'manoeuvre'] as const) {
    d = saveHourEntry(
      d,
      {
        id: type,
        studentId: 's',
        type,
        date: '2026-10-14',
        duration: 90,
        notes: '',
      },
      now,
    );
  }
  d = saveLesson(
    d,
    {
      id: 'l',
      studentId: 's',
      type: 'conduite',
      date: '2026-10-14',
      start: '10:00',
      duration: 60,
      status: 'done',
      paid: false,
      notes: '',
    },
    now,
  );
  d = saveLesson(
    d,
    { ...d.lessons[0], id: 'p', start: '12:00', status: 'planned' },
    now,
  );
  d = saveLesson(
    d,
    { ...d.lessons[0], id: 'c', start: '14:00', status: 'cancelled' },
    now,
  );
  expect(studentAccount(d, d.students[0]).byStage.map(r => r.minutes)).toEqual([
    90, 150, 90,
  ]);
  expect(studentAccount(d, d.students[0]).minutes).toBe(330);
});
test('prices are entered by the user; missing prices do not silently imply free lessons', () => {
  const d = saveHourEntry(
    base(),
    {
      id: 'h',
      studentId: 's',
      type: 'code',
      date: '2026-10-14',
      duration: 60,
      notes: '',
    },
    now,
  );
  expect(studentAccount(d, student).total).toBeNull();
  expect(
    studentAccount(
      {
        ...d,
        settings: { ...d.settings, rates: { ...blankRates(), code: 0 } },
      },
      student,
    ).total,
  ).toBe(0);
});
test('repricing recomputes completed hours while the actual amount paid stays fixed', () => {
  const d = saveHourEntry(
    base(),
    {
      id: 'h',
      studentId: 's',
      type: 'conduite',
      date: '2026-10-14',
      duration: 150,
      notes: '',
    },
    now,
  );
  const st = {
    ...student,
    paidByStage: { ...blankPayments(), conduite: 20000 },
  };
  d.settings.rates.conduite = 30000;
  expect(studentAccount(d, st)).toMatchObject({
    minutes: 150,
    total: 75000,
    paid: 20000,
    due: 55000,
    credit: 0,
  });
  expect(
    studentAccount(
      {
        ...d,
        settings: {
          ...d.settings,
          rates: { ...d.settings.rates, conduite: 40000 },
        },
      },
      st,
    ),
  ).toMatchObject({ total: 100000, paid: 20000, due: 80000 });
  expect(
    studentAccount(d, {
      ...st,
      paidByStage: { ...st.paidByStage, conduite: 90000 },
    }),
  ).toMatchObject({
    due: 0,
    credit: 15000,
  });
});
test('money is stored in millimes and fractional hours are exact quarters', () => {
  expect(moneyInput('30,125')).toBe(30125);
  expect(hoursInput('1,25')).toBe(75);
  const d = saveHourEntry(
    base(),
    {
      id: 'h',
      studentId: 's',
      type: 'code',
      date: '2026-10-14',
      duration: 45,
      notes: '',
    },
    now,
  );
  expect(
    studentAccount(
      {
        ...d,
        settings: { ...d.settings, rates: { ...blankRates(), code: 30125 } },
      },
      student,
    ).total,
  ).toBe(22594);
  for (const value of ['1e2', '-1', '0', '0.333', '1.24', '1001']) {
    expect(() => hoursInput(value)).toThrow();
  }
  for (const value of ['-1', '1.0001', 'Infinity', '']) {
    expect(() => moneyInput(value)).toThrow();
  }
});
test('correcting a manual entry replaces its hours rather than duplicating them', () => {
  const entry = {
    id: 'h',
    studentId: 's',
    type: 'code' as const,
    date: '2026-10-14',
    duration: 60,
    notes: '',
  };
  const d = saveHourEntry(
    saveHourEntry(base(), entry, now),
    { ...entry, duration: 120 },
    now,
  );
  expect(d.hourEntries).toHaveLength(1);
  expect(studentAccount(d, student).minutes).toBe(120);
  expect(() => saveHourEntry(d, { ...entry, date: '2026-10-16' }, now)).toThrow(
    'futureHoursError',
  );
});
test('v2 migration preserves students and lessons, never invents an amount already paid', () => {
  const old = {
    version: 2,
    students: [
      {
        id: 's',
        name: 'Ines',
        phone: '',
        stage: 'code',
        notes: '',
        archived: false,
      },
    ],
    lessons: [
      {
        id: 'l',
        studentId: 's',
        type: 'code',
        date: '2026-10-14',
        start: '09:00',
        duration: 60,
        status: 'done',
        paid: true,
        notes: '',
      },
    ],
    settings: { school: 'Test', language: 'fr' },
  };
  const migrated = parseBackup(JSON.stringify(old));
  expect(migrated.version).toBe(4);
  expect(migrated.lessons).toEqual(old.lessons);
  expect(migrated.students[0].amountPaid).toBeNull();
  expect(migrated.students[0].rates).toEqual(blankRates());
  expect(parseBackup(JSON.stringify(migrated))).toEqual(migrated);
});
test('rejects corrupt financial and manual-hour backup data', () => {
  const d = base();
  for (const amountPaid of [-1, 1.2, '100']) {
    expect(() =>
      parseBackup(
        JSON.stringify({ ...d, students: [{ ...student, amountPaid }] }),
      ),
    ).toThrow('backupError');
  }
  expect(() =>
    parseBackup(
      JSON.stringify({
        ...d,
        hourEntries: [
          {
            id: 'h',
            studentId: 'missing',
            type: 'code',
            date: '2026-10-14',
            duration: 60,
            notes: '',
          },
        ],
      }),
    ),
  ).toThrow('backupError');
});
