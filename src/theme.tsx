import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { loadTheme, persistTheme } from './storage';
import { ThemeDocument } from './ThemeDocument';

export const lightColors = {
  bg: '#FAFAF7',
  surface: '#FFFFFF',
  ink: '#202224',
  muted: '#72777B',
  line: '#E0E2DD',
  red: '#CB4847',
  mint: '#E2F3EB',
  green: '#14765C',
  amber: '#A96C1E',
  blue: '#3156D3',
  white: '#FFFFFF',
  primary: '#3156D3',
  inverse: '#FFFFFF',
  strong: '#202224',
  soft: '#EEEFEA',
  blueSoft: '#EAF0FF',
  warningSoft: '#FCF2D9',
  errorSoft: '#FBEAEA',
  label: '#566B76',
  inputLine: '#DCE4E8',
  code: '#32739C',
  conduite: '#27775E',
  manoeuvre: '#9A6A34',
};
export type Palette = typeof lightColors;
export const darkColors: Palette = {
  bg: '#121619',
  surface: '#1C2227',
  ink: '#F0F3F5',
  muted: '#ADB7BF',
  line: '#354149',
  red: '#FF9398',
  mint: '#183A30',
  green: '#82DDB5',
  amber: '#EDC279',
  blue: '#A1B8FF',
  white: '#FFFFFF',
  primary: '#345DD2',
  inverse: '#FFFFFF',
  strong: '#304050',
  soft: '#283138',
  blueSoft: '#24334D',
  warningSoft: '#3B3220',
  errorSoft: '#44282C',
  label: '#C6D1D8',
  inputLine: '#46545F',
  code: '#93C9F2',
  conduite: '#86DBB5',
  manoeuvre: '#E6BC85',
};
export type ThemeMode = 'light' | 'dark';
const Theme = createContext({
  mode: 'light' as ThemeMode,
  colors: lightColors,
  setMode: async (_mode: ThemeMode) => {},
});
export const useTheme = () => useContext(Theme);
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [mode, updateMode] = useState<ThemeMode>(
    system === 'dark' ? 'dark' : 'light',
  );
  const changed = useRef(false);
  useEffect(() => {
    let active = true;
    loadTheme()
      .then(saved => {
        if (active && saved && !changed.current) updateMode(saved);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  const colors = mode === 'dark' ? darkColors : lightColors;
  return (
    <Theme.Provider
      value={{
        mode,
        colors,
        setMode: async next => {
          changed.current = true;
          await persistTheme(next);
          updateMode(next);
        },
      }}
    >
      <StatusBar
        barStyle={mode === 'dark' ? 'light-content' : 'dark-content'}
      />
      <ThemeDocument mode={mode} background={colors.bg} />
      {children}
    </Theme.Provider>
  );
}
