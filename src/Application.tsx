import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  BackHandler,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  isCompleted,
  studentAccount,
  Data,
  dateLabel,
  hours,
  Lesson,
  monthDays,
  parseBackup,
  saveLesson,
  setExamResult,
  shiftMonth,
  Stage,
  stages,
  Student,
  tunisNow,
  ValidationError,
} from './domain';
import { Key, translate } from './i18n';
import { loadData, persistData } from './storage';
import {
  Badge,
  Button,
  Chip,
  colors,
  Empty,
  Field,
  Icon,
  IconButton,
  Locale,
  Row,
  stageColor,
  Txt,
} from './ui';
import { LessonForm, RatesForm, SettingsForm, StudentForm } from './forms';
import { styles as s } from './styles';
import { Planner } from './planner';
import { useReminders } from './useReminders';
import { ReminderSettings } from './ReminderSettings';
import { WebInstall, BackupDownload, BackupFilePicker } from './WebFeatures';
import { StudentAccount, BillingForm, HoursForm } from './account';

type Tab = 'home' | 'students' | 'calendar' | 'settings';
type Sheet = {
  kind:
    | 'rates'
    | 'billing'
    | 'hours'
    | 'student'
    | 'studentForm'
    | 'lesson'
    | 'lessonForm'
    | 'export'
    | 'import';
  id?: string;
  studentId?: string;
  stage?: Stage;
  start?: string;
};
type Confirmation = { title: string; body: string; action: () => void };
const parentOf = (sheet: Sheet | null) =>
  sheet?.kind === 'billing'
    ? sheet.id
    : sheet && ['hours', 'rates', 'lessonForm'].includes(sheet.kind)
    ? sheet.studentId
    : undefined;

