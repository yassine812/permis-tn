import { useTheme, lightColors, darkColors, Palette } from './theme';
import React, { useContext, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  Data,
  ExamStatus,
  hours,
  isCompleted,
  money,
  Stage,
  stages,
  Student,
  studentAccount,
} from './domain';
import {
  Badge,
  Button,
  Icon,
  IconName,
  Locale,
  Row,
  stageIcon,
  Txt,
  useT,
} from './ui';
import { useStyles } from './styles';

export function StudentAccount({
  data,
  student,
  addHours,
  editBilling,
  schedule,
  editRates,
  setResult,
  busy,
  initialStage,
}: {
  data: Data;
  student: Student;
  addHours: (stage: Stage) => void;
  editBilling: (stage?: Stage) => void;
  schedule: (stage: Stage) => void;
  editRates: () => void;
  setResult: (stage: Stage, result: ExamStatus) => void;
  busy: boolean;
  initialStage?: Stage;
}) {
  const { colors } = useTheme();
  const s = useStyles();
  const p = useLocalStyles();
  const t = useT();
  const language = useContext(Locale);
  const account = studentAccount(data, student);
  const [selectedStage, setSelectedStage] = useState<Stage>(
    initialStage || student.stage,
  );
  const previousStage = useRef(student.stage);
  const [correcting, setCorrecting] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  useEffect(() => {
    if (previousStage.current !== student.stage) {
      setSelectedStage(student.stage);
      setCorrecting(false);
      previousStage.current = student.stage;
    }
  }, [student.id, student.stage]);
  const row = account.byStage.find(r => r.stage === selectedStage)!;
  const result = student.examResults[selectedStage];
  const complete = isCompleted(student);
  const compactMoney = (value: number | null) =>
    value === null
      ? '—'
      : `${(value / 1000).toLocaleString(
          language === 'fr' ? 'fr-TN' : 'ar-TN',
          { maximumFractionDigits: 3 },
        )}`;
  function action(title: string, icon: IconName, onPress: () => void) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        onPress={onPress}
        style={p.action}
      >
        <View style={p.actionIcon}>
          <Icon name={icon} color={colors.green} size={21} />
        </View>
        <Txt style={{ fontSize: 12, fontWeight: '700', textAlign: 'center' }}>
          {title}
        </Txt>
      </Pressable>
    );
  }
  return (
    <View style={{ gap: 20 }}>
      <View style={p.hero}>
        <Row style={{ alignItems: 'flex-start' }}>
          <View style={p.avatar}>
            <Txt style={{ color: colors.ink, fontSize: 24, fontWeight: '800' }}>
              {student.name.trim()[0]?.toUpperCase()}
            </Txt>
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Txt
              style={{
                color: colors.ink,
                fontSize: 26,
                lineHeight: 32,
                fontWeight: '700',
              }}
            >
              {student.name}
            </Txt>
            <Txt style={{ color: colors.muted, fontSize: 13 }}>
              {student.phone || t('student')}
            </Txt>
          </View>
          <Icon
            name={complete ? 'check' : stageIcon[student.stage]}
            color={colors.blue}
            size={25}
          />
        </Row>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt style={{ color: colors.blue, fontSize: 12, fontWeight: '600' }}>
            {complete
              ? t('courseComplete')
              : `${t('currentLevel')} · ${t(student.stage)}`}
          </Txt>
          <Txt style={{ color: colors.muted, fontSize: 12 }}>
            {
              stages.filter(stage => student.examResults[stage] === 'passed')
                .length
            }{' '}
            / 3 {t('validated')}
          </Txt>
        </Row>
        <Row style={{ gap: 6 }}>
          {stages.map(stage => (
            <View key={stage} style={{ flex: 1, gap: 7 }}>
              <View
                style={{
                  height: 4,
                  borderRadius: 3,
                  backgroundColor:
                    student.examResults[stage] === 'passed'
                      ? colors.green
                      : stage === student.stage
                      ? colors.blue
                      : colors.line,
                }}
              />
              <Txt
                style={{
                  fontSize: 10,
                  color: stage === student.stage ? colors.ink : colors.muted,
                }}
              >
                {t(stage)}
              </Txt>
            </View>
          ))}
        </Row>
      </View>
      <Button
        secondary
        title={`${t('candidateRate')} · ${money(
          student.hourlyRate ?? null,
          language,
        )} / h`}
        onPress={editRates}
      />
      {student.hourlyRate == null && (
        <Txt style={s.muted}>{t('candidateRateHint')}</Txt>
      )}
      <Row style={{ justifyContent: 'space-between' }}>
        <Txt style={s.sectionTitle}>{t('yourCategories')}</Txt>
        <Txt style={s.smallMuted}>
          {language === 'fr' ? 'Montants en DT' : 'المبالغ بالدينار'}
        </Txt>
      </Row>
      <Row style={{ alignItems: 'stretch', gap: 8 }}>
        {account.byStage.map(item => {
          const selected = item.stage === selectedStage;
          return (
            <Pressable
              key={item.stage}
              accessibilityRole="button"
              accessibilityLabel={`${t('openCategory')} · ${t(item.stage)}`}
              accessibilityState={{ selected }}
              onPress={() => {
                setSelectedStage(item.stage);
                setCorrecting(false);
              }}
              style={[
                p.category,
                selected && {
                  backgroundColor: colors.blueSoft,
                  borderColor: colors.blue,
                },
              ]}
            >
              <Txt
                style={{
                  fontSize: 12,
                  fontWeight: '700',
                  color: colors.ink,
                }}
              >
                {t(item.stage)}
              </Txt>
              <Txt
                style={{
                  fontSize: 24,
                  lineHeight: 30,
                  fontWeight: '800',
                  color: colors.ink,
                }}
              >
                {hours(item.minutes)}
                <Txt
                  style={{
                    fontSize: 12,
                    color: colors.muted,
                  }}
                >
                  {' '}
                  {t('hoursUnit')}
                </Txt>
              </Txt>
              <View style={{ gap: 2 }}>
                <Txt
                  style={{
                    fontSize: 10,
                    color: colors.muted,
                  }}
                >
                  {t('paidShort')}
                </Txt>
                <Txt
                  style={{
                    fontSize: 14,
                    fontWeight: '700',
                    color: colors.green,
                  }}
                >
                  {compactMoney(item.paid)}
                </Txt>
              </View>
              <View style={{ gap: 2 }}>
                <Txt
                  style={{
                    fontSize: 10,
                    color: colors.muted,
                  }}
                >
                  {t('dueShort')}
                </Txt>
                <Txt
                  style={{
                    fontSize: 14,
                    fontWeight: '700',
                    color: colors.red,
                  }}
                >
                  {compactMoney(item.due)}
                </Txt>
              </View>
              <Txt
                style={{
                  fontSize: 10,
                  lineHeight: 14,
                  color: colors.muted,
                }}
              >
                {t(student.examResults[item.stage])}
              </Txt>
            </Pressable>
          );
        })}
      </Row>
      <View style={[s.card, { padding: 18, gap: 18 }]}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Badge stage={selectedStage} />
          <Txt style={s.muted}>{t('manageCategory')}</Txt>
        </Row>
        <Row style={{ alignItems: 'stretch', gap: 6 }}>
          {!student.archived &&
            action(t('schedule'), 'calendar', () => schedule(selectedStage))}
          {!student.archived &&
            action(t('addHours'), 'clock', () => addHours(selectedStage))}
          {action(t('payments'), 'payments', () => editBilling(selectedStage))}
        </Row>
        <View style={{ height: 1, backgroundColor: colors.line }} />
        <Row style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <Txt style={s.muted}>{t('hourPrice')}</Txt>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('candidateRate')}
            onPress={editRates}
          >
            <Txt
              style={{ fontSize: 13, fontWeight: '700', color: colors.green }}
            >
              {row.rate === null
                ? t('notSet')
                : `${money(row.rate, language)} / ${t('hoursUnit')}`}{' '}
              ↗
            </Txt>
          </Pressable>
        </Row>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt style={s.muted}>{t('levelTotal')}</Txt>
          <Txt style={{ fontWeight: '700' }}>{money(row.total, language)}</Txt>
        </Row>
      </View>
      <View style={[s.card, { padding: 18, gap: 14 }]}>
        <Row>
          <View style={p.actionIcon}>
            <Icon name="flag" color={colors.green} />
          </View>
          <View style={{ flex: 1 }}>
            <Txt style={{ fontWeight: '700' }}>
              {t('examResult')} · {t(selectedStage)}
            </Txt>
            <Txt style={s.muted}>
              {result === 'notTaken' ? t('examPrompt') : t(result)}
            </Txt>
          </View>
        </Row>
        {result === 'notTaken' || correcting ? (
          <>
            <Txt style={s.muted}>{t('autoAdvanceHint')}</Txt>
            <Row style={{ alignItems: 'stretch' }}>
              <View style={{ flex: 1 }}>
                <Button
                  title={t('passed')}
                  icon="check"
                  disabled={busy}
                  onPress={() => {
                    setResult(selectedStage, 'passed');
                    setCorrecting(false);
                  }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  title={t('failed')}
                  secondary
                  disabled={busy}
                  onPress={() => {
                    setResult(selectedStage, 'failed');
                    setCorrecting(false);
                  }}
                />
              </View>
            </Row>
            {correcting && (
              <Button
                title={t('notTaken')}
                secondary
                compact
                disabled={busy}
                onPress={() => {
                  setResult(selectedStage, 'notTaken');
                  setCorrecting(false);
                }}
              />
            )}
          </>
        ) : (
          <Button
            title={t('correctResult')}
            secondary
            compact
            onPress={() => setCorrecting(true)}
          />
        )}
      </View>
      <View style={[s.card, { padding: 18, gap: 14 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('accountSummary')}
          accessibilityState={{ expanded: showAccount }}
          onPress={() => setShowAccount(!showAccount)}
        >
          <Row style={{ justifyContent: 'space-between' }}>
            <View style={{ gap: 4 }}>
              <Txt style={{ fontWeight: '700' }}>{t('accountSummary')}</Txt>
              <Txt style={s.muted}>{t('balanceDue')}</Txt>
            </View>
            <Txt style={{ fontSize: 20, fontWeight: '800', color: colors.red }}>
              {money(account.due, language)}
            </Txt>
            <Icon name={showAccount ? 'close' : 'plus'} size={16} />
          </Row>
        </Pressable>
        {showAccount && (
          <>
            <Row style={{ justifyContent: 'space-between' }}>
              <Txt>{t('completedHours')}</Txt>
              <Txt>
                {hours(account.minutes)} {t('hoursUnit')}
              </Txt>
            </Row>
            <Row style={{ justifyContent: 'space-between' }}>
              <Txt>{t('totalCost')}</Txt>
              <Txt>{money(account.total, language)}</Txt>
            </Row>
            <Row style={{ justifyContent: 'space-between' }}>
              <Txt>{t('amountPaid')}</Txt>
              <Txt>{money(account.paid, language)}</Txt>
            </Row>
            <Button
              title={t('editBilling')}
              secondary
              onPress={() => editBilling()}
            />
          </>
        )}
        {(account.total === null || account.paid === null) && (
          <Txt style={s.muted}>{t('accountIncomplete')}</Txt>
        )}
        {student.amountPaid !== 0 && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('unallocatedPaid')}
            onPress={() => editBilling()}
            style={p.notice}
          >
            <Txt style={{ fontSize: 12, color: colors.amber }}>
              {t('unallocatedPaid')} · {money(student.amountPaid, language)} →
            </Txt>
          </Pressable>
        )}
      </View>
      {!!student.notes && <Txt style={s.muted}>{student.notes}</Txt>}
    </View>
  );
}
const createStyles = (colors: Palette) =>
  StyleSheet.create({
    hero: {
      paddingVertical: 8,
      gap: 18,
      borderBottomWidth: 1,
      borderBottomColor: colors.line,
      paddingBottom: 22,
    },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: 8,
      backgroundColor: colors.soft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    category: {
      flex: 1,
      minWidth: 0,
      padding: 12,
      gap: 8,
      borderRadius: 8,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
    },
    action: {
      flex: 1,
      minHeight: 64,
      alignItems: 'center',
      gap: 8,
      justifyContent: 'center',
    },
    actionIcon: {
      width: 40,
      height: 40,
      borderRadius: 8,
      backgroundColor: colors.blueSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    notice: {
      backgroundColor: colors.warningSoft,
      padding: 12,
      borderRadius: 12,
    },
  });

const lightStyles = createStyles(lightColors);
const darkStyles = createStyles(darkColors);
function useLocalStyles() {
  return useTheme().mode === 'dark' ? darkStyles : lightStyles;
}
