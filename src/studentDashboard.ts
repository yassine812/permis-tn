import { Data, Stage, Student, studentAccount } from './domain';

// Only the selected candidate's public-facing account summary leaves the instructor view.
// Phone numbers, private notes, other candidates and instructor settings are excluded.
export type StudentDashboardData = {
  version: 1;
  updatedAt: string;
  school: string;
  name: string;
  stage: Stage;
  categories: {
    stage: Stage;
    minutes: number;
    rate: number | null;
    total: number | null;
    paid: number;
    due: number | null;
    credit: number | null;
    result: Student['examResults'][Stage];
  }[];
  minutes: number;
  total: number | null;
  paid: number | null;
  due: number | null;
  credit: number | null;
};

export function createStudentDashboard(
  data: Data,
  studentId: string,
  now = new Date(),
): StudentDashboardData {
  const student = data.students.find(s => s.id === studentId && !s.archived);
  if (!student) {
    throw new Error('studentError');
  }
  const account = studentAccount(data, student);
  return {
    version: 1,
    updatedAt: now.toISOString(),
    school: data.settings.school,
    name: student.name,
    stage: student.stage,
    categories: account.byStage.map(row => ({
      stage: row.stage,
      minutes: row.minutes,
      rate: row.rate,
      total: row.total,
      paid: row.paid,
      due: row.due,
      credit: row.credit,
      result: student.examResults[row.stage],
    })),
    minutes: account.minutes,
    total: account.total,
    paid: account.paid,
    due: account.due,
    credit: account.credit,
  };
}