export default function Application() {
  const [data, setData] = useState<Data | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [tab, setTab] = useState<Tab>('home');
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [today, setToday] = useState(tunisNow().date);
  const [selectedDate, setSelectedDate] = useState(today);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Stage | 'all' | 'archived'>('all');
  const [backupInput, setBackupInput] = useState('');
  const current = useRef(data);
  current.current = data;
  const language = data?.settings.language || 'fr';
  const t = (key: Key) => translate(language, key);
  const reminders = useReminders(data, target => {
    setError('');
    setConfirmation(null);
    if (
      target.kind !== 'morning' &&
      current.current?.lessons.some(
        l => l.id === target.lessonId && l.status !== 'cancelled',
      )
    ) {
      setSheet({ kind: 'lesson', id: target.lessonId });
    } else {
      const date = tunisNow().date;
      setSelectedDate(date);
      setMonth(date.slice(0, 7));
      setSheet(null);
      setTab('calendar');
    }
  });
  async function load() {
    setLoadError(false);
    try {
      const loaded = await loadData();
      current.current = loaded;
      setData(loaded);
    } catch {
      setLoadError(true);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  useEffect(() => {
    const refresh = () => setToday(tunisNow().date);
    const timer = setInterval(refresh, 30000);
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        refresh();
      }
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, []);
  useEffect(() => {
    if (!saved) {
      return;
    }
    const timer = setTimeout(() => setSaved(false), 2500);
    return () => clearTimeout(timer);
  }, [saved]);
  useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (saving.current) {
        return true;
      }
      if (confirmation) {
        setConfirmation(null);
        return true;
      }
      if (sheet) {
        const parent = parentOf(sheet);
        setSheet(
          parent ? { kind: 'student', id: parent, stage: sheet.stage } : null,
        );
        return true;
      }
      if (tab !== 'home') {
        setTab('home');
        return true;
      }
      return false;
    });
    return () => handler.remove();
  }, [sheet, tab, confirmation]);
  function open(next: Sheet) {
    setError('');
    setSaved(false);
    setSheet(next);
  }
  function close() {
    if (!saving.current) {
      setError('');
      const parent = parentOf(sheet);
      setSheet(
        parent ? { kind: 'student', id: parent, stage: sheet?.stage } : null,
      );
    }
  }
  async function commit(change: (value: Data) => Data, shouldClose = false) {
    if (saving.current || !current.current) {
      return false;
    }
    saving.current = true;
    setBusy(true);
    setError('');
    setSaved(false);
    try {
      const next = change(current.current);
      await persistData(next);
      current.current = next;
      setData(next);
      setSaved(true);
      if (shouldClose) {
        setSheet(null);
      }
      return true;
    } catch (e) {
      setError(
        e instanceof ValidationError ? t(e.message as Key) : t('storageError'),
      );
      return false;
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  const ask = (title: string, body: string, action: () => void) =>
    setConfirmation({ title, body, action });
  function addLesson(studentId?: string, start?: string) {
    if (!data?.students.some(st => !st.archived)) {
      open({ kind: 'studentForm' });
      return;
    }
    open({ kind: 'lessonForm', studentId, start });
  }
  if (!data) {
    return (
      <SafeAreaView style={s.loading}>
        <Locale.Provider value="fr">
          <View style={s.brandMark}>
            <Icon name="road" color="#fff" size={30} />
          </View>
          <Txt style={s.logo}>permis tn.</Txt>
          {loadError ? (
            <>
              <Txt>{t('storageError')}</Txt>
              <Button
                title={t('retry')}
                onPress={() => {
                  void load();
                }}
              />
            </>
          ) : (
            <>
              <ActivityIndicator color={colors.red} />
              <Txt>{t('loading')}</Txt>
            </>
          )}
        </Locale.Provider>
      </SafeAreaView>
    );
  }
  const active = data.students.filter(st => !st.archived);
  const student = data.students.find(st => st.id === sheet?.id);
  const lesson = data.lessons.find(l => l.id === sheet?.id);
  const parentStudent = parentOf(sheet);
  const visibleStudents = data.students
    .filter(
      st =>
        (filter === 'archived'
          ? st.archived
          : !st.archived && (filter === 'all' || st.stage === filter)) &&
        `${st.name} ${st.phone}`
          .toLocaleLowerCase()
          .includes(search.toLocaleLowerCase()),
    )
    .sort((a, b) => a.name.localeCompare(b.name));
  const fmt = (duration: number) => `${hours(duration)} ${t('hoursUnit')}`;
  function section(title: string, action?: () => void) {
    return (
      <Row style={{ justifyContent: 'space-between', marginTop: 6 }}>
        <Txt style={[s.sectionTitle, { flexShrink: 1 }]}>{title}</Txt>
        {action && (
          <Pressable
            accessibilityRole="button"
            onPress={action}
            style={{ paddingVertical: 10 }}
          >
            <Txt style={s.link}>{t('viewAll')} →</Txt>
          </Pressable>
        )}
      </Row>
    );
  }
  function avatar(st: Student) {
    return (
      <View
        style={[s.avatar, { backgroundColor: `${stageColor[st.stage]}13` }]}
      >
        <Txt
          style={{
            fontWeight: '700',
            color: stageColor[st.stage],
            fontSize: 15,
          }}
        >
          {st.name
            .split(/\s+/)
            .slice(0, 2)
            .map(n => n[0])
            .join('')
            .toUpperCase()}
        </Txt>
      </View>
    );
  }
  function studentRow(st: Student, balance?: number) {
    const stats = studentAccount(data!, st);
    return (
      <Pressable
        key={st.id}
        accessibilityRole="button"
        accessibilityLabel={st.name}
        onPress={() => open({ kind: 'student', id: st.id })}
        style={s.studentRow}
      >
        <Row>
          {avatar(st)}
          <View style={{ flex: 1, gap: 4 }}>
            <Txt style={s.itemName}>{st.name}</Txt>
            <Txt style={s.muted}>
              {st.phone ||
                `${hours(stats.minutes)} ${t('hoursUnit')} · ${t(st.stage)}`}
            </Txt>
          </View>
          {balance !== undefined ? (
            <Txt style={{ fontWeight: '700', color: colors.red }}>
              {fmt(balance)}
            </Txt>
          ) : isCompleted(st) ? (
            <Txt
              style={{ color: colors.green, fontSize: 11, fontWeight: '700' }}
            >
              {t('courseComplete')}
            </Txt>
          ) : (
            <Badge stage={st.stage} />
          )}
        </Row>
      </Pressable>
    );
  }
  function lessonRow(l: Lesson, showDate = false) {
    const owner = data!.students.find(st => st.id === l.studentId)!;
    const payment = l.status;
    return (
      <Pressable
        key={l.id}
        accessibilityRole="button"
        accessibilityLabel={`${l.start} ${owner.name} ${t(l.type)}`}
        onPress={() => open({ kind: 'lesson', id: l.id })}
        style={s.lessonRow}
      >
        <Row style={{ alignItems: 'stretch', gap: 14 }}>
          <View style={s.timeColumn}>
            <Txt style={{ fontSize: 16, fontWeight: '700' }}>{l.start}</Txt>
            <Txt style={s.smallMuted}>
              {l.duration} {t('minutesUnit')}
            </Txt>
          </View>
          <View
            style={{
              width: 3,
              borderRadius: 3,
              backgroundColor:
                l.status === 'cancelled' ? colors.line : stageColor[l.type],
            }}
          />
          <View style={{ flex: 1, gap: 7 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Txt style={s.itemName}>{owner.name}</Txt>
              {l.status === 'done' && (
                <Icon name="check" size={17} color={colors.green} />
              )}
            </Row>
            <Row style={{ flexWrap: 'wrap', gap: 6 }}>
              <Badge stage={l.type} />
              <Txt
                style={[
                  s.smallMuted,
                  {
                    color: payment === 'done' ? colors.green : colors.amber,
                  },
                ]}
              >
                {l.status === 'cancelled' ? t('cancelled') : t(payment)}
              </Txt>
            </Row>
            {showDate && (
              <Txt style={s.smallMuted}>{dateLabel(l.date, language)}</Txt>
            )}
          </View>
        </Row>
      </Pressable>
    );
  }
  function studentDetails(st: Student) {
    const history = data!.lessons
      .filter(l => l.studentId === st.id)
      .sort((a, b) =>
        `${b.date}${b.start}`.localeCompare(`${a.date}${a.start}`),
      );

    return (
      <View style={{ gap: 20 }}>
        <StudentAccount
          key={st.id}
          initialStage={sheet?.stage}
          data={data!}
          student={st}
          addHours={stage => open({ kind: 'hours', studentId: st.id, stage })}
          editBilling={stage => open({ kind: 'billing', id: st.id, stage })}
          editRates={() => open({ kind: 'rates', studentId: st.id })}
          setResult={(stage, result) => {
            void commit(d => setExamResult(d, st.id, stage, result));
          }}
          busy={busy}
          schedule={stage =>
            open({ kind: 'lessonForm', studentId: st.id, stage })
          }
        />
        <Txt style={s.sectionTitle}>{t('candidateFolder')}</Txt>
        <Button
          secondary
          title={t('edit')}
          onPress={() => open({ kind: 'studentForm', id: st.id })}
        />
        {data!.hourEntries.some(e => e.studentId === st.id) && (
          <View style={{ gap: 12 }}>
            <Txt style={s.sectionTitle}>{t('manualHistory')}</Txt>
            {data!.hourEntries
              .filter(e => e.studentId === st.id)
              .sort((a, b) => b.date.localeCompare(a.date))
              .map(e => (
                <Button
                  key={e.id}
                  secondary
                  title={`${t(e.type)} · ${fmt(e.duration)} · ${e.date}`}
                  onPress={() =>
                    open({ kind: 'hours', studentId: st.id, id: e.id })
                  }
                />
              ))}
          </View>
        )}
        {section(t('history'))}
        {history.length ? (
          <View style={s.card}>{history.map(l => lessonRow(l, true))}</View>
        ) : (
          <Txt style={s.muted}>{t('noHistory')}</Txt>
        )}
        <Button
          secondary
          title={t(st.archived ? 'restoreStudent' : 'archive')}
          onPress={() => {
            if (!st.archived && history.some(l => l.status === 'planned')) {
              setError(t('archivePlanned'));
              return;
            }
            ask(
              t(st.archived ? 'restoreStudent' : 'archive'),
              t('archiveHint'),
              () => {
                void commit(
                  d => ({
                    ...d,
                    students: d.students.map(item =>
                      item.id === st.id
                        ? { ...item, archived: !item.archived }
                        : item,
                    ),
                  }),
                  true,
                );
              },
            );
          }}
        />
      </View>
    );
  }
  function lessonDetails(l: Lesson) {
    const owner = data!.students.find(st => st.id === l.studentId)!;
    return (
      <View style={{ gap: 20 }}>
        <Badge stage={l.type} />
        <Txt style={s.pageTitle}>{owner.name}</Txt>
        <Txt>
          {dateLabel(l.date, language)} · {l.start}
        </Txt>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt style={s.muted}>{t('duration')}</Txt>
          <Txt>
            {l.duration} {t('minutesUnit')}
          </Txt>
        </Row>
        {l.status !== 'cancelled' && (
          <View style={[s.card, { padding: 16, gap: 12 }]}>
            <Txt style={s.sectionTitle}>{t('lessonPayment')}</Txt>
            <Txt style={s.muted}>
              {t(l.paymentReviewed ? 'paymentReviewed' : 'paymentToReview')}
            </Txt>
            <Row>
              <Chip
                title={t('paid')}
                active={!!l.paymentReviewed && l.paid}
                disabled={busy}
                onPress={() => {
                  void commit(d =>
                    saveLesson(d, { ...l, paid: true, paymentReviewed: true }),
                  );
                }}
              />
              <Chip
                title={t('lessonUnpaid')}
                active={!!l.paymentReviewed && !l.paid}
                disabled={busy}
                onPress={() => {
                  void commit(d =>
                    saveLesson(d, { ...l, paid: false, paymentReviewed: true }),
                  );
                }}
              />
            </Row>
            <Txt style={s.smallMuted}>{t('paymentReviewHint')}</Txt>
            <Button
              secondary
              title={t('updateReceived')}
              onPress={() =>
                open({ kind: 'billing', id: owner.id, stage: l.type })
              }
            />
          </View>
        )}
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt style={s.muted}>{t('status')}</Txt>
          <Txt style={{ fontWeight: '700' }}>{t(l.status)}</Txt>
        </Row>
        <Button
          secondary
          title={t('accountLink')}
          onPress={() => open({ kind: 'student', id: owner.id })}
        />
        {l.notes ? <Txt>{l.notes}</Txt> : null}
        {l.status === 'planned' && (
          <Button
            title={t('markDone')}
            disabled={busy}
            icon="check"
            onPress={() => {
              void commit(d => saveLesson(d, { ...l, status: 'done' }));
            }}
          />
        )}
        {l.status !== 'cancelled' && (
          <Button
            secondary
            title={t('cancelLesson')}
            disabled={busy}
            onPress={() => {
              void commit(d => saveLesson(d, { ...l, status: 'cancelled' }));
            }}
          />
        )}
        <Button
          secondary
          title={t('edit')}
          onPress={() => open({ kind: 'lessonForm', id: l.id })}
        />
        <Button
          secondary
          title={t('details')}
          onPress={() => open({ kind: 'student', id: owner.id })}
        />
      </View>
    );
  }
  const sheetTitle =
    sheet?.kind === 'rates'
      ? t('sharedRates')
      : sheet?.kind === 'billing'
      ? t('editBilling')
      : sheet?.kind === 'hours'
      ? t(sheet.id ? 'edit' : 'addHours')
      : sheet?.kind === 'studentForm'
      ? t(sheet.id ? 'edit' : 'newStudent')
      : sheet?.kind === 'student'
      ? t('details')
      : sheet?.kind === 'lesson'
      ? t('lessonDetails')
      : sheet?.kind === 'lessonForm'
      ? t(sheet.id ? 'edit' : 'newLesson')
      : sheet?.kind === 'export'
      ? t('export')
      : sheet?.kind === 'import'
      ? t('import')
      : '';
  return (
    <Locale.Provider value={language}>
      <SafeAreaView style={s.root} edges={['top', 'left', 'right', 'bottom']}>
        <View style={s.shell}>
          <Row style={s.header}>
            <Row>
              <View style={s.brandMark}>
                <Icon name="road" color="#fff" size={24} />
              </View>
              <View>
                <Txt style={s.logo}>
                  permis
                  <Txt
                    style={{
                      color: colors.red,
                      fontSize: 23,
                      fontWeight: '800',
                    }}
                  >
                    {' '}
                    tn.
                  </Txt>
                </Txt>
                <Txt
                  style={{
                    fontSize: 10,
                    letterSpacing: 1.1,
                    color: colors.muted,
                  }}
                >
                  AUTO-ÉCOLE · TUNISIE
                </Txt>
              </View>
            </Row>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('settings')}
              onPress={() => setTab('settings')}
              style={s.flag}
            >
              <Txt style={{ fontSize: 22 }}>🇹🇳</Txt>
            </Pressable>
          </Row>
          {error && !sheet ? (
            <View accessibilityRole="alert" style={s.error}>
              <Txt style={{ color: '#A42B32' }}>{error}</Txt>
            </View>
          ) : null}
          {saved && !sheet && (
            <View accessibilityLiveRegion="polite" style={s.success}>
              <Txt style={{ color: colors.green, fontSize: 12 }}>
                {t('saved')}
              </Txt>
            </View>
          )}
          <ScrollView
            key={tab}
            style={{ flex: 1 }}
            contentContainerStyle={s.content}
            keyboardShouldPersistTaps="handled"
          >
            {tab === 'home' && <WebInstall compact />}
            {tab === 'home' && (
              <Planner
                data={data}
                onPlan={(date, start) => {
                  setSelectedDate(date);
                  addLesson(undefined, start);
                }}
                onLesson={item => open({ kind: 'lesson', id: item.id })}
                onStudent={id => open({ kind: 'student', id })}
                onNewStudent={() => open({ kind: 'studentForm' })}
              />
            )}
            {tab === 'students' && (
              <>
                <Txt style={s.kicker}>{t('studentsKicker')}</Txt>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Txt style={s.pageTitle}>
                    {t('students')}
                    <Txt style={{ color: colors.muted, fontSize: 24 }}>
                      {' '}
                      / {active.length}
                    </Txt>
                  </Txt>
                  <IconButton
                    name="plus"
                    label={t('newStudent')}
                    onPress={() => open({ kind: 'studentForm' })}
                  />
                </Row>
                <Field
                  label={t('search')}
                  value={search}
                  onChange={setSearch}
                  placeholder={t('search')}
                />
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <Row>
                    {(['all', ...stages, 'archived'] as const).map(stage => (
                      <Chip
                        key={stage}
                        title={t(stage)}
                        active={filter === stage}
                        onPress={() => setFilter(stage)}
                      />
                    ))}
                  </Row>
                </ScrollView>
                {visibleStudents.length ? (
                  <View style={s.card}>
                    {visibleStudents.map(st => studentRow(st))}
                  </View>
                ) : (
                  <Empty
                    icon="students"
                    title={t(data.students.length ? 'noMatches' : 'noStudents')}
                    hint={t(
                      data.students.length
                        ? 'emptySearchHint'
                        : 'noStudentsHint',
                    )}
                    action={
                      <Button
                        title={t('newStudent')}
                        icon="plus"
                        onPress={() => open({ kind: 'studentForm' })}
                      />
                    }
                  />
                )}
              </>
            )}
            {tab === 'calendar' && (
              <>
                <Txt style={s.kicker}>{t('calendarKicker')}</Txt>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Txt style={s.pageTitle}>{t('calendar')}</Txt>
                  <Button
                    secondary
                    compact
                    title={t('today')}
                    onPress={() => {
                      setSelectedDate(today);
                      setMonth(today.slice(0, 7));
                    }}
                  />
                </Row>
                <View style={[s.card, { padding: 14, gap: 14 }]}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <IconButton
                      name="back"
                      label={t('previousMonth')}
                      onPress={() => setMonth(shiftMonth(month, -1))}
                    />
                    <Txt
                      style={{
                        fontSize: 16,
                        fontWeight: '700',
                        textTransform: 'capitalize',
                      }}
                    >
                      {dateLabel(`${month}-01`, language, true)}
                    </Txt>
                    <IconButton
                      name="next"
                      label={t('nextMonth')}
                      onPress={() => setMonth(shiftMonth(month, 1))}
                    />
                  </Row>
                  <View style={s.calendarGrid}>
                    {t('weekdays')
                      .split(',')
                      .map(day => (
                        <View key={day} style={s.dayCell}>
                          <Txt style={s.smallMuted}>{day}</Txt>
                        </View>
                      ))}
                    {monthDays(month).map((day, i) => (
                      <View key={day || `empty-${i}`} style={s.dayCell}>
                        {day && (
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={day}
                            accessibilityState={{
                              selected: selectedDate === day,
                            }}
                            onPress={() => {
                              setSelectedDate(day);
                              addLesson();
                            }}
                            style={[
                              s.dayButton,
                              day === today && {
                                borderWidth: 1,
                                borderColor: colors.green,
                              },
                              day === selectedDate && {
                                backgroundColor: colors.ink,
                              },
                            ]}
                          >
                            <Txt
                              style={{
                                fontSize: 13,
                                color:
                                  day === selectedDate ? '#fff' : colors.ink,
                                fontWeight: day === today ? '800' : '500',
                              }}
                            >
                              {Number(day.slice(-2))}
                            </Txt>
                            <View
                              style={{
                                height: 4,
                                width: 4,
                                borderRadius: 2,
                                backgroundColor: data.lessons.some(
                                  l =>
                                    l.date === day && l.status !== 'cancelled',
                                )
                                  ? day === selectedDate
                                    ? '#fff'
                                    : colors.red
                                  : 'transparent',
                              }}
                            />
                          </Pressable>
                        )}
                      </View>
                    ))}
                  </View>
                </View>
                <Row style={{ flexWrap: 'wrap', justifyContent: 'center' }}>
                  {stages.map(stage => (
                    <Row key={stage} style={{ gap: 5 }}>
                      <View
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: stageColor[stage],
                        }}
                      />
                      <Txt style={s.smallMuted}>{t(stage)}</Txt>
                    </Row>
                  ))}
                </Row>
                {section(dateLabel(selectedDate, language))}
                {data.lessons.some(l => l.date === selectedDate) ? (
                  <View style={s.card}>
                    {data.lessons
                      .filter(l => l.date === selectedDate)
                      .sort((a, b) => a.start.localeCompare(b.start))
                      .map(l => lessonRow(l))}
                  </View>
                ) : (
                  <Empty
                    icon="calendar"
                    title={t('noLessons')}
                    hint={t('noLessonsHint')}
                  />
                )}
                <Button
                  title={t('newLesson')}
                  icon="plus"
                  onPress={() => addLesson()}
                />
              </>
            )}
            {tab === 'settings' && (
              <>
                <Txt style={s.kicker}>{t('settingsKicker')}</Txt>
                <Txt style={s.pageTitle}>{t('settingsTitle')}</Txt>
                <Txt style={s.label}>{t('language')}</Txt>
                <Row>
                  <Chip
                    title="Français"
                    active={language === 'fr'}
                    onPress={() => {
                      void commit(d => ({
                        ...d,
                        settings: { ...d.settings, language: 'fr' },
                      }));
                    }}
                  />
                  <Chip
                    title="تونسي"
                    active={language === 'ar'}
                    onPress={() => {
                      void commit(d => ({
                        ...d,
                        settings: { ...d.settings, language: 'ar' },
                      }));
                    }}
                  />
                </Row>
                <View style={[s.card, { padding: 20 }]}>
                  <SettingsForm data={data} commit={commit} busy={busy} />
                </View>
                <WebInstall />
                <View style={[s.card, { padding: 20 }]}>
                  <ReminderSettings
                    data={data}
                    state={reminders.state}
                    failed={reminders.failed}
                    refresh={reminders.refresh}
                    commit={commit}
                    busy={busy}
                  />
                </View>
                <Button
                  title={t('sharedRates')}
                  secondary
                  onPress={() => open({ kind: 'rates' })}
                />
                <View style={[s.card, { padding: 20, gap: 16 }]}>
                  <Icon name="shield" color={colors.green} size={28} />
                  <Txt style={s.sectionTitle}>{t('backup')}</Txt>
                  <Txt style={s.muted}>{t('backupHint')}</Txt>
                  <Button
                    secondary
                    title={t('export')}
                    icon="download"
                    onPress={() => open({ kind: 'export' })}
                  />
                  <Button
                    secondary
                    title={t('import')}
                    onPress={() => {
                      setBackupInput('');
                      open({ kind: 'import' });
                    }}
                  />
                </View>
                <Txt style={[s.smallMuted, { textAlign: 'center' }]}>
                  {t('localNote')}
                </Txt>
                <Txt style={[s.smallMuted, { textAlign: 'center' }]}>
                  Permis TN · 1.0.0
                </Txt>
              </>
            )}
          </ScrollView>
          <Row style={s.nav}>
            {(['home', 'students', 'calendar', 'settings'] as Tab[]).map(
              item => (
                <Pressable
                  key={item}
                  accessibilityRole="tab"
                  accessibilityLabel={t(item)}
                  accessibilityState={{ selected: tab === item }}
                  onPress={() => {
                    setError('');
                    setTab(item);
                  }}
                  style={s.navItem}
                >
                  <View
                    style={[
                      s.navIcon,
                      item === tab && { backgroundColor: '#EAF0FF' },
                    ]}
                  >
                    <Icon
                      name={item}
                      size={21}
                      color={item === tab ? colors.blue : colors.muted}
                    />
                  </View>
                  <Txt
                    style={{
                      fontSize: 10,
                      lineHeight: 15,
                      fontWeight: tab === item ? '700' : '500',
                      color: tab === item ? colors.blue : colors.muted,
                    }}
                  >
                    {t(item)}
                  </Txt>
                </Pressable>
              ),
            )}
          </Row>
        </View>
        <Modal
          visible={sheet !== null || confirmation !== null}
          animationType="fade"
          onRequestClose={() =>
            confirmation ? setConfirmation(null) : close()
          }
          presentationStyle="fullScreen"
        >
          <SafeAreaView
            style={s.root}
            edges={['top', 'left', 'right', 'bottom']}
          >
            <KeyboardAvoidingView
              style={s.shell}
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
              <Row style={s.sheetHeader}>
                <Txt style={[s.sectionTitle, { flex: 1 }]}>{sheetTitle}</Txt>
                <IconButton
                  name={parentStudent ? 'back' : 'close'}
                  label={t(parentStudent ? 'back' : 'close')}
                  onPress={close}
                />
              </Row>
              {error ? (
                <View accessibilityRole="alert" style={s.error}>
                  <Txt style={{ color: '#A42B32' }}>{error}</Txt>
                </View>
              ) : null}
              {saved && (
                <View accessibilityLiveRegion="polite" style={s.success}>
                  <Txt style={{ color: colors.green, fontSize: 12 }}>
                    {t('saved')}
                  </Txt>
                </View>
              )}
              <ScrollView
                key={`${sheet?.kind}-${sheet?.id || sheet?.studentId || ''}`}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={s.content}
              >
                {sheet?.kind === 'rates' && (
                  <RatesForm
                    data={data}
                    busy={busy}
                    commit={async change => {
                      const ok = await commit(change);
                      if (ok) {
                        setSheet(
                          sheet.studentId
                            ? { kind: 'student', id: sheet.studentId }
                            : null,
                        );
                      }
                      return ok;
                    }}
                  />
                )}
                {sheet?.kind === 'billing' && student && (
                  <BillingForm
                    student={student}
                    stage={sheet.stage}
                    busy={busy}
                    commit={async change => {
                      const ok = await commit(change);
                      if (ok) {
                        setSheet({
                          kind: 'student',
                          id: student.id,
                          stage: sheet.stage,
                        });
                      }
                      return ok;
                    }}
                  />
                )}
                {sheet?.kind === 'hours' &&
                  data.students.find(st => st.id === sheet.studentId) && (
                    <HoursForm
                      student={
                        data.students.find(st => st.id === sheet.studentId)!
                      }
                      stage={sheet.stage}
                      entry={data.hourEntries.find(e => e.id === sheet.id)}
                      busy={busy}
                      commit={async change => {
                        const ok = await commit(change);
                        if (ok) {
                          setSheet({
                            kind: 'student',
                            id: sheet.studentId,
                            stage: sheet.stage,
                          });
                        }
                        return ok;
                      }}
                    />
                  )}
                {sheet?.kind === 'studentForm' && (
                  <StudentForm
                    key={sheet.id || 'new'}
                    student={student}
                    commit={commit}
                    busy={busy}
                  />
                )}
                {sheet?.kind === 'lessonForm' && (
                  <LessonForm
                    key={sheet.id || 'new'}
                    data={data}
                    lesson={lesson}
                    initialDate={selectedDate}
                    initialStudent={sheet.studentId}
                    initialStage={sheet.stage}
                    initialStart={sheet.start}
                    commit={async change => {
                      const ok = await commit(change);
                      if (ok) {
                        setSheet(
                          sheet.studentId
                            ? { kind: 'student', id: sheet.studentId }
                            : null,
                        );
                      }
                      return ok;
                    }}
                    busy={busy}
                  />
                )}
                {sheet?.kind === 'student' &&
                  student &&
                  studentDetails(student)}
                {sheet?.kind === 'lesson' && lesson && lessonDetails(lesson)}
                {sheet?.kind === 'export' && (
                  <View style={{ gap: 20 }}>
                    <Txt>{t('exportHint')}</Txt>
                    <BackupDownload data={data} />
                    <Field
                      label={t('backupText')}
                      value={JSON.stringify(data, null, 2)}
                      onChange={() => {}}
                      maxLength={10000000}
                      multiline
                      ltr
                    />
                    <Button
                      title={t('share')}
                      icon="download"
                      onPress={() => {
                        Share.share({
                          title: `permis-tn-${today}.json`,
                          message: JSON.stringify(data, null, 2),
                        }).catch(() => setError(t('error')));
                      }}
                    />
                  </View>
                )}
                {sheet?.kind === 'import' && (
                  <View style={{ gap: 20 }}>
                    <Txt>{t('restoreHint')}</Txt>
                    <BackupFilePicker
                      onRead={setBackupInput}
                      onError={() => setError(t('backupError'))}
                    />
                    <Field
                      label={t('backupText')}
                      value={backupInput}
                      onChange={setBackupInput}
                      maxLength={10000000}
                      multiline
                      ltr
                    />
                    <Button
                      title={t('import')}
                      disabled={busy}
                      onPress={() => {
                        try {
                          const restored = parseBackup(backupInput);
                          ask(t('restoreTitle'), t('restoreHint'), () => {
                            void commit(() => restored, true);
                          });
                        } catch {
                          setError(t('backupError'));
                        }
                      }}
                    />
                  </View>
                )}
              </ScrollView>
              {confirmation && (
                <View style={s.confirmBackdrop}>
                  <View style={s.confirmBox}>
                    <Txt style={s.sectionTitle}>{confirmation.title}</Txt>
                    <Txt>{confirmation.body}</Txt>
                    <Button
                      title={t('confirm')}
                      onPress={() => {
                        const action = confirmation.action;
                        setConfirmation(null);
                        action();
                      }}
                    />
                    <Button
                      secondary
                      title={t('cancel')}
                      onPress={() => setConfirmation(null)}
                    />
                  </View>
                </View>
              )}
            </KeyboardAvoidingView>
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
    </Locale.Provider>
  );
}
