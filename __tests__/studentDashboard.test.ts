import {
  blankPayments,
  blankRates,
  blankResults,
  emptyData,
} from '../src/domain';
import { createStudentDashboard } from '../src/studentDashboard';
test('student dashboard includes only the selected financial summary, never private contact details or other students', () => {
  const data = emptyData();
  data.students = ['Ines', 'Amine'].map((name, i) => ({
    id: `s${i}`,
    name,
    phone: '22123456',
    notes: 'private instructor notes',
    stage: 'code',
    archived: false,
    rates: blankRates(),
    hourlyRate: 30000,
    amountPaid: 0,
    paidByStage: blankPayments(),
    examResults: blankResults(),
  }));
  data.hourEntries = [
    {
      id: 'one',
      studentId: 's0',
      type: 'code',
      duration: 60,
      date: '2026-10-15',
      notes: 'private lesson note',
      paid: true,
      paidAmount: 30000,
    },
  ];
  const dashboard = createStudentDashboard(data, 's0');
  expect(dashboard).toMatchObject({
    name: 'Ines',
    minutes: 60,
    total: 30000,
    paid: 30000,
    due: 0,
  });
  const raw = JSON.stringify(dashboard);
  for (const value of [
    'Amine',
    '22123456',
    'private instructor notes',
    'private lesson note',
    'password',
    's1',
  ])
    expect(raw).not.toContain(value);
  data.students[0].archived = true;
  expect(() => createStudentDashboard(data, 's0')).toThrow('studentError');
});
