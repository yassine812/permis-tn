import React, { useContext, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import {
  Data,
  Lesson,
  saveLesson,
  saveStudent,
  stages,
  Student,
  uid,
  Stage,
  blankRates,
  blankPayments,
  blankResults,
  amountText,
  moneyInput,
  money,
  hours,
  paymentFields,
  ValidationError,
} from './domain';
import { Key } from './i18n';
import { Button, Chip, colors, Field, Locale, Row, Txt, useT } from './ui';

export type Commit = (
  change: (data: Data) => Data,
  close?: boolean,
) => Promise<boolean>;
export function StudentForm({
  student,
  commit,
  busy,
  onSaved,
}: {
  student?: Student;
  commit: Commit;
  busy: boolean;
  onSaved?: (id: string) => void;
}) {
  const t = useT();
  const [draft, setDraft] = useState<Student>(
    student || {
      id: uid(),
      name: '',
      phone: '',
      stage: 'code',
      notes: '',
      archived: false,
      rates: blankRates(),
      amountPaid: 0,
      paidByStage: blankPayments(),
      examResults: blankResults(),
    },
  );
  const [rate, setRate] = useState(amountText(student?.hourlyRate ?? null));
  return (
    <View style={{ gap: 20 }}>
      {!student && (
        <View
          style={{
            padding: 15,
            backgroundColor: colors.mint,
            borderRadius: 12,
          }}
        >
          <Txt style={{ color: colors.green }}>{t('noStudentsHint')}</Txt>
        </View>
      )}
      <Field
        label={t('name')}
        value={draft.name}
        onChange={name => setDraft({ ...draft, name })}
        placeholder="Ex. Amine Ben Salah"
        maxLength={100}
      />
      <Field
        label={`${t('phone')} · ${t('optional')}`}
        value={draft.phone}
        onChange={phone => setDraft({ ...draft, phone })}
        placeholder="+216 22 123 456"
        ltr
        maxLength={20}
      />
      <Field
        label={`${t('notes')} · ${t('optional')}`}
        value={draft.notes}
        onChange={notes => setDraft({ ...draft, notes })}
        multiline
      />
      <Field
        label={`${t('candidateRate')} · DT`}
        value={rate}
        onChange={setRate}
        numeric
        ltr
        maxLength={10}
        placeholder="Ex. 30"
      />
      <Txt style={{ color: colors.muted }}>{t('candidateRateHint')}</Txt>
      <Button
        title={t('save')}
        disabled={busy}
        icon="check"
        onPress={async () => {
          const ok = await commit(
            d =>
              saveStudent(d, {
                ...draft,
                hourlyRate: moneyInput(rate),
              }),
            !onSaved,
          );
          if (ok) {
            onSaved?.(draft.id);
          }
        }}
      />
    </View>
  );
}
export function LessonForm({
  data,
  lesson,
  initialDate,
  initialStudent,
  initialStage,
  initialStart,
  commit,
  busy,
}: {
  data: Data;
  lesson?: Lesson;
  initialDate: string;
  initialStudent?: string;
  initialStage?: Stage;
  initialStart?: string;
  commit: Commit;
  busy: boolean;
}) {
  const t = useT();
  const initial =
    data.students.find(s => s.id === initialStudent) ||
    data.students.find(s => !s.archived);
  const [draft, setDraft] = useState<Lesson>(
    () =>
      lesson || {
        id: uid(),
        studentId: initial?.id || '',
        type: initialStage || initial?.stage || 'code',
        date: initialDate,
        start: initialStart || '09:00',
        duration: 60,
        paid: false,
        status: 'planned',
        notes: '',
      },
  );
  const [search, setSearch] = useState('');
  const [choosing, setChoosing] = useState(!lesson && !initialStudent);
  const selected = data.students.find(s => s.id === draft.studentId);
  const [pending, setPending] = useState(false);
  const [rate, setRate] = useState('');
  const [formError, setFormError] = useState('');
  const candidateRate = () => selected?.hourlyRate ?? moneyInput(rate);
  if (pending && selected) {
    return (
      <PaymentPrompt
        name={selected.name}
        type={draft.type}
        duration={draft.duration}
        rate={candidateRate()}
        receivedAmount={draft.paid ? draft.paidAmount : undefined}
        busy={busy}
        back={() => setPending(false)}
        choose={paid => {
          void commit(d => {
            const priced = saveStudent(d, {
              ...selected,
              hourlyRate: candidateRate(),
            });
            return saveLesson(priced, {
              ...draft,
              ...paymentFields(draft, paid, candidateRate()),
            });
          }, true);
        }}
      />
    );
  }
  return (
    <View style={{ gap: 20 }}>
      <Field
        label={t('date')}
        value={draft.date}
        onChange={date => setDraft({ ...draft, date })}
        ltr
        maxLength={10}
      />
      <TimePicker
        value={draft.start}
        onChange={start => setDraft({ ...draft, start })}
      />
      <Txt style={{ fontWeight: '700' }}>{t('student')}</Txt>
      <Button
        secondary
        title={selected?.name || t('selectStudent')}
        onPress={() => setChoosing(!choosing)}
      />
      {choosing && (
        <View style={{ gap: 10 }}>
          <Field label={t('search')} value={search} onChange={setSearch} />
          <ScrollView
            nestedScrollEnabled
            style={{ maxHeight: 185 }}
            keyboardShouldPersistTaps="handled"
          >
            {data.students
              .filter(
                s =>
                  (!s.archived || s.id === draft.studentId) &&
                  s.name
                    .toLocaleLowerCase()
                    .includes(search.toLocaleLowerCase()),
              )
              .map(s => (
                <View key={s.id} style={{ marginBottom: 6 }}>
                  <Button
                    compact
                    secondary
                    title={s.name}
                    onPress={() => {
                      setDraft({ ...draft, studentId: s.id, type: s.stage });
                      setRate('');
                      setChoosing(false);
                    }}
                  />
                </View>
              ))}
          </ScrollView>
        </View>
      )}
      <Txt style={{ fontWeight: '700' }}>{t('type')}</Txt>
      <Row style={{ flexWrap: 'wrap' }}>
        {stages.map(stage => (
          <Chip
            key={stage}
            title={t(stage)}
            active={draft.type === stage}
            onPress={() => {
              setDraft({ ...draft, type: stage });
            }}
          />
        ))}
      </Row>
      <Field
        label={`${t('notes')} · ${t('optional')}`}
        value={draft.notes}
        onChange={notes => setDraft({ ...draft, notes })}
        multiline
      />
      {selected?.hourlyRate == null && (
        <>
          <Field
            label={`${t('candidateRate')} · DT`}
            value={rate}
            onChange={setRate}
            numeric
            ltr
            maxLength={10}
          />
          <Txt>{t('candidateRateHint')}</Txt>
        </>
      )}
      {!!formError && (
        <View accessibilityRole="alert">
          <Txt style={{ color: colors.red }}>{formError}</Txt>
        </View>
      )}
      <Button
        title={t('continuePayment')}
        icon="check"
        disabled={busy}
        onPress={() => {
          try {
            saveLesson(data, draft);
            candidateRate();
            setFormError('');
            setPending(true);
          } catch (e) {
            setFormError(
              t(
                e instanceof ValidationError ? (e.message as Key) : 'dataError',
              ),
            );
          }
        }}
      />
    </View>
  );
}
export function TimePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (time: string) => void;
}) {
  const t = useT();
  const [hour, minute] = value.split(':');
  const [allTimes, setAllTimes] = useState(false);
  const visibleHours =
    allTimes || Number(hour) < 6 || Number(hour) > 21
      ? Array.from({ length: 24 }, (_, i) => i)
      : Array.from({ length: 16 }, (_, i) => i + 6);
  return (
    <View
      style={{
        gap: 14,
        padding: 16,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: colors.line,
        borderRadius: 22,
      }}
    >
      <Txt style={{ fontWeight: '700' }}>{t('chooseTime')}</Txt>
      <Txt style={{ fontSize: 12, color: colors.muted }}>
        {t('bookingHint')}
      </Txt>
      <Field
        label={t('time')}
        value={value}
        onChange={onChange}
        ltr
        maxLength={5}
      />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {visibleHours.map(i => {
          const h = String(i).padStart(2, '0');
          return (
            <Pressable
              key={h}
              accessibilityRole="button"
              accessibilityLabel={`${h} h`}
              accessibilityState={{ selected: hour === h }}
              onPress={() =>
                onChange(`${h}:${/^\d{2}$/.test(minute) ? minute : '00'}`)
              }
              style={{
                width: '23%',
                minHeight: 38,
                borderRadius: 10,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: hour === h ? colors.ink : colors.bg,
              }}
            >
              <Txt
                style={{
                  fontSize: 13,
                  fontWeight: '600',
                  color: hour === h ? '#fff' : colors.ink,
                }}
              >
                {h}:00
              </Txt>
            </Pressable>
          );
        })}
      </View>
      <Row style={{ flexWrap: 'wrap' }}>
        {['00', '15', '30', '45'].map(m => (
          <Chip
            key={m}
            title={`${m} min`}
            active={minute === m}
            onPress={() =>
              onChange(`${/^([01]\d|2[0-3])$/.test(hour) ? hour : '09'}:${m}`)
            }
          />
        ))}
      </Row>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t(allTimes ? 'usualTimes' : 'allTimes')}
        onPress={() => setAllTimes(!allTimes)}
      >
        <Txt style={{ fontSize: 12, color: colors.green, fontWeight: '700' }}>
          {t(allTimes ? 'usualTimes' : 'allTimes')} →
        </Txt>
      </Pressable>
    </View>
  );
}
export function RatesForm({
  student,
  commit,
  busy,
}: {
  student: Student;
  commit: Commit;
  busy: boolean;
}) {
  const t = useT();
  const [rate, setRate] = useState(amountText(student.hourlyRate ?? null));
  return (
    <View style={{ gap: 18 }}>
      <Txt style={{ fontWeight: '700' }}>{student.name}</Txt>
      <Txt>{t('candidateRateHint')}</Txt>
      <Txt>{t('repriceHint')}</Txt>
      <Field
        label={`${t('candidateRate')} · DT`}
        value={rate}
        onChange={setRate}
        placeholder={t('notSet')}
        numeric
        ltr
        maxLength={10}
      />
      <Button
        title={t('save')}
        disabled={busy}
        onPress={() => {
          void commit(d => {
            return saveStudent(d, { ...student, hourlyRate: moneyInput(rate) });
          }, true);
        }}
      />
    </View>
  );
}
export function PaymentPrompt({
  name,
  type,
  duration,
  rate,
  receivedAmount,
  busy,
  back,
  choose,
}: {
  name: string;
  type: Stage;
  duration: number;
  rate: number;
  receivedAmount?: number;
  busy: boolean;
  back: () => void;
  choose: (paid: boolean) => void;
}) {
  const t = useT();
  const language = useContext(Locale);
  return (
    <View style={{ gap: 22, paddingVertical: 16 }}>
      <Txt style={{ fontSize: 24, fontWeight: '700' }}>
        {t('paymentPrompt')}
      </Txt>
      <View
        style={{
          backgroundColor: colors.mint,
          padding: 20,
          borderRadius: 14,
          gap: 10,
        }}
      >
        <Txt style={{ fontWeight: '700', fontSize: 18 }}>{name}</Txt>
        <Txt>
          {t(type)} · {hours(duration)} {t('hoursUnit')}
        </Txt>
        <Txt style={{ fontSize: 28, fontWeight: '800' }}>
          {money(Math.round((duration * rate) / 60), language)}
        </Txt>
      </View>
      {receivedAmount !== undefined && (
        <Txt>
          {t('amountPaid')}: {money(receivedAmount, language)}
        </Txt>
      )}
      <Txt style={{ color: colors.muted }}>{t('paymentPromptHint')}</Txt>
      <Button
        title={t('savePaid')}
        icon="check"
        disabled={busy}
        onPress={() => choose(true)}
      />
      <Button
        title={t('saveUnpaid')}
        secondary
        disabled={busy}
        onPress={() => choose(false)}
      />
      <Button
        title={t('back')}
        secondary
        compact
        disabled={busy}
        onPress={back}
      />
    </View>
  );
}
export function SettingsForm({
  data,
  commit,
  busy,
}: {
  data: Data;
  commit: Commit;
  busy: boolean;
}) {
  const t = useT();
  const [school, setSchool] = useState(data.settings.school);
  return (
    <View style={{ gap: 18 }}>
      <Field
        label={t('school')}
        value={school}
        onChange={setSchool}
        maxLength={100}
      />
      <Button
        title={t('save')}
        icon="check"
        disabled={busy}
        onPress={() => {
          void commit(d => ({
            ...d,
            settings: {
              ...d.settings,
              school: school.trim() || 'Mon auto-école',
            },
          }));
        }}
      />
    </View>
  );
}
