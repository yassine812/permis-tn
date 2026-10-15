import { Data, tunisNow } from './domain';
import { translate } from './i18n';
export type ReminderPreferences = {
  enabled: boolean;
  morning: boolean;
  before: boolean;
  after: boolean;
};
export const defaultReminders = (): ReminderPreferences => ({
  enabled: false,
  morning: true,
  before: true,
  after: true,
});
export type ReminderTarget = {
  kind: 'morning' | 'before' | 'after';
  lessonId?: string;
};
export type PlannedReminder = ReminderTarget & {
  id: string;
  timestamp: number;
  title: string;
  body: string;
  daily?: boolean;
};
export type ReminderState = {
  status: 'off' | 'ready' | 'denied' | 'alarm' | 'web';
  count: number;
  omitted: number;
  until?: number;
};
// All lesson times belong to Tunisia (UTC+1), independent of phone timezone.
export const tunisTimestamp = (day: string, time: string) =>
  Date.parse(`${day}T${time}:00+01:00`);
export function planReminders(data: Data, now = Date.now(), limit = 50) {
  const preferences = data.settings.reminders ?? defaultReminders();
  const reminders: PlannedReminder[] = [];
  if (!preferences.enabled) {
    return { reminders, omitted: 0 };
  }
  const t = (key: Parameters<typeof translate>[1]) =>
    translate(data.settings.language, key);
  if (preferences.morning) {
    let timestamp = tunisTimestamp(tunisNow(new Date(now)).date, '06:00');
    if (timestamp <= now) {
      timestamp += 86400000;
    }
    reminders.push({
      id: 'ptn-morning',
      kind: 'morning',
      timestamp,
      daily: true,
      title: t('morningTitle'),
      body: t('morningBody'),
    });
  }
  const lessons: PlannedReminder[] = [];
  for (const lesson of data.lessons) {
    const student = data.students.find(s => s.id === lesson.studentId);
    if (!student || student.archived || lesson.status === 'cancelled') {
      continue;
    }
    const start = tunisTimestamp(lesson.date, lesson.start);
    const before = start - 15 * 60000;
    const end = start + lesson.duration * 60000;
    if (preferences.before && lesson.status === 'planned' && before > now) {
      lessons.push({
        id: `ptn-before-${lesson.id}`,
        kind: 'before',
        lessonId: lesson.id,
        timestamp: before,
        title: t('beforeTitle'),
        body: `${lesson.start} · ${student.name} · ${t(lesson.type)}`,
      });
    }
    if (
      preferences.after &&
      (!lesson.paymentReviewed || !lesson.paid) &&
      end > now
    ) {
      lessons.push({
        id: `ptn-after-${lesson.id}`,
        kind: 'after',
        lessonId: lesson.id,
        timestamp: end,
        title: t('afterTitle'),
        body: `${student.name} · ${t(lesson.type)}. ${t('afterBody')}`,
      });
    }
  }
  lessons.sort((a, b) => a.timestamp - b.timestamp || a.id.localeCompare(b.id));
  const capacity = Math.max(0, limit - reminders.length);
  return {
    reminders: [...reminders, ...lessons.slice(0, capacity)],
    omitted: Math.max(0, lessons.length - capacity),
  };
}
