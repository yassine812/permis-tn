import type { ReminderPreferences } from './notificationPlan';
export const stages = ['code', 'conduite', 'manoeuvre'] as const;
export type Stage = (typeof stages)[number];
export type Language = 'fr' | 'ar';
export type Status = 'planned' | 'done' | 'cancelled';
export const examStatuses = ['notTaken', 'passed', 'failed'] as const;
export type ExamStatus = (typeof examStatuses)[number];
export const blankPayments = () => ({ code: 0, conduite: 0, manoeuvre: 0 });
export const blankResults = (): Record<Stage, ExamStatus> => ({
  code: 'notTaken',
  conduite: 'notTaken',
  manoeuvre: 'notTaken',
});
export type Student = {
  id: string;
  name: string;
  phone: string;
  stage: Stage;
  notes: string;
  archived: boolean;
  hourlyRate?: number | null; // One candidate-specific price for all three stages.
  portalEnabled?: boolean;
  rates: Record<Stage, number | null>; // Preserved pre-v4 prices, for backup history only.
  amountPaid: number | null; // Legacy payment not yet allocated to a category.
  paidByStage: Record<Stage, number>;
  examResults: Record<Stage, ExamStatus>;
};
export type HourEntry = {
  id: string;
  studentId: string;
  type: Stage;
  date: string;
  duration: number;
  notes: string;
  paid?: boolean;
  paidAmount?: number; // Millimes actually received; fixed when the tariff changes.
};
export const blankRates = (): Student['rates'] => ({
  code: null,
  conduite: null,
  manoeuvre: null,
});
export type Lesson = {
  id: string;
  studentId: string;
  type: Stage;
  date: string;
  start: string;
  duration: number;
  paid: boolean;
  paidAmount?: number;
  paymentReviewed?: boolean;
  status: Status;
  notes: string;
};
export type Data = {
  version: 4;
  students: Student[];
  lessons: Lesson[];
  hourEntries: HourEntry[];
  settings: {
    school: string;
    language: Language;
    rates: Record<Stage, number | null>;
    reminders?: ReminderPreferences;
  };
};
export class ValidationError extends Error {}
export const emptyData = (): Data => ({
  version: 4,
  students: [],
  lessons: [],
  hourEntries: [],
  settings: {
    school: 'Mon auto-école',
    language: 'fr',
    rates: blankRates(),
  },
});
export const uid = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
export function tunisNow(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Tunis',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const get = (type: string) => parts.find(p => p.type === type)!.value;
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    time: `${get('hour')}:${get('minute')}`,
  };
}
export function isDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const date = new Date(`${value}T12:00:00Z`);
  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value &&
    +value.slice(0, 4) >= 2000 &&
    +value.slice(0, 4) <= 2100
  );
}
export function minutes(value: string) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) {
    throw new ValidationError('timeError');
  }
  return Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
}
export const hours = (value: number) =>
  Number((value / 60).toFixed(2))
    .toString()
    .replace('.', ',');
