import React, { useState } from 'react';
import { View } from 'react-native';
import {
  amountText,
  HourEntry,
  hours,
  hoursInput,
  moneyInput,
  saveHourEntry,
  saveStudent,
  Stage,
  stages,
  Student,
  tunisNow,
  uid,
} from './domain';
import { Commit } from './forms';
import { Button, Chip, Field, Row, Txt, useT } from './ui';
import { styles as s } from './styles';
export { StudentAccount } from './profile';
export function BillingForm({
  student,
  stage,
  commit,
  busy,
}: {
  student: Student;
  stage?: Stage;
  commit: Commit;
  busy: boolean;
}) {
  const t = useT();
  const [paid, setPaid] = useState({
    code: amountText(student.paidByStage.code),
    conduite: amountText(student.paidByStage.conduite),
    manoeuvre: amountText(student.paidByStage.manoeuvre),
  });
  const [unallocated, setUnallocated] = useState(
    amountText(student.amountPaid),
  );
  return (
    <View style={{ gap: 20 }}>
      <Txt style={s.sectionTitle}>{student.name}</Txt>
      <Txt style={s.muted}>{t('amountPaidHint')}</Txt>
      {(stage ? [stage] : stages).map(stage => (
        <Field
          key={stage}
          label={`${t('amountPaid')} · ${t(stage)} · DT`}
          value={paid[stage]}
          onChange={value => setPaid({ ...paid, [stage]: value })}
          numeric
          ltr
          maxLength={10}
        />
      ))}
      {student.amountPaid !== 0 && (
        <>
          <Txt style={s.muted}>{t('allocateHint')}</Txt>
          <Field
            label={`${t('unallocatedPaid')} · DT`}
            value={unallocated}
            onChange={setUnallocated}
            numeric
            ltr
            maxLength={10}
          />
        </>
      )}
      <Button
        title={t('save')}
        disabled={busy}
        onPress={() => {
          void commit(
            d =>
              saveStudent(d, {
                ...student,
                paidByStage: {
                  code: moneyInput(paid.code),
                  conduite: moneyInput(paid.conduite),
                  manoeuvre: moneyInput(paid.manoeuvre),
                },
                amountPaid:
                  student.amountPaid !== 0 ? moneyInput(unallocated) : 0,
              }),
            true,
          );
        }}
      />
    </View>
  );
}
export function HoursForm({
  student,
  stage,
  entry,
  commit,
  busy,
}: {
  student: Student;
  stage?: Stage;
  entry?: HourEntry;
  commit: Commit;
  busy: boolean;
}) {
  const t = useT();
  const [type, setType] = useState(entry?.type || stage || student.stage);
  const [duration, setDuration] = useState(entry ? hours(entry.duration) : '1');
  const [date, setDate] = useState(entry?.date || tunisNow().date);
  const [notes, setNotes] = useState(entry?.notes || '');
  const [id] = useState(entry?.id || uid());
  return (
    <View style={{ gap: 20 }}>
      <Txt style={s.sectionTitle}>{student.name}</Txt>
      <Txt style={s.muted}>{t('manualHoursHint')}</Txt>
      <Row style={{ flexWrap: 'wrap' }}>
        {stages.map(value => (
          <Chip
            key={value}
            title={t(value)}
            active={type === value}
            onPress={() => setType(value)}
          />
        ))}
      </Row>
      <Field
        label={t('hoursToAdd')}
        value={duration}
        onChange={setDuration}
        numeric
        ltr
        maxLength={7}
      />
      <Field
        label={t('date')}
        value={date}
        onChange={setDate}
        ltr
        maxLength={10}
      />
      <Field label={t('notes')} value={notes} onChange={setNotes} multiline />
      <Button
        title={t('save')}
        disabled={busy}
        onPress={() => {
          void commit(
            d =>
              saveHourEntry(d, {
                id,
                studentId: student.id,
                type,
                date,
                duration: hoursInput(duration),
                notes,
              }),
            true,
          );
        }}
      />
    </View>
  );
}
