import React, { useState } from 'react';
import { View } from 'react-native';
import { Chip, Row, Txt, useT } from './ui';
import { useTheme, ThemeMode } from './theme';
import { useStyles } from './styles';
export function ThemeSettings() {
  const { mode, setMode, colors } = useTheme();
  const s = useStyles();
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const choose = async (next: ThemeMode) => {
    setBusy(true);
    setError(false);
    try {
      await setMode(next);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={[s.card, { padding: 20, gap: 14 }]}>
      <Txt style={s.sectionTitle}>{t('appearance')}</Txt>
      <Row>
        <Chip
          title={t('lightMode')}
          active={mode === 'light'}
          disabled={busy}
          onPress={() => {
            void choose('light');
          }}
        />
        <Chip
          title={t('darkMode')}
          active={mode === 'dark'}
          disabled={busy}
          onPress={() => {
            void choose('dark');
          }}
        />
      </Row>
      {error && <Txt style={{ color: colors.red }}>{t('storageError')}</Txt>}
    </View>
  );
}
