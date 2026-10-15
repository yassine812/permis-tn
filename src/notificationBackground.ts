import notifee, { EventType } from '@notifee/react-native';
import { loadData } from './storage';
import {
  parseReminderTarget,
  receiveReminderOpen,
  syncReminders,
} from './notifications';
// Android can replenish the queue while the app UI is closed. Never edit
// attendance or money from a delivered notification.
notifee.onBackgroundEvent(async ({ type, detail }) => {
  if (type === EventType.PRESS) {
    const target = parseReminderTarget(detail.notification?.data);
    if (target) {
      receiveReminderOpen(target);
    }
  }
  if (type === EventType.DELIVERED) {
    try {
      await syncReminders(await loadData());
    } catch {
      /* Keep existing alarms on a read error. */
    }
  }
});
