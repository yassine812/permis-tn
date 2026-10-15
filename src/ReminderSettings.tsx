import React, { useState } from 'react';
import { Platform, Switch, View } from 'react-native';
import { Data } from './domain';
import {
  defaultReminders,
  ReminderPreferences,
  ReminderState,
} from './notificationPlan';
import {
  openExactAlarmSettings,
  openReminderSettings,
  requestReminderPermission,
} from './notifications';
import { Button, colors, Row, Txt, useT } from './ui';

export function ReminderSettings({
  data,
  state,
  failed,
  refresh,
  commit,
  busy,
}: {
  data: Data;
  state: ReminderState;
  failed: boolean;
  refresh: () => Promise<void>;
  commit: (change: (data: Data) => Data) => Promise<boolean>;
  busy: boolean;
}) {
  const t = useT();
  const [working, setWorking] = useState(false);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState(false);
  const preferences = data.settings.reminders ?? defaultReminders();
  const update = (change: Partial<ReminderPreferences>) =>
    commit(d => ({
      ...d,
      settings: {
        ...d.settings,
        reminders: {
          ...(d.settings.reminders ?? defaultReminders()),
          ...change,
        },
      },
    }));
  async function toggle(forceEnable = false) {
    setWorking(true);
    setError(false);
    try {
      if (preferences.enabled && !forceEnable) {
        await update({ enabled: false });
      } else if (await requestReminderPermission()) {
        setDenied(false);
        await update({ enabled: true });
      } else {
        setDenied(true);
      }
    } catch {
      setError(true);
    } finally {
      setWorking(false);
    }
  }
  async function settings(alarm: boolean) {
    try {
      await (alarm ? openExactAlarmSettings() : openReminderSettings());
    } catch {
      setError(true);
    }
  }
  return (
    <View style={{ gap: 16 }}>
      <Txt style={{ fontSize: 19, fontWeight: '700' }}>
        {t('remindersTitle')}
      </Txt>
      <Txt style={{ color: colors.muted }}>{t('remindersSummary')}</Txt>
      {Platform.OS === 'web' ? (
        <Txt>{t('remindersNative')}</Txt>
      ) : (
        <>
          <Button
            title={t(
              preferences.enabled ? 'disableReminders' : 'enableReminders',
            )}
            onPress={() => {
              void toggle();
            }}
            disabled={busy || working}
          />
          {(['morning', 'before', 'after'] as const).map(key => (
            <Row key={key} style={{ justifyContent: 'space-between' }}>
              <Txt style={{ flex: 1 }}>
                {t(
                  key === 'morning'
                    ? 'morningOption'
                    : key === 'before'
                    ? 'beforeOption'
                    : 'afterOption',
                )}
              </Txt>
              <Switch
                accessibilityLabel={t(
                  key === 'morning'
                    ? 'morningOption'
                    : key === 'before'
                    ? 'beforeOption'
                    : 'afterOption',
                )}
                value={preferences[key]}
                disabled={!preferences.enabled || busy || working}
                trackColor={{ true: colors.blue }}
                onValueChange={value => {
                  void update({ [key]: value });
                }}
              />
            </Row>
          ))}
          {((denied && state.status !== 'ready') ||
            state.status === 'denied') && (
            <>
              <Txt>{t('remindersDenied')}</Txt>
              <Button
                secondary
                title={t('enableReminders')}
                disabled={busy || working}
                onPress={() => {
                  void toggle(true);
                }}
              />
              <Button
                secondary
                title={t('phoneNotificationSettings')}
                onPress={() => {
                  void settings(false);
                }}
              />
            </>
          )}
          {state.status === 'alarm' && (
            <>
              <Txt>{t('exactAlarmHint')}</Txt>
              <Button
                secondary
                title={t('allowExactAlarms')}
                onPress={() => {
                  void settings(true);
                }}
              />
            </>
          )}
          {state.status === 'ready' && (
            <Txt style={{ color: colors.green }}>
              {t('remindersReady')} · {state.count}
            </Txt>
          )}
          {state.omitted > 0 && (
            <Txt>
              {t('remindersWindow')}{' '}
              {state.until
                ? new Date(state.until).toLocaleString(
                    data.settings.language === 'ar' ? 'ar-TN' : 'fr-TN',
                    { timeZone: 'Africa/Tunis' },
                  )
                : ''}
              . {t('remindersRefresh')}
            </Txt>
          )}
          {(failed || error) && (
            <>
              <Txt style={{ color: colors.red }}>{t('remindersError')}</Txt>
              <Button
                secondary
                title={t('retry')}
                onPress={() => {
                  setError(false);
                  void refresh();
                }}
              />
            </>
          )}
        </>
      )}
    </View>
  );
}
