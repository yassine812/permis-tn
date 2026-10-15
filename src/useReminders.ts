import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { Data } from './domain';
import { listenToReminders, syncReminders } from './notifications';
import { ReminderState, ReminderTarget } from './notificationPlan';

export function useReminders(
  data: Data | null,
  onOpen: (target: ReminderTarget) => void,
) {
  const [state, setState] = useState<ReminderState>({
    status: 'off',
    count: 0,
    omitted: 0,
  });
  const [failed, setFailed] = useState(false);
  const latest = useRef(data);
  latest.current = data;
  const open = useRef(onOpen);
  open.current = onOpen;
  const pendingTarget = useRef<ReminderTarget | null>(null);
  const mounted = useRef(true);
  const revision = useRef(0);
  const refresh = useCallback(async () => {
    if (!latest.current) {
      return;
    }
    const request = ++revision.current;
    try {
      const next = await syncReminders(latest.current);
      if (mounted.current && request === revision.current) {
        setState(next);
        setFailed(false);
      }
    } catch {
      if (mounted.current && request === revision.current) {
        setFailed(true);
      }
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    const unsubscribe = listenToReminders(
      target => {
        if (!mounted.current) {
          return;
        }
        if (latest.current) {
          open.current(target);
        } else {
          pendingTarget.current = target;
        }
      },
      () => {
        void refresh();
      },
    );
    const active = AppState.addEventListener('change', value => {
      if (value === 'active') {
        void refresh();
      }
    });
    return () => {
      mounted.current = false;
      unsubscribe();
      active.remove();
    };
  }, [refresh]);
  useEffect(() => {
    if (data && pendingTarget.current) {
      open.current(pendingTarget.current);
      pendingTarget.current = null;
    }
    void refresh();
  }, [data, refresh]);
  return { state, failed, refresh };
}