export function validateStudent(student: Student) {
  if (
    student.portalEnabled !== undefined &&
    typeof student.portalEnabled !== 'boolean'
  ) {
    throw new ValidationError('dataError');
  }
  if (student.hourlyRate !== undefined && student.hourlyRate !== null) {
    validateMoney(student.hourlyRate);
  }
  for (const stage of stages) {
    if (
      !Number.isSafeInteger(student.paidByStage?.[stage]) ||
      student.paidByStage[stage] < 0 ||
      student.paidByStage[stage] > 999999999 ||
      !examStatuses.includes(student.examResults?.[stage])
    ) {
      throw new ValidationError('dataError');
    }
    const rate = student.rates?.[stage];
    if (
      rate !== null &&
      (!Number.isSafeInteger(rate) || rate < 0 || rate > 999999999)
    ) {
      throw new ValidationError('moneyError');
    }
  }
  if (
    student.amountPaid !== null &&
    (!Number.isSafeInteger(student.amountPaid) ||
      student.amountPaid < 0 ||
      student.amountPaid > 999999999)
  ) {
    throw new ValidationError('moneyError');
  }
  if (!student.name.trim() || student.name.length > 100) {
    throw new ValidationError('nameError');
  }
  if (
    student.phone &&
    !/^(\+216)?[24579]\d{7}$/.test(student.phone.replace(/\s/g, ''))
  ) {
    throw new ValidationError('phoneError');
  }
  if (!stages.includes(student.stage) || student.notes.length > 2000) {
    throw new ValidationError('dataError');
  }
}
export function saveStudent(data: Data, student: Student): Data {
  validateStudent(student);
  const normalized = {
    ...student,
    name: student.name.trim(),
    phone: student.phone.replace(/\s/g, ''),
  };
  return {
    ...data,
    students: data.students.some(s => s.id === student.id)
      ? data.students.map(s => (s.id === student.id ? normalized : s))
      : [...data.students, { ...normalized, stage: 'code' }],
  };
}
export function advanceStudent(data: Data, id: string): Data {
  return {
    ...data,
    students: data.students.map(s =>
      s.id === id
        ? { ...s, stage: stages[Math.min(2, stages.indexOf(s.stage) + 1)] }
        : s,
    ),
  };
}
export function setExamResult(
  data: Data,
  id: string,
  stage: Stage,
  result: ExamStatus,
): Data {
  const student = data.students.find(s => s.id === id);
  if (!student || !stages.includes(stage) || !examStatuses.includes(result)) {
    throw new ValidationError('dataError');
  }
  const updated = {
    ...student,
    examResults: { ...student.examResults, [stage]: result },
  };
  // Correcting a previously passed exam returns the student to that category.
  if (
    result !== 'passed' &&
    student.examResults[stage] === 'passed' &&
    stages.indexOf(stage) < stages.indexOf(student.stage)
  ) {
    updated.stage = stage;
  }
  if (result === 'passed') {
    updated.stage =
      stages[
        Math.max(
          stages.indexOf(updated.stage),
          Math.min(stages.length - 1, stages.indexOf(stage) + 1),
        )
      ];
  }
  updated.stage = progressStage(updated);
  return saveStudent(data, updated);
}
export const isCompleted = (student: Student) =>
  stages.every(stage => student.examResults[stage] === 'passed');
