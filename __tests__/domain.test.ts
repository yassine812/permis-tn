import {
  advanceStudent,
  blankPayments,
  blankResults,
  emptyData,
  isDate,
  Lesson,
  monthDays,
  parseBackup,
  saveLesson,
  saveStudent,
  shiftMonth,
  Student,
  totals,
  tunisNow,
} from '../src/domain';
const student: Student = {
  id: 's1',
  name: 'Amine Ben Salah',
  phone: '+21622123456',
  stage: 'code',
  notes: '',
  archived: false,
  rates: { code: null, conduite: null, manoeuvre: null },
  amountPaid: 0,
  paidByStage: blankPayments(),
  examResults: blankResults(),
};
const base = () => saveStudent(emptyData(), student);
const lesson = (overrides: Partial<Lesson> = {}): Lesson => ({
  id: 'l1',
  studentId: 's1',
  date: '2026-01-10',
  start: '09:00',
  duration: 60,
  paid: false,
  type: 'conduite',
  status: 'done',
  notes: '',
  ...overrides,
});
const now = new Date('2026-01-15T12:00:00Z');

test('new students always start at Code; progression stops at Manœuvre', () => {
  let data = saveStudent(emptyData(), { ...student, stage: 'manoeuvre' });
  expect(data.students[0].stage).toBe('code');
  data = advanceStudent(data, student.id);
  expect(data.students[0].stage).toBe('conduite');
  data = advanceStudent(data, student.id);
  data = advanceStudent(data, student.id);
  expect(data.students[0].stage).toBe('manoeuvre');
});
test('validates names and Tunisian phone numbers', () => {
  expect(() =>
    saveStudent(base(), { ...student, phone: '+33123456789' }),
  ).toThrow('phoneError');
  expect(() => saveStudent(base(), { ...student, name: '   ' })).toThrow(
    'nameError',
  );
  expect(
    saveStudent(base(), { ...student, phone: '22 123 456' }).students[0].phone,
  ).toBe('22123456');
});
test('counts only completed hours, separated by the manual paid flag', () => {
  expect(
    totals([
      lesson({ duration: 90, paid: true }),
      lesson({ id: 'l2', paid: false, duration: 45 }),
      lesson({ id: 'l3', status: 'planned', paid: true }),
      lesson({ id: 'l4', status: 'cancelled', paid: false }),
    ]),
  ).toEqual({ minutes: 135, paidMinutes: 90, unpaidMinutes: 45, planned: 1 });
});
test('payment flag can be changed in either direction without changing hours', () => {
  let data = saveLesson(base(), lesson({ paid: false }), now);
  expect(totals(data.lessons).unpaidMinutes).toBe(60);
  data = saveLesson(data, { ...data.lessons[0], paid: true }, now);
  expect(totals(data.lessons)).toMatchObject({
    minutes: 60,
    paidMinutes: 60,
    unpaidMinutes: 0,
  });
  data = saveLesson(data, { ...data.lessons[0], paid: false }, now);
  expect(totals(data.lessons).unpaidMinutes).toBe(60);
});
test('detects overlaps across students, allows touching intervals and editing itself', () => {
  let data = saveStudent(base(), { ...student, id: 's2', name: 'Ines' });
  data = saveLesson(data, lesson(), now);
  expect(() =>
    saveLesson(
      data,
      lesson({ id: 'l2', studentId: 's2', start: '09:30' }),
      now,
    ),
  ).toThrow('overlapError');
  expect(saveLesson(data, lesson({ paid: true }), now).lessons).toHaveLength(1);
  expect(
    saveLesson(data, lesson({ id: 'l2', start: '10:00' }), now).lessons,
  ).toHaveLength(2);
});
test('cancelled lessons free the slot and never count as completed or unpaid hours', () => {
  const data = saveLesson(
    base(),
    lesson({ status: 'cancelled', paid: true }),
    now,
  );
  expect(saveLesson(data, lesson({ id: 'l2' }), now).lessons).toHaveLength(2);
  expect(totals(data.lessons)).toEqual({
    minutes: 0,
    paidMinutes: 0,
    unpaidMinutes: 0,
    planned: 0,
  });
});
test('cannot complete a future lesson or one before its end in Tunis', () => {
  expect(() => saveLesson(base(), lesson({ date: '2026-01-16' }), now)).toThrow(
    'futureError',
  );
  expect(() =>
    saveLesson(base(), lesson({ date: '2026-01-15', start: '12:30' }), now),
  ).toThrow('futureError');
  expect(
    saveLesson(base(), lesson({ date: '2026-01-15', start: '12:00' }), now)
      .lessons,
  ).toHaveLength(1);
});
test('uses Tunis date even at UTC midnight boundaries', () => {
  expect(tunisNow(new Date('2026-01-10T23:30:00Z'))).toEqual({
    date: '2026-01-11',
    time: '00:30',
  });
});
test('validates dates, duration, missing students and end of day', () => {
  expect(isDate('2026-02-30')).toBe(false);
  expect(isDate('2028-02-29')).toBe(true);
  for (const override of [
    { duration: 0 },
    { duration: 17 },
    { duration: 600 },
    { start: '23:30', duration: 60 },
  ]) {
    expect(() => saveLesson(base(), lesson(override), now)).toThrow(
      'durationError',
    );
  }
  expect(() => saveLesson(base(), lesson({ start: '24:00' }), now)).toThrow(
    'timeError',
  );
  expect(() =>
    saveLesson(base(), lesson({ studentId: 'missing' }), now),
  ).toThrow('studentError');
});
test('calendar is Monday-first and handles leap years and year boundaries', () => {
  expect(monthDays('2026-06')[0]).toBe('2026-06-01');
  expect(monthDays('2028-02').filter(Boolean)).toHaveLength(29);
  expect(monthDays('2026-10').length % 7).toBe(0);
  expect(shiftMonth('2026-12', 1)).toBe('2027-01');
  expect(shiftMonth('2026-01', -1)).toBe('2025-12');
});
test('backup preserves lesson history and student accounting', () => {
  const data = saveLesson(base(), lesson({ paid: true }), now);
  expect(parseBackup(JSON.stringify(data))).toEqual(data);
  expect(parseBackup(JSON.stringify(data)).students[0].amountPaid).toBe(0);
});
test('rejects malformed backups, orphans, duplicate IDs and non-boolean payment', () => {
  for (const value of [
    null,
    {},
    { ...base(), version: 1 },
    { ...base(), students: [student, student] },
    { ...base(), lessons: [lesson({ studentId: 'missing' })] },
    { ...base(), lessons: [{ ...lesson(), paid: 30 }] },
    { ...base(), lessons: [lesson(), lesson({ id: 'l2', start: '09:30' })] },
  ]) {
    expect(() => parseBackup(JSON.stringify(value))).toThrow('backupError');
  }
});
