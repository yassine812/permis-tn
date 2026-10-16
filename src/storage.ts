import { createAsyncStorage } from '@react-native-async-storage/async-storage';
import { Data, emptyData, parseBackup } from './domain';

const storage = createAsyncStorage('permisTN');
const key = 'data.v4';
export async function loadTheme(): Promise<'light' | 'dark' | null> {
  const value = await storage.getItem('appearance');
  return value === 'light' || value === 'dark' ? value : null;
}
export async function persistTheme(value: 'light' | 'dark'): Promise<void> {
  await storage.setItem('appearance', value);
}
export async function loadData(): Promise<Data> {
  const raw = await storage.getItem(key);
  if (raw !== null) {
    return parseBackup(raw);
  }
  const previous =
    (await storage.getItem('data.v3')) ?? (await storage.getItem('data.v2'));
  if (previous === null) {
    return emptyData();
  }
  const migrated = parseBackup(previous);
  await storage.setItem(key, JSON.stringify(migrated));
  return migrated;
}
export async function persistData(data: Data): Promise<void> {
  await storage.setItem(key, JSON.stringify(data));
}
