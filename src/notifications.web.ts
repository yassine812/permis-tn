import type { Data } from './domain';
import type { ReminderTarget, ReminderState } from './notificationPlan';
export const requestReminderPermission = async () => false;
export const openReminderSettings = async () => {};
export const openExactAlarmSettings = async () => {};
export const syncReminders = async (_data: Data): Promise<ReminderState> => ({
  status: 'web',
  count: 0,
  omitted: 0,
});
export const listenToReminders =
  (_onOpen: (target: ReminderTarget) => void, _onDelivered: () => void) =>
  () => {};