export function progressStage(student: Student): Stage {
  let index = stages.indexOf(student.stage);
  while (
    index < stages.length - 1 &&
    student.examResults[stages[index]] === 'passed'
  ) {
    index++;
  }
  return stages[index];
}
export function validateRates(rates: Data['settings']['rates']) {
  for (const stage of stages) {
    const rate = rates?.[stage];
    if (
      rate !== null &&
      (!Number.isSafeInteger(rate) || rate < 0 || rate > 999999999)
    ) {
      throw new ValidationError('moneyError');
    }
  }
}
export function validateLesson(lesson: Lesson) {
  validateEntryPayment(lesson);
  if (!isDate(lesson.date)) {
    throw new ValidationError('dateError');
  }
  const start = minutes(lesson.start);
  if (
    !Number.isInteger(lesson.duration) ||
    lesson.duration < 15 ||
    lesson.duration > 480 ||
    lesson.duration % 15 ||
    start + lesson.duration > 1440
  ) {
    throw new ValidationError('durationError');
  }
  if (typeof lesson.paid !== 'boolean') {
    throw new ValidationError('paymentError');
  }
  if (
    lesson.paymentReviewed !== undefined &&
    typeof lesson.paymentReviewed !== 'boolean'
  ) {
    throw new ValidationError('paymentError');
  }
  if (
    !stages.includes(lesson.type) ||
    !['planned', 'done', 'cancelled'].includes(lesson.status) ||
    lesson.notes.length > 2000
  ) {
    throw new ValidationError('dataError');
  }
}
export function saveLesson(data: Data, lesson: Lesson, now = new Date()): Data {
  validateLesson(lesson);
  const student = data.students.find(s => s.id === lesson.studentId);
  if (
    !student ||
    (student.archived && !data.lessons.some(l => l.id === lesson.id))
  ) {
    throw new ValidationError('studentError');
  }
  const start = minutes(lesson.start);
  const conflict = data.lessons.find(
    l =>
      l.id !== lesson.id &&
      l.status !== 'cancelled' &&
      lesson.status !== 'cancelled' &&
      l.date === lesson.date &&
      start < minutes(l.start) + l.duration &&
      start + lesson.duration > minutes(l.start),
  );
  if (conflict) {
    throw new ValidationError('overlapError');
  }
  const current = tunisNow(now);
  if (
    lesson.status === 'done' &&
    (lesson.date > current.date ||
      (lesson.date === current.date &&
        start + lesson.duration > minutes(current.time)))
  ) {
    throw new ValidationError('futureError');
  }
  return {
    ...data,
    lessons: data.lessons.some(l => l.id === lesson.id)
      ? data.lessons.map(l => (l.id === lesson.id ? lesson : l))
      : [...data.lessons, lesson],
  };
}
export function totals(lessons: Lesson[]) {
  const done = lessons.filter(l => l.status === 'done');
  const active = lessons.filter(l => l.status !== 'cancelled');
  return {
    minutes: done.reduce((sum, l) => sum + l.duration, 0),
    paidMinutes: done
      .filter(l => l.paid)
      .reduce((sum, l) => sum + l.duration, 0),
    unpaidMinutes: done
      .filter(l => !l.paid)
      .reduce((sum, l) => sum + l.duration, 0),
    planned: active.filter(l => l.status === 'planned').length,
  };
}
export function monthDays(month: string): (string | null)[] {
  const [year, m] = month.split('-').map(Number);
  const first = new Date(Date.UTC(year, m - 1, 1));
  const offset = (first.getUTCDay() + 6) % 7;
  const count = new Date(Date.UTC(year, m, 0)).getUTCDate();
  const cells: (string | null)[] = Array(offset).fill(null);
  for (let day = 1; day <= count; day++) {
    cells.push(`${month}-${String(day).padStart(2, '0')}`);
  }
  while (cells.length % 7) {
    cells.push(null);
  }
  return cells;
}
export function shiftMonth(month: string, delta: number) {
  const [year, m] = month.split('-').map(Number);
  return new Date(Date.UTC(year, m - 1 + delta, 1)).toISOString().slice(0, 7);
}
export function dateLabel(date: string, language: Language, monthOnly = false) {
  return new Intl.DateTimeFormat(
    language === 'fr' ? 'fr-TN' : 'ar-TN',
    monthOnly
      ? { month: 'long', year: 'numeric', timeZone: 'Africa/Tunis' }
      : {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          timeZone: 'Africa/Tunis',
        },
  ).format(new Date(`${date}T12:00:00Z`));
}
// Backups are untrusted input. Validate the whole document before replacing any local data.
export function parseBackup(raw: string): Data {
  try {
    if (raw.length > 10_000_000) {
      throw new Error();
    }
    const d = JSON.parse(raw);
    if (
      d?.version === 2 &&
      Array.isArray(d.students) &&
      Array.isArray(d.lessons)
    ) {
      d.students = d.students.map((student: Student) => ({
        ...student,
        rates: blankRates(),
        amountPaid: d.lessons.some(
          (l: Lesson) =>
            l.studentId === student.id && l.paid && l.status !== 'cancelled',
        )
          ? null
          : 0,
      }));
      d.hourEntries = [];
      d.version = 3;
    }
    if (d?.version === 3 && Array.isArray(d.students) && d.settings) {
      // Adopt a previous rate only when every recorded non-empty rate agrees.
      const rates = blankRates();
      for (const stage of stages) {
        const previous = [
          ...new Set(
            d.students
              .map((s: Student) => s.rates?.[stage])
              .filter((v: unknown) => v !== null),
          ),
        ];
        if (previous.length === 1) {
          rates[stage] = previous[0] as number;
        }
      }
      d.settings.rates = rates;
      d.students = d.students.map((s: Student) => ({
        ...s,
        paidByStage: blankPayments(),
        examResults: blankResults(),
      }));
      d.version = 4;
    }
    if (
      d.version !== 4 ||
      !Array.isArray(d.students) ||
      !Array.isArray(d.lessons) ||
      !Array.isArray(d.hourEntries) ||
      !d.settings ||
      typeof d.settings.school !== 'string' ||
      d.settings.school.length > 100 ||
      !['fr', 'ar'].includes(d.settings.language)
    ) {
      throw new Error();
    }
    validateRates(d.settings.rates);
    if (
      d.settings.reminders !== undefined &&
      (!d.settings.reminders ||
        ['enabled', 'morning', 'before', 'after'].some(
          key => typeof d.settings.reminders[key] !== 'boolean',
        ))
    ) {
      throw new Error();
    }
    const studentIds = new Set<string>();
    for (const s of d.students) {
      if (
        typeof s.id !== 'string' ||
        !s.id ||
        studentIds.has(s.id) ||
        typeof s.name !== 'string' ||
        typeof s.phone !== 'string' ||
        typeof s.notes !== 'string' ||
        typeof s.archived !== 'boolean'
      ) {
        throw new Error();
      }
      validateStudent(s);
      studentIds.add(s.id);
    }
    const lessonIds = new Set<string>();
    for (const l of d.lessons) {
      if (
        typeof l.id !== 'string' ||
        !l.id ||
        lessonIds.has(l.id) ||
        !studentIds.has(l.studentId) ||
        typeof l.date !== 'string' ||
        typeof l.start !== 'string' ||
        typeof l.notes !== 'string'
      ) {
        throw new Error();
      }
      validateLesson(l);
      if (
        l.paymentReviewed !== undefined &&
        typeof l.paymentReviewed !== 'boolean'
      ) {
        throw new Error();
      }
      lessonIds.add(l.id);
    }
    const active = d.lessons
      .filter((l: Lesson) => l.status !== 'cancelled')
      .sort(
        (a: Lesson, b: Lesson) =>
          a.date.localeCompare(b.date) || a.start.localeCompare(b.start),
      );
    for (let i = 1; i < active.length; i++) {
      if (
        active[i].date === active[i - 1].date &&
        minutes(active[i].start) <
          minutes(active[i - 1].start) + active[i - 1].duration
      ) {
        throw new Error();
      }
    }
    const entryIds = new Set<string>();
    for (const entry of d.hourEntries) {
      if (!studentIds.has(entry.studentId) || entryIds.has(entry.id)) {
        throw new Error();
      }
      validateHourEntry(entry);
      entryIds.add(entry.id);
    }
    return {
      version: 4,
      students: d.students.map((student: Student) => ({
        ...student,
        stage: progressStage(student),
      })),
      hourEntries: d.hourEntries,
      lessons: d.lessons.map((l: Lesson) => ({
        id: l.id,
        studentId: l.studentId,
        type: l.type,
        date: l.date,
        start: l.start,
        duration: l.duration,
        paid: l.paid,
        ...(l.paidAmount !== undefined ? { paidAmount: l.paidAmount } : {}),
        ...(l.paymentReviewed !== undefined
          ? { paymentReviewed: l.paymentReviewed }
          : {}),
        status: l.status,
        notes: l.notes,
      })),
      settings: {
        school: d.settings.school,
        language: d.settings.language,
        rates: d.settings.rates,
        ...(d.settings.reminders ? { reminders: d.settings.reminders } : {}),
      },
    };
  } catch {
    throw new ValidationError('backupError');
  }
}

