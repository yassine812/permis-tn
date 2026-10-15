import notifee from '@notifee/react-native';
import { Platform } from 'react-native';
import {
  blankPayments,
  blankRates,
  blankResults,
  emptyData,
  parseBackup,
} from '../src/domain';
import {
  defaultReminders,
  planReminders,
  tunisTimestamp,
} from '../src/notificationPlan';
import { parseReminderTarget, syncReminders } from '../src/notifications';

function fixture() {
  const data = emptyData();
  data.settings.reminders = { ...defaultReminders(), enabled: true };
  data.students = [
    {
      id: 's1',
      name: 'Amine',
      phone: '',
      notes: '',
      archived: false,
      stage: 'code',
      rates: blankRates(),
      paidByStage: blankPayments(),
      amountPaid: null,
      examResults: blankResults(),
    },
  ];
  data.lessons = [
    {
      id: 'l1',
      studentId: 's1',
      type: 'code',
      date: '2026-11-02',
      start: '10:00',
      duration: 60,
      paid: false,
      status: 'planned',
      notes: '',
    },
  ];
  return data;
}
const now = tunisTimestamp('2026-11-02', '05:00');
beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Date, 'now').mockReturnValue(now);
  (notifee.getTriggerNotifications as jest.Mock).mockResolvedValue([]);
  (notifee.getDisplayedNotifications as jest.Mock).mockResolvedValue([]);
  (notifee.getNotificationSettings as jest.Mock).mockResolvedValue({
    authorizationStatus: 1,
    android: { alarm: 1 },
  });
});
afterEach(() => jest.restoreAllMocks());

test('6am, 15 minutes before, and the end of the lesson use Tunis time', () => {
  const plan = planReminders(fixture(), now);
  expect(plan.reminders.map(r => new Date(r.timestamp).toISOString())).toEqual([
    '2026-11-02T05:00:00.000Z',
    '2026-11-02T08:45:00.000Z',
    '2026-11-02T10:00:00.000Z',
  ]);
  expect(plan.reminders[0].daily).toBe(true);
  expect(plan.reminders[1].body).toContain('Amine');
});
test('past reminders are not replayed and morning rolls to the next day', () => {
  expect(
    planReminders(
      fixture(),
      tunisTimestamp('2026-11-02', '10:30'),
    ).reminders.map(r => r.kind),
  ).toEqual(['morning', 'after']);
  expect(
    planReminders(fixture(), tunisTimestamp('2026-11-02', '11:00')).reminders[0]
      .timestamp,
  ).toBe(tunisTimestamp('2026-11-03', '06:00'));
});
test('cancellations, archived students and reviewed payments suppress their reminders', () => {
  const data = fixture();
  data.lessons[0].paymentReviewed = true;
  expect(planReminders(data, now).reminders.map(r => r.kind)).toEqual([
    'morning',
    'before',
  ]);
  data.lessons[0].status = 'cancelled';
  expect(planReminders(data, now).reminders).toHaveLength(1);
  data.lessons[0].status = 'planned';
  data.students[0].archived = true;
  expect(planReminders(data, now).reminders).toHaveLength(1);
});
test('queue preserves daily reminder and the nearest 49 lesson reminders', () => {
  const data = fixture();
  data.lessons = Array.from({ length: 40 }, (_, i) => ({
    ...data.lessons[0],
    id: `l${i}`,
    date: new Date(Date.UTC(2026, 10, 2 + i)).toISOString().slice(0, 10),
  }));
  const plan = planReminders(data, now);
  expect(plan.reminders).toHaveLength(50);
  expect(plan.omitted).toBe(31);
  expect(plan.reminders[1].lessonId).toBe('l0');
});
test('old backups default to reminders off; preferences and review survive export', () => {
  expect(
    parseBackup(JSON.stringify(emptyData())).settings.reminders,
  ).toBeUndefined();
  const data = fixture();
  data.lessons[0].paymentReviewed = true;
  expect(parseBackup(JSON.stringify(data))).toEqual(data);
  expect(() =>
    parseBackup(
      JSON.stringify({
        ...data,
        settings: { ...data.settings, reminders: { enabled: 'yes' } },
      }),
    ),
  ).toThrow();
});
test('sync cancels removed alarms, creates desired ones and avoids unchanged duplicates', async () => {
  const data = fixture();
  (notifee.getTriggerNotifications as jest.Mock).mockResolvedValue([
    { notification: { id: 'ptn-before-deleted' } },
  ]);
  expect((await syncReminders(data)).count).toBe(3);
  expect(notifee.cancelTriggerNotifications).toHaveBeenCalledWith([
    'ptn-before-deleted',
  ]);
  const created = (
    notifee.createTriggerNotification as jest.Mock
  ).mock.calls.map(([notification]) => ({ notification }));
  (notifee.getTriggerNotifications as jest.Mock).mockResolvedValue(created);
  (notifee.createTriggerNotification as jest.Mock).mockClear();
  await syncReminders(data);
  expect(notifee.createTriggerNotification).not.toHaveBeenCalled();
});
test('denied permissions never silently report scheduled reminders', async () => {
  (notifee.getNotificationSettings as jest.Mock).mockResolvedValue({
    authorizationStatus: 0,
    android: { alarm: 0 },
  });
  expect((await syncReminders(fixture())).status).toBe('denied');
  expect(notifee.createTriggerNotification).not.toHaveBeenCalled();
});
test('Android exact alarm access is checked before scheduling', async () => {
  const previous = Platform.OS;
  Platform.OS = 'android';
  try {
    (notifee.getNotificationSettings as jest.Mock).mockResolvedValue({
      authorizationStatus: 1,
      android: { alarm: 0 },
    });
    expect((await syncReminders(fixture())).status).toBe('alarm');
    expect(notifee.createTriggerNotification).not.toHaveBeenCalled();
  } finally {
    Platform.OS = previous;
  }
});
test('disabled reminders cancel the queue; routing ignores invalid payloads', async () => {
  expect((await syncReminders(emptyData())).status).toBe('off');
  expect(notifee.cancelAllNotifications).toHaveBeenCalled();
  expect(parseReminderTarget({ kind: 'after', lessonId: 'l1' })).toEqual({
    kind: 'after',
    lessonId: 'l1',
  });
  expect(parseReminderTarget({ kind: 'after', lessonId: 123 })).toBeNull();
});
test('refresh after delivery does not dismiss the reminder the user has not read', async () => {
  jest
    .spyOn(Date, 'now')
    .mockReturnValue(tunisTimestamp('2026-11-02', '09:46'));
  const notification = {
    id: 'ptn-before-l1',
    data: { kind: 'before', lessonId: 'l1' },
  };
  (notifee.getTriggerNotifications as jest.Mock).mockResolvedValue([
    { notification },
  ]);
  (notifee.getDisplayedNotifications as jest.Mock).mockResolvedValue([
    { id: notification.id, notification },
  ]);
  await syncReminders(fixture());
  expect(notifee.cancelTriggerNotifications).toHaveBeenCalledWith([
    'ptn-before-l1',
  ]);
  expect(notifee.cancelNotification).not.toHaveBeenCalled();
  const cancelled = fixture();
  cancelled.lessons[0].status = 'cancelled';
  await syncReminders(cancelled);
  expect(notifee.cancelNotification).toHaveBeenCalledWith('ptn-before-l1');
});
