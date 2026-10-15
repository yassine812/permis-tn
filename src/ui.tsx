import React, { createContext, useContext } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { Language, Stage } from './domain';
import { Key, translate } from './i18n';

export const colors = {
  bg: '#FAFAF7',
  ink: '#202224',
  muted: '#72777B',
  line: '#E0E2DD',
  red: '#CB4847',
  mint: '#E2F3EB',
  green: '#14765C',
  amber: '#A96C1E',
  blue: '#3156D3',
  white: '#FFFFFF',
};
export const Locale = createContext<Language>('fr');
export const useT = () => {
  const lang = useContext(Locale);
  return (key: Key) => translate(lang, key);
};
export function Txt({
  children,
  style,
  numberOfLines,
}: {
  children: React.ReactNode;
  style?: TextStyle | TextStyle[];
  numberOfLines?: number;
}) {
  const lang = useContext(Locale);
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        s.text,
        lang === 'ar' && { textAlign: 'right', writingDirection: 'rtl' },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
export function Row({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
}) {
  const lang = useContext(Locale);
  return (
    <View
      style={[s.row, lang === 'ar' && { flexDirection: 'row-reverse' }, style]}
    >
      {children}
    </View>
  );
}
export type IconName =
  | 'home'
  | 'students'
  | 'calendar'
  | 'payments'
  | 'settings'
  | 'plus'
  | 'back'
  | 'next'
  | 'close'
  | 'check'
  | 'clock'
  | 'search'
  | 'road'
  | 'book'
  | 'car'
  | 'flag'
  | 'download'
  | 'shield';
export function Icon({
  name,
  color = colors.ink,
  size = 22,
}: {
  name: IconName;
  color?: string;
  size?: number;
}) {
  const paths: Record<IconName, string> = {
    home: 'M3 10 12 3l9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z',
    students:
      'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
    calendar: 'M8 2v4m8-4v4M3 10h18m-14 5h2m3 0h2m3 0h1M7 18h2m3 0h2',
    payments:
      'M20 8V5a2 2 0 0 0-2-2H5a3 3 0 0 0 0 6h16v11H5a3 3 0 0 1-3-3V6m19 7h-5v4h5',
    settings:
      'M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2',
    plus: 'M12 5v14M5 12h14',
    back: 'm15 5-7 7 7 7',
    next: 'm9 5 7 7-7 7',
    close: 'm6 6 12 12M6 18 18 6',
    check: 'm5 12 4 4L19 6',
    clock: 'M12 6v6l4 2',
    search: 'm21 21-5-5',
    road: 'm7 2-5 20M17 2l5 20M12 2v4m0 4v4m0 4v4',
    book: 'M12 5v16M3 3c4-1 7 0 9 2 3-2 6-3 9-2v16c-4-1-6 0-9 2-3-2-5-3-9-2Z',
    car: 'm5 7 2-4h10l2 4M3 11l2-4h14l2 4v7H3Zm3 7v3m12-3v3M6 13h2m8 0h2',
    flag: 'M5 22V3c5-4 9 4 14 0v10c-5 4-9-4-14 0',
    download: 'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5',
    shield: 'm12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6Zm-5 9 3 3 7-7',
  };
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.65}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d={paths[name]} />
      {name === 'students' && <Circle cx="9" cy="7" r="4" />}
      {name === 'calendar' && (
        <Rect x="3" y="4" width="18" height="18" rx="3" />
      )}
      {name === 'clock' && <Circle cx="12" cy="12" r="10" />}
      {name === 'search' && <Circle cx="10" cy="10" r="7" />}
      {name === 'settings' && <Circle cx="12" cy="12" r="6" />}
    </Svg>
  );
}
export function Button({
  title,
  onPress,
  secondary,
  disabled,
  icon,
  compact,
}: {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
  icon?: IconName;
  compact?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        secondary && s.secondary,
        compact && { paddingVertical: 10, minHeight: 42 },
        (pressed || disabled) && { opacity: 0.55 },
      ]}
    >
      <Row style={{ justifyContent: 'center', gap: 8 }}>
        {icon && (
          <Icon
            name={icon}
            color={secondary ? colors.ink : colors.white}
            size={18}
          />
        )}
        <Txt style={[s.buttonText, secondary ? { color: colors.ink } : {}]}>
          {title}
        </Txt>
      </Row>
    </Pressable>
  );
}
export function IconButton({
  name,
  onPress,
  label,
}: {
  name: IconName;
  onPress: () => void;
  label: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={s.iconButton}
    >
      <Icon name={name} size={20} />
    </Pressable>
  );
}
export function Field({
  label,
  value,
  onChange,
  placeholder,
  numeric,
  multiline,
  ltr,
  maxLength = 2000,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  numeric?: boolean;
  multiline?: boolean;
  ltr?: boolean;
  maxLength?: number;
}) {
  const lang = useContext(Locale);
  return (
    <View style={{ gap: 8 }}>
      <Txt style={s.label}>{label}</Txt>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        keyboardType={numeric ? 'decimal-pad' : 'default'}
        multiline={multiline}
        maxLength={maxLength}
        autoCapitalize={numeric || ltr ? 'none' : 'sentences'}
        style={[
          s.input,
          multiline && { height: 100, textAlignVertical: 'top' },
          {
            textAlign: lang === 'ar' && !ltr ? 'right' : 'left',
            writingDirection: lang === 'ar' && !ltr ? 'rtl' : 'ltr',
          },
        ]}
      />
    </View>
  );
}
export function Chip({
  title,
  active,
  onPress,
  disabled,
}: {
  title: string;
  active: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ selected: active, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[s.chip, active && s.chipActive]}
    >
      <Txt style={[s.chipText, active ? { color: '#fff' } : {}]}>{title}</Txt>
    </Pressable>
  );
}
export const stageColor = {
  code: '#32739C',
  conduite: '#27775E',
  manoeuvre: '#9A6A34',
};
export const stageIcon: Record<Stage, IconName> = {
  code: 'book',
  conduite: 'car',
  manoeuvre: 'flag',
};
export function Badge({ stage }: { stage: Stage }) {
  const t = useT();
  return (
    <View style={[s.badge, { backgroundColor: `${stageColor[stage]}13` }]}>
      <Txt
        style={{ fontSize: 11, fontWeight: '700', color: stageColor[stage] }}
      >
        {t(stage)}
      </Txt>
    </View>
  );
}
export function Empty({
  icon,
  title,
  hint,
  action,
}: {
  icon: IconName;
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <View style={s.empty}>
      <View style={s.emptyIcon}>
        <Icon name={icon} size={32} color={colors.green} />
      </View>
      <Txt style={s.emptyTitle}>{title}</Txt>
      {hint && <Txt style={s.emptyHint}>{hint}</Txt>}
      {action}
    </View>
  );
}
export const s = StyleSheet.create({
  text: { fontSize: 14, lineHeight: 21, color: colors.ink },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  button: {
    backgroundColor: colors.blue,
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 15,
    minHeight: 50,
    justifyContent: 'center',
  },
  secondary: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.line,
  },
  buttonText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    color: '#fff',
  },
  iconButton: {
    height: 44,
    width: 44,
    borderRadius: 8,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontSize: 12, fontWeight: '700', color: '#566B76' },
  input: {
    borderWidth: 1,
    borderColor: '#DCE4E8',
    borderRadius: 8,
    padding: 13,
    fontSize: 15,
    color: colors.ink,
    backgroundColor: '#fff',
    minHeight: 48,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
  },
  chipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { fontSize: 12, fontWeight: '600' },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 6,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 22,
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.line,
  },
  emptyIcon: {
    width: 66,
    height: 66,
    borderRadius: 24,
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  emptyHint: {
    color: colors.muted,
    textAlign: 'center',
    fontSize: 13,
    maxWidth: 290,
  },
});
