/* eslint-env jest */
jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  AndroidImportance: { HIGH: 4 },
  AndroidNotificationSetting: { ENABLED: 1, DISABLED: 0 },
  AuthorizationStatus: { AUTHORIZED: 1 },
  EventType: { PRESS: 1, DELIVERED: 3 },
  RepeatFrequency: { DAILY: 1 },
  TriggerType: { TIMESTAMP: 0 },
  default: {
    requestPermission: jest.fn(async () => ({ authorizationStatus: 1 })),
    getNotificationSettings: jest.fn(async () => ({
      authorizationStatus: 1,
      android: { alarm: 1 },
    })),
    openNotificationSettings: jest.fn(async () => {}),
    openAlarmPermissionSettings: jest.fn(async () => {}),
    createChannel: jest.fn(async () => 'permis-reminders'),
    isChannelBlocked: jest.fn(async () => false),
    getTriggerNotifications: jest.fn(async () => []),
    getDisplayedNotifications: jest.fn(async () => []),
    createTriggerNotification: jest.fn(async () => ''),
    cancelNotification: jest.fn(async () => {}),
    cancelAllNotifications: jest.fn(async () => {}),
    cancelTriggerNotifications: jest.fn(async () => {}),
    getInitialNotification: jest.fn(async () => null),
    onForegroundEvent: jest.fn(() => () => {}),
    onBackgroundEvent: jest.fn(),
  },
}));
jest.mock('@react-native-async-storage/async-storage', () => ({
  createAsyncStorage: jest.fn(() => ({
    getItem: jest.fn(async () => null),
    setItem: jest.fn(async () => {}),
  })),
}));
jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);
