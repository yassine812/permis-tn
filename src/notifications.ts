import notifee, {
  AndroidImportance,
  AndroidNotificationSetting,
  AuthorizationStatus,
  EventType,
  RepeatFrequency,
  TriggerType,
} from '@notifee/react-native';
import { Platform } from 'react-native';
import { Data } from './domain';
import {
  planReminders,
  ReminderTarget,
  ReminderState,
} from './notificationPlan';
const channelId = 'permis-reminders';
let pending: Promise<unknown> = Promise.resolve();
let pendingOpen: ReminderTarget | null = null;
const openListeners = new Set<(target: ReminderTarget) => void>();
export function receiveReminderOpen(target: ReminderTarget) {
  if (!openListeners.size) {
    pendingOpen = target;
  } else {
    openListeners.forEach(listener => listener(target));
  }
}
export async function requestReminderPermission() {
  return (
    (await notifee.requestPermission()).authorizationStatus >=
    AuthorizationStatus.AUTHORIZED
  );
}
export const openReminderSettings = () => notifee.openNotificationSettings();
export const openExactAlarmSettings = () =>
  notifee.openAlarmPermissionSettings();
export function syncReminders(data: Data): Promise<ReminderState> {
  const task = pending.catch(() => undefined).then(() => reconcile(data));
  pending = task;
  return task;
}
async function reconcile(data: Data): Promise<ReminderState> {
  const plan = planReminders(data);
  if (!data.settings.reminders?.enabled) {
    await notifee.cancelAllNotifications();
    return { status: 'off', count: 0, omitted: 0 };
  }
  const permission = await notifee.getNotificationSettings();
  if (permission.authorizationStatus < AuthorizationStatus.AUTHORIZED) {
    await notifee.cancelAllNotifications();
    return { status: 'denied', count: 0, omitted: 0 };
  }
  if (
    Platform.OS === 'android' &&
    permission.android.alarm === AndroidNotificationSetting.DISABLED
  ) {
    await notifee.cancelTriggerNotifications();
    return { status: 'alarm', count: 0, omitted: 0 };
  }
  await notifee.createChannel({
    id: channelId,
    name: 'Rappels · Permis TN',
    importance: AndroidImportance.HIGH,
    sound: 'default',
  });
  if (
    Platform.OS === 'android' &&
    (await notifee.isChannelBlocked(channelId))
  ) {
    return { status: 'denied', count: 0, omitted: 0 };
  }
  const existing = await notifee.getTriggerNotifications();
  const wanted = new Set(plan.reminders.map(r => r.id));
  for (const item of existing) {
    if (
      item.notification.id?.startsWith('ptn-') &&
      !wanted.has(item.notification.id)
    ) {
      // Remove only the alarm: delivery can race with queue refresh, and the
      // newly displayed reminder must remain visible until the user reads it.
      await notifee.cancelTriggerNotifications([item.notification.id]);
    }
  }
  for (const item of await notifee.getDisplayedNotifications()) {
    const target = parseReminderTarget(item.notification.data);
    if (!target?.lessonId) {
      continue;
    }
    const lesson = data.lessons.find(l => l.id === target.lessonId);
    const student = data.students.find(s => s.id === lesson?.studentId);
    const replacement = plan.reminders.find(r => r.id === item.notification.id);
    if (
      item.id &&
      (!lesson ||
        !student ||
        student.archived ||
        lesson.status === 'cancelled' ||
        (target.kind === 'before' && lesson.status === 'done') ||
        (replacement &&
          JSON.stringify(replacement) !== item.notification.data?.signature) ||
        (target.kind === 'after' && lesson.paymentReviewed))
    ) {
      await notifee.cancelNotification(item.id);
    }
  }
  for (const reminder of plan.reminders) {
    const signature = JSON.stringify(reminder);
    if (
      existing.some(
        n =>
          n.notification.id === reminder.id &&
          n.notification.data?.signature === signature,
      )
    ) {
      continue;
    }
    await notifee.createTriggerNotification(
      {
        id: reminder.id,
        title: reminder.title,
        body: reminder.body,
        data: {
          kind: reminder.kind,
          lessonId: reminder.lessonId ?? '',
          signature,
        },
        android: {
          channelId,
          smallIcon: 'ic_notification',
          pressAction: { id: 'default' },
          autoCancel: true,
        },
        ios: {
          sound: 'default',
          foregroundPresentationOptions: {
            banner: true,
            list: true,
            sound: true,
            badge: false,
          },
        },
      },
      {
        type: TriggerType.TIMESTAMP,
        timestamp: reminder.timestamp,
        ...(reminder.daily ? { repeatFrequency: RepeatFrequency.DAILY } : {}),
        ...(Platform.OS === 'android'
          ? { alarmManager: { allowWhileIdle: true } }
          : {}),
      },
    );
  }
  return {
    status: 'ready',
    count: plan.reminders.length,
    omitted: plan.omitted,
    until: Math.max(
      0,
      ...plan.reminders.filter(r => !r.daily).map(r => r.timestamp),
    ),
  };
}
export function parseReminderTarget(
  data?: Record<string, unknown>,
): ReminderTarget | null {
  if (data?.kind === 'morning') {
    return { kind: 'morning' };
  }
  if (
    (data?.kind === 'before' || data?.kind === 'after') &&
    typeof data.lessonId === 'string' &&
    data.lessonId
  ) {
    return { kind: data.kind, lessonId: data.lessonId };
  }
  return null;
}
export function listenToReminders(
  onOpen: (target: ReminderTarget) => void,
  onDelivered: () => void,
) {
  openListeners.add(onOpen);
  if (pendingOpen) {
    const target = pendingOpen;
    pendingOpen = null;
    onOpen(target);
  }
  const unsubscribe = notifee.onForegroundEvent(event => {
    if (event.type === EventType.PRESS) {
      const target = parseReminderTarget(event.detail.notification?.data);
      if (target) {
        receiveReminderOpen(target);
      }
    }
    if (event.type === EventType.DELIVERED) {
      onDelivered();
    }
  });
  if (Platform.OS === 'android') {
    void notifee
      .getInitialNotification()
      .then(initial => {
        const target = parseReminderTarget(initial?.notification.data);
        if (target) {
          receiveReminderOpen(target);
        }
      })
      .catch(() => undefined);
  }
  return () => {
    openListeners.delete(onOpen);
    unsubscribe();
  };
}
