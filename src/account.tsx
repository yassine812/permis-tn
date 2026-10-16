import { useTheme } from './theme';
import React, { useState } from 'react';
import { View } from 'react-native';
import {
  amountText,
  Data,
  HourEntry,
  hours,
  hoursInput,
  moneyInput,
  paymentFields,
  studentAccount,
  money,
  ValidationError,
  saveHourEntry,
  saveStudent,
  Stage,
  stages,
  Student,
  tunisNow,
  uid,
} from './domain';
import { Commit, PaymentPrompt } from './forms';
import { Key } from './i18n';
import { Button, Chip, Field, Row, Txt, useT } from './ui';
import { useStyles } from './styles';
export { StudentAccount } from './profile';
export function BillingForm({
  data,
  student,
  stage,
  commit,
  busy,
}: {
  data: Data;
  student: Student;
  stage?: Stage;
  commit: Commit;
  busy: boolean;
}) {
  const s = useStyles();
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
      <Txt style={s.muted}>{t('additionalPaymentsHint')}</Txt>
      <Txt>
        {t('recordedPayments')}:{' '}
        {money(
          studentAccount(data, student)
            .byStage.filter(row => !stage || row.stage === stage)
            .reduce((sum, row) => sum + row.recordedPaid, 0),
        )}
      </Txt>
      {(stage ? [stage] : stages).map(stage => (
        <Field
          key={stage}
          label={`${t('additionalPayments')} · ${t(stage)} · DT`}
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
  data,
  student,
  stage,
  entry,
  commit,
  busy,
}: {
  data: Data;
  student: Student;
  stage?: Stage;
  entry?: HourEntry;
  commit: Commit;
  busy: boolean;
}) {
  const { colors } = useTheme();
  const s = useStyles();
  const t = useT();
  const [type, setType] = useState(entry?.type || stage || student.stage);
  const [duration, setDuration] = useState(entry ? hours(entry.duration) : '1');
  const [date, setDate] = useState(entry?.date || tunisNow().date);
  const [notes, setNotes] = useState(entry?.notes || '');
  const [id] = useState(entry?.id || uid());
  const [pending, setPending] = useState<HourEntry | null>(null);
  const [rate, setRate] = useState('');
  const [formError, setFormError] = useState('');
  const candidateRate = () => student.hourlyRate ?? moneyInput(rate);
  if (pending) {
    return (
      <PaymentPrompt
        name={student.name}
        type={pending.type}
        duration={pending.duration}
        rate={candidateRate()}
        receivedAmount={pending.paid ? pending.paidAmount : undefined}
        busy={busy}
        back={() => setPending(null)}
        choose={paid => {
          void commit(d => {
            const priced = saveStudent(d, {
              ...student,
              hourlyRate: candidateRate(),
            });
            return saveHourEntry(priced, {
              ...pending,
              ...paymentFields(pending, paid, candidateRate()),
            });
          }, true);
        }}
      />
    );
  }
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
        placeholder="Ex. 3"
      />
      <Field
        label={t('date')}
        value={date}
        onChange={setDate}
        ltr
        maxLength={10}
      />
      <Field label={t('notes')} value={notes} onChange={setNotes} multiline />
      {student.hourlyRate == null && (
        <>
          <Field
            label={`${t('candidateRate')} · DT`}
            value={rate}
            onChange={setRate}
            numeric
            ltr
            maxLength={10}
          />
          <Txt style={s.muted}>{t('candidateRateHint')}</Txt>
        </>
      )}
      {!!formError && (
        <View accessibilityRole="alert">
          <Txt style={{ color: colors.red }}>{formError}</Txt>
        </View>
      )}
      <Button
        title={t('continuePayment')}
        disabled={busy}
        onPress={() => {
          try {
            const next = {
              ...entry,
              id,
              studentId: student.id,
              type,
              date,
              duration: hoursInput(duration),
              notes,
            };
            saveHourEntry(data, next);
            candidateRate();
            setFormError('');
            setPending(next);
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
