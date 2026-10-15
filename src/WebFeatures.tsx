import type { Data } from './domain';
export function WebInstall(_props: { compact?: boolean }) {
  return null;
}
export function BackupDownload(_props: { data: Data }) {
  return null;
}
export function BackupFilePicker(_props: {
  onRead: (text: string) => void;
  onError: () => void;
}) {
  return null;
}
