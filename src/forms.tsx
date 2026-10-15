import React, { useState } from 'react';
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
  validateRates,
} from './domain';
import { Button, Chip, colors, Field, Row, Txt, useT } from './ui';

export type Commit = (
  change: (data: Data) => Data,
  close?: boolean,
) => Promise<boolean>;
export function StudentForm({
  student,
  commit,
  busy,
}: {
  student?: Student;
  commit: Commit;
  busy: boolean;
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
      <Button
        title={t('save')}
        disabled={busy}
        icon="check"
        onPress={() => {
          void commit(d => saveStudent(d, draft), true);
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
      <Button
        title={t('save')}
        icon="check"
        disabled={busy}
        onPress={() => {
          void commit(d => saveLesson(d, draft), true);
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
  data,
  commit,
  busy,
}: {
  data: Data;
  commit: Commit;
  busy: boolean;
}) {
  const t = useT();
  const [rates, setRates] = useState({
    code: amountText(data.settings.rates.code),
    conduite: amountText(data.settings.rates.conduite),
    manoeuvre: amountText(data.settings.rates.manoeuvre),
  });
  return (
    <View style={{ gap: 18 }}>
      <Txt style={{ fontWeight: '700' }}>{t('sharedRates')}</Txt>
      <Txt>{t('repriceHint')}</Txt>
      {stages.map(stage => (
        <Field
          key={stage}
          label={`${t('hourPrice')} · ${t(stage)} · DT`}
          value={rates[stage]}
          onChange={value => setRates({ ...rates, [stage]: value })}
          placeholder={t('notSet')}
          numeric
          ltr
          maxLength={10}
        />
      ))}
      <Button
        title={t('save')}
        disabled={busy}
        onPress={() => {
          void commit(d => {
            const next = {
              code: rates.code.trim() ? moneyInput(rates.code) : null,
              conduite: rates.conduite.trim()
                ? moneyInput(rates.conduite)
                : null,
              manoeuvre: rates.manoeuvre.trim()
                ? moneyInput(rates.manoeuvre)
                : null,
            };
            validateRates(next);
            return { ...d, settings: { ...d.settings, rates: next } };
          }, true);
        }}
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
