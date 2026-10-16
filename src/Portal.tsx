import React from 'react';
import type { Data, Student } from './domain';
import type { Commit } from './forms';
export function PortalProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
export function usePortalSync(_data: Data | null) {}
export function PortalSettings() {
  return null;
}
export function StudentAccess(_props: {
  student: Student;
  commit: Commit;
  busy: boolean;
}) {
  return null;
}
export function StudentLoginLink() {
  return null;
}