export function moneyInput(value: string): number {
  const clean = value.trim().replace(',', '.');
  if (!/^\d{1,6}(\.\d{1,3})?$/.test(clean)) {
    throw new ValidationError('moneyError');
  }
  const [whole, fraction = ''] = clean.split('.');
  return Number(whole) * 1000 + Number(fraction.padEnd(3, '0'));
}
export const amountText = (value: number | null) =>
  value === null ? '' : (value / 1000).toFixed(3);
function validateMoney(value: number) {
  if (!Number.isSafeInteger(value) || value < 0 || value > 999999999) {
    throw new ValidationError('moneyError');
  }
}
function validateEntryPayment(entry: { paid?: boolean; paidAmount?: number }) {
  if (entry.paid !== undefined && typeof entry.paid !== 'boolean') {
    throw new ValidationError('paymentError');
  }
  if (entry.paidAmount !== undefined) {
    validateMoney(entry.paidAmount);
    if (!entry.paid && entry.paidAmount !== 0) {
      throw new ValidationError('paymentError');
    }
  }
}
export function paymentFields(
  entry: { duration: number; paid?: boolean; paidAmount?: number },
  paid: boolean,
  rate: number | null | undefined,
) {
  if (rate === null || rate === undefined) {
    throw new ValidationError('candidateRateRequired');
  }
  validateMoney(rate);
  // Old flags were informational: existing manually entered receipts already cover them.
  const paidAmount = !paid
    ? 0
    : entry.paid
    ? entry.paidAmount ?? 0
    : Math.round((entry.duration * rate) / 60);
  validateMoney(paidAmount);
  return { paid, paidAmount, paymentReviewed: true };
}
export function setLessonPayment(
  data: Data,
  lesson: Lesson,
  paid: boolean,
): Data {
  const student = data.students.find(s => s.id === lesson.studentId);
  return saveLesson(data, {
    ...lesson,
    ...paymentFields(
      lesson,
      paid,
      student?.hourlyRate ?? data.settings.rates[lesson.type],
    ),
  });
}
export const money = (value: number | null, language: Language = 'fr') =>
  value === null
    ? '—'
    : `${(value / 1000).toLocaleString(language === 'fr' ? 'fr-TN' : 'ar-TN', {
        minimumFractionDigits: 3,
        maximumFractionDigits: 3,
      })} ${language === 'fr' ? 'DT' : 'د.ت'}`;
