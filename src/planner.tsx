import { useTheme, lightColors, darkColors, Palette } from './theme';
import React, { useContext, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Data, dateLabel, Lesson, minutes, tunisNow } from './domain';
import { Badge, Button, Icon, IconButton, Locale, Row, Txt, useT } from './ui';

const shiftDay = (date: string, days: number) => {
  const next = new Date(`${date}T12:00:00Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
};
export function Planner({
  data,
  onPlan,
  onLesson,
  onStudent,
  onNewStudent,
}: {
  data: Data;
  onPlan: (date: string, time?: string) => void;
  onLesson: (lesson: Lesson) => void;
  onStudent: (id: string) => void;
  onNewStudent: () => void;
}) {
  const { colors } = useTheme();
  const p = useLocalStyles();
  const t = useT();
  const lang = useContext(Locale);
  const today = tunisNow().date;
  const [day, setDay] = useState(today);
  const [showFree, setShowFree] = useState(true);
  const offset = (new Date(`${day}T12:00:00Z`).getUTCDay() + 6) % 7;
  const monday = shiftDay(day, -offset);
  const lessons = data.lessons
    .filter(l => l.date === day && l.status !== 'cancelled')
    .sort((a, b) => a.start.localeCompare(b.start));
  const free = Array.from({ length: 11 }, (_, i) => i + 8).filter(
    hour =>
      !lessons.some(
        l =>
          hour * 60 < minutes(l.start) + l.duration &&
          (hour + 1) * 60 > minutes(l.start),
      ),
  );
  const slots = [
    ...lessons.map(lesson => ({ start: lesson.start, lesson })),
    ...(showFree
      ? free.map(hour => ({
          start: `${String(hour).padStart(2, '0')}:00`,
          lesson: null,
        }))
      : []),
  ].sort((a, b) => a.start.localeCompare(b.start));
  return (
    <View style={{ gap: 18 }}>
      <Row
        style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}
      >
        <View style={{ flex: 1, gap: 4 }}>
          <Txt style={p.eyebrow}>{data.settings.school}</Txt>
          <Txt style={p.title}>{t('myDiary')}</Txt>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('today')}
          onPress={() => setDay(today)}
          style={p.today}
        >
          <Txt style={{ fontWeight: '600', fontSize: 12 }}>{t('today')}</Txt>
        </Pressable>
      </Row>
      <View style={{ gap: 8 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt
            style={{
              fontSize: 16,
              fontWeight: '700',
              textTransform: 'capitalize',
            }}
          >
            {dateLabel(day, lang, true)}
          </Txt>
          <Row style={{ gap: 2 }}>
            <IconButton
              name="back"
              label={t('previousWeek')}
              onPress={() => setDay(shiftDay(day, -7))}
            />
            <IconButton
              name="next"
              label={t('nextWeek')}
              onPress={() => setDay(shiftDay(day, 7))}
            />
          </Row>
        </Row>
        <Row style={{ gap: 4 }}>
          {Array.from({ length: 7 }, (_, i) => shiftDay(monday, i)).map(
            date => {
              const selected = date === day;
              const count = data.lessons.filter(
                l => l.date === date && l.status !== 'cancelled',
              ).length;
              return (
                <Pressable
                  key={date}
                  accessibilityRole="button"
                  accessibilityLabel={`${t('diaryDay')} ${date}`}
                  accessibilityState={{ selected }}
                  onPress={() => setDay(date)}
                  style={[
                    p.day,
                    selected && {
                      backgroundColor: colors.primary,
                      borderColor: colors.blue,
                    },
                  ]}
                >
                  <Txt
                    style={{
                      fontSize: 10,
                      color: selected ? '#fff' : colors.muted,
                    }}
                  >
                    {new Intl.DateTimeFormat(
                      lang === 'fr' ? 'fr-TN' : 'ar-TN',
                      { weekday: 'short', timeZone: 'UTC' },
                    )
                      .format(new Date(`${date}T12:00:00Z`))
                      .replace('.', '')}
                  </Txt>
                  <Txt
                    style={{
                      fontSize: 19,
                      fontWeight: '700',
                      color: selected ? '#fff' : colors.ink,
                    }}
                  >
                    {Number(date.slice(-2))}
                  </Txt>
                  <View
                    style={{
                      width: 4,
                      height: 4,
                      borderRadius: 2,
                      backgroundColor: count
                        ? selected
                          ? '#fff'
                          : colors.blue
                        : 'transparent',
                    }}
                  />
                </Pressable>
              );
            },
          )}
        </Row>
      </View>
      <Row style={p.summary}>
        <View style={{ flex: 1 }}>
          <Txt style={p.number}>{String(lessons.length).padStart(2, '0')}</Txt>
          <Txt style={p.eyebrow}>{t('lessons')}</Txt>
        </View>
        <View style={{ width: 1, height: 32, backgroundColor: colors.line }} />
        <View style={{ flex: 1, paddingLeft: 16 }}>
          <Txt style={p.number}>
            {String(lessons.filter(l => l.status === 'done').length).padStart(
              2,
              '0',
            )}
          </Txt>
          <Txt style={p.eyebrow}>{t('donePlural')}</Txt>
        </View>
        <Icon name="calendar" size={36} color={colors.blue} />
      </Row>
      <Button title={t('newLesson')} icon="plus" onPress={() => onPlan(day)} />
      <Row style={{ justifyContent: 'space-between' }}>
        <Txt style={{ fontSize: 17, fontWeight: '700' }}>{t('dayPlan')}</Txt>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('showFreeSlots')}
          accessibilityState={{ checked: showFree }}
          onPress={() => setShowFree(!showFree)}
          style={{ minHeight: 44, justifyContent: 'center' }}
        >
          <Row style={{ gap: 6 }}>
            <View
              style={[
                p.checkbox,
                showFree && {
                  backgroundColor: colors.primary,
                  borderColor: colors.blue,
                },
              ]}
            >
              {showFree && <Icon name="check" size={12} color="#fff" />}
            </View>
            <Txt style={{ fontSize: 11 }}>{t('freeSlots')}</Txt>
          </Row>
        </Pressable>
      </Row>
      <View>
        {!slots.length && (
          <Txt style={{ paddingVertical: 20, color: colors.muted }}>
            {t('noSessions')}
          </Txt>
        )}
        {slots.map(slot => (
          <Row
            key={slot.lesson?.id || slot.start}
            style={{ alignItems: 'stretch', gap: 14 }}
          >
            <View style={{ width: 43, paddingTop: slot.lesson ? 16 : 14 }}>
              <Txt
                style={{ fontSize: 12, fontWeight: '600', color: colors.muted }}
              >
                {slot.start}
              </Txt>
            </View>
            <View
              style={{
                flex: 1,
                borderLeftWidth: 1,
                borderColor: colors.line,
                paddingLeft: 14,
                paddingBottom: 10,
              }}
            >
              {slot.lesson ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${slot.start} ${
                    data.students.find(st => st.id === slot.lesson!.studentId)
                      ?.name
                  }`}
                  onPress={() => onLesson(slot.lesson!)}
                  style={p.lesson}
                >
                  <Txt style={{ fontWeight: '700', fontSize: 16 }}>
                    {
                      data.students.find(st => st.id === slot.lesson!.studentId)
                        ?.name
                    }
                  </Txt>
                  <Row
                    style={{ justifyContent: 'space-between', marginTop: 10 }}
                  >
                    <Badge stage={slot.lesson.type} />
                    <Txt
                      style={{
                        fontSize: 11,
                        color:
                          slot.lesson.status === 'done'
                            ? colors.green
                            : colors.muted,
                      }}
                    >
                      {t(slot.lesson.status)}
                    </Txt>
                  </Row>
                </Pressable>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${t('schedule')} ${day} ${slot.start}`}
                  onPress={() => onPlan(day, slot.start)}
                  style={p.free}
                >
                  <Txt style={{ fontSize: 12, color: colors.muted }}>
                    {t('available')}
                  </Txt>
                  <Icon name="plus" size={16} color={colors.muted} />
                </Pressable>
              )}
            </View>
          </Row>
        ))}
      </View>
      <Row style={{ justifyContent: 'space-between' }}>
        <Txt style={{ fontSize: 18, fontWeight: '700' }}>{t('students')}</Txt>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('newStudent')}
          onPress={onNewStudent}
          style={{ paddingVertical: 12 }}
        >
          <Txt style={{ color: colors.blue, fontWeight: '600', fontSize: 12 }}>
            + {t('newStudent')}
          </Txt>
        </Pressable>
      </Row>
      {data.students
        .filter(st => !st.archived)
        .slice(-3)
        .reverse()
        .map(st => (
          <Pressable
            key={st.id}
            accessibilityRole="button"
            accessibilityLabel={st.name}
            onPress={() => onStudent(st.id)}
            style={p.student}
          >
            <Row>
              <View style={p.initial}>
                <Txt style={{ fontWeight: '700' }}>
                  {st.name[0].toUpperCase()}
                </Txt>
              </View>
              <Txt style={{ flex: 1, fontWeight: '600' }}>{st.name}</Txt>
              <Badge stage={st.stage} />
              <Icon name="next" size={15} color={colors.muted} />
            </Row>
          </Pressable>
        ))}
    </View>
  );
}
const createStyles = (colors: Palette) =>
  StyleSheet.create({
    title: {
      fontSize: 36,
      lineHeight: 44,
      fontWeight: '800',
      letterSpacing: -1.6,
    },
    eyebrow: { fontSize: 12, lineHeight: 18, color: colors.muted },
    today: {
      paddingHorizontal: 12,
      minHeight: 36,
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 6,
    },
    day: {
      flex: 1,
      minWidth: 0,
      alignItems: 'center',
      paddingVertical: 10,
      gap: 7,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    summary: {
      paddingVertical: 12,
      paddingHorizontal: 20,
      backgroundColor: colors.soft,
      borderRadius: 8,
    },
    number: {
      fontSize: 27,
      lineHeight: 32,
      fontWeight: '700',
      letterSpacing: -1,
    },
    checkbox: {
      width: 16,
      height: 16,
      borderRadius: 3,
      borderWidth: 1,
      borderColor: colors.line,
      alignItems: 'center',
      justifyContent: 'center',
    },
    lesson: {
      backgroundColor: colors.blueSoft,
      padding: 16,
      borderRadius: 8,
      borderLeftWidth: 3,
      borderLeftColor: colors.blue,
    },
    free: {
      minHeight: 44,
      borderBottomWidth: 1,
      borderColor: colors.line,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    student: {
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.line,
    },
    initial: {
      width: 36,
      height: 36,
      borderRadius: 8,
      backgroundColor: colors.soft,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });

const lightStyles = createStyles(lightColors);
const darkStyles = createStyles(darkColors);
function useLocalStyles() {
  return useTheme().mode === 'dark' ? darkStyles : lightStyles;
}
