import { createAsyncStorage } from '@react-native-async-storage/async-storage';
import { emptyData } from '../src/domain';
import { loadData, persistData } from '../src/storage';

const db = (createAsyncStorage as jest.Mock).mock.results[0].value;
beforeEach(() => {
  db.getItem.mockReset();
  db.setItem.mockReset();
});
test('first launch is empty and never inserts demo records', async () => {
  db.getItem.mockResolvedValue(null);
  expect(await loadData()).toEqual(emptyData());
});
test('a saved document is validated and restored', async () => {
  const data = emptyData();
  data.settings.school = 'Auto-école Tunis';
  db.setItem.mockResolvedValue(undefined);
  await persistData(data);
  expect(db.setItem).toHaveBeenCalledWith('data.v4', JSON.stringify(data));
  db.getItem.mockResolvedValue(JSON.stringify(data));
  expect(await loadData()).toEqual(data);
});
test('corrupt data and write failures are surfaced, never silently reset', async () => {
  db.getItem.mockResolvedValue('{invalid');
  await expect(loadData()).rejects.toThrow('backupError');
  expect(db.setItem).not.toHaveBeenCalled();
  db.setItem.mockRejectedValue(new Error('disk full'));
  await expect(persistData(emptyData())).rejects.toThrow('disk full');
});

test('loads and saves v2 migration without overwriting the original key', async () => {
  const old = { ...emptyData(), version: 2 };
  db.getItem.mockImplementation(async (key: string) =>
    key === 'data.v2' ? JSON.stringify(old) : null,
  );
  db.setItem.mockResolvedValue(undefined);
  expect((await loadData()).version).toBe(4);
  expect(db.setItem).toHaveBeenCalledTimes(1);
  expect(db.setItem.mock.calls[0][0]).toBe('data.v4');
});