export function hoursInput(value: string): number {
  const clean = value.trim().replace(',', '.');
  if (!/^\d{1,4}(\.\d{1,2})?$/.test(clean)) {
    throw new ValidationError('hoursError');
  }
  const duration = Math.round(Number(clean) * 60);
  if (duration < 15 || duration > 60000 || duration % 15) {
    throw new ValidationError('hoursError');
  }
  return duration;
}
export function validateHourEntry(entry: HourEntry) {
  validateEntryPayment(entry);
  if (
    typeof entry.id !== 'string' ||
    !entry.id ||
    !stages.includes(entry.type) ||
    typeof entry.notes !== 'string' ||
    entry.notes.length > 2000 ||
    !isDate(entry.date) ||
    !Number.isInteger(entry.duration) ||
    entry.duration < 15 ||
    entry.duration > 60000 ||
    entry.duration % 15
  ) {
    throw new ValidationError('hoursError');
  }
}
export function saveHourEntry(
  data: Data,
  entry: HourEntry,
  now = new Date(),
): Data {
  validateHourEntry(entry);
  const student = data.students.find(s => s.id === entry.studentId);
  if (
    !student ||
    (student.archived && !data.hourEntries.some(e => e.id === entry.id))
  ) {
    throw new ValidationError('studentError');
  }
  if (entry.date > tunisNow(now).date) {
    throw new ValidationError('futureHoursError');
  }
  return {
    ...data,
    hourEntries: data.hourEntries.some(e => e.id === entry.id)
      ? data.hourEntries.map(e => (e.id === entry.id ? entry : e))
      : [...data.hourEntries, entry],
  };
}
export function studentAccount(data: Data, student: Student) {
  const byStage = stages.map(stage => {
    const duration =
      data.lessons
        .filter(
          l =>
            l.studentId === student.id &&
            l.type === stage &&
            l.status === 'done',
        )
        .reduce((sum, l) => sum + l.duration, 0) +
      data.hourEntries
        .filter(e => e.studentId === student.id && e.type === stage)
        .reduce((sum, e) => sum + e.duration, 0);
    const rate = student.hourlyRate ?? data.settings.rates[stage];
    const total =
      duration === 0
        ? 0
        : rate === null
        ? null
        : Math.round((duration * rate) / 60);
    const recordedPaid = [...data.hourEntries, ...data.lessons]
      .filter(e => e.studentId === student.id && e.type === stage)
      .reduce((sum, e) => sum + (e.paidAmount ?? 0), 0);
    const paid = student.paidByStage[stage] + recordedPaid;
    return {
      stage,
      minutes: duration,
      rate,
      total,
      paid,
      recordedPaid,
      due: total === null ? null : Math.max(0, total - paid),
      credit: total === null ? null : Math.max(0, paid - total),
    };
  });
  const total = byStage.some(row => row.total === null)
    ? null
    : byStage.reduce((sum, row) => sum + row.total!, 0);
  const paid =
    student.amountPaid === null
      ? null
      : student.amountPaid + byStage.reduce((sum, row) => sum + row.paid, 0);
  const balance =
    total === null || paid === null
      ? null
      : byStage.reduce((sum, row) => sum + row.due!, 0) - student.amountPaid!;
  return {
    byStage,
    minutes: byStage.reduce((sum, row) => sum + row.minutes, 0),
    total,
    paid,
    due: balance === null ? null : Math.max(0, balance),
    credit:
      balance === null
        ? null
        : byStage.reduce((sum, row) => sum + row.credit!, 0) +
          Math.max(0, -balance),
  };
}
