import React from 'react';
import notifee from '@notifee/react-native';
import ReactTestRenderer from 'react-test-renderer';
import { createAsyncStorage } from '@react-native-async-storage/async-storage';
import App from '../App';
import {
  blankPayments,
  blankRates,
  blankResults,
  emptyData,
  parseBackup,
  Student,
  tunisNow,
  studentAccount,
} from '../src/domain';
import { Button, Chip, Field } from '../src/ui';
import { StudentAccount } from '../src/account';

const db = (createAsyncStorage as jest.Mock).mock.results[0].value;
const student: Student = {
  id: 'test',
  name: 'Test élève',
  phone: '',
  stage: 'code',
  notes: '',
  archived: false,
  hourlyRate: 30000,
  rates: blankRates(),
  amountPaid: 0,
  paidByStage: blankPayments(),
  examResults: blankResults(),
};
let renderer: ReturnType<typeof ReactTestRenderer.create>;
beforeEach(async () => {
  const data = emptyData();
  data.students = [student];
  data.settings.rates = { code: 10000, conduite: 30000, manoeuvre: 35000 };
  db.getItem.mockResolvedValue(JSON.stringify(data));
  db.setItem.mockReset().mockResolvedValue(undefined);
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<App />);
  });
});
afterEach(async () => {
  await ReactTestRenderer.act(async () => {
    renderer.unmount();
  });
});
async function pressAccessible(label: string) {
  await ReactTestRenderer.act(async () => {
    renderer.root
      .findAll(
        n =>
          n.props.accessibilityLabel === label &&
          typeof n.props.onPress === 'function',
      )[0]
      .props.onPress();
  });
}
async function pressButton(title: string) {
  await ReactTestRenderer.act(async () => {
    renderer.root
      .findAllByType(Button)
      .find(n => n.props.title === title)!
      .props.onPress();
  });
}
async function pressChip(title: string) {
  await ReactTestRenderer.act(async () => {
    renderer.root
      .findAllByType(Chip)
      .find(n => n.props.title === title)!
      .props.onPress();
  });
}
async function fill(label: string, value: string) {
  await ReactTestRenderer.act(async () => {
    renderer.root
      .findAllByType(Field)
      .find(n => n.props.label === label)!
      .props.onChange(value);
  });
}
const savedData = () => parseBackup(db.setItem.mock.calls.at(-1)[1]);

test('new candidate needs one price then manual hours ask paid or unpaid and update the category cards', async () => {
  await pressAccessible('Nouvel élève');
  await fill('Nom et prénom', 'Ines');
  await pressButton('Enregistrer');
  expect(db.setItem).not.toHaveBeenCalled();
  await fill('Tarif horaire du candidat · DT', '25');
  await pressButton('Enregistrer');
  expect(
    renderer.root.findByType(StudentAccount).props.student.hourlyRate,
  ).toBe(25000);
  const id = savedData().students.find(s => s.name === 'Ines')!.id;
  await pressAccessible('Ajouter des heures');
  expect(
    renderer.root
      .findAllByType(Field)
      .some(n => n.props.label.includes('Tarif')),
  ).toBe(false);
  expect(
    renderer.root
      .findAllByType(Field)
      .some(n => n.props.label.includes('Nombre d’heures')),
  ).toBe(false);
  await pressButton('Continuer au paiement');
  expect(savedData().hourEntries).toHaveLength(0);
  await pressButton('Payé · Enregistrer');
  expect(savedData().hourEntries[0]).toMatchObject({
    duration: 60,
    paid: true,
    paidAmount: 25000,
  });
  await pressAccessible('Ouvrir la catégorie · Conduite');
  await pressAccessible('Ajouter des heures');
  await pressButton('Continuer au paiement');
  await pressButton('Non payé · Enregistrer');
  const d = savedData();
  expect(studentAccount(d, d.students.find(s => s.id === id)!)).toMatchObject({
    minutes: 120,
    total: 50000,
    paid: 25000,
    due: 25000,
  });
});

test('failed storage save keeps the payment prompt open and retry does not duplicate an hour', async () => {
  await pressAccessible('Test élève');
  await pressAccessible('Ajouter des heures');
  await pressButton('Continuer au paiement');
  db.setItem.mockRejectedValueOnce(new Error('disk full'));
  await pressButton('Payé · Enregistrer');
  expect(
    renderer.root
      .findAllByType(Button)
      .some(n => n.props.title === 'Payé · Enregistrer'),
  ).toBe(true);
  await pressButton('Payé · Enregistrer');
  expect(savedData().hourEntries).toHaveLength(1);
  expect(savedData().hourEntries[0].paidAmount).toBe(30000);
});
test('reminders are enabled explicitly and their preferences are saved', async () => {
  await pressAccessible('Réglages');
  await pressButton('Activer les rappels');
  expect(notifee.requestPermission).toHaveBeenCalled();
  expect(savedData().settings.reminders).toEqual({
    enabled: true,
    morning: true,
    before: true,
    after: true,
  });
  await pressButton('Désactiver les rappels');
  expect(savedData().settings.reminders?.enabled).toBe(false);
});
test('a payment reminder opens the right lesson and review preserves existing money totals', async () => {
  await pressAccessible(`Planifier ${tunisNow().date} 10:00`);
  await pressButton('Continuer au paiement');
  await pressButton('Non payé · Enregistrer');
  const lessonId = savedData().lessons[0].id;
  const listener = (notifee.onForegroundEvent as jest.Mock).mock.calls.at(
    -1,
  )[0];
  await ReactTestRenderer.act(async () => {
    listener({
      type: 1,
      detail: { notification: { data: { kind: 'after', lessonId } } },
    });
  });
  await pressChip('Payée');
  expect(savedData().lessons[0]).toMatchObject({
    paid: true,
    paymentReviewed: true,
  });
  expect(savedData().students[0].paidByStage.code).toBe(0);
  await pressChip('Non payée');
  expect(savedData().lessons[0]).toMatchObject({
    paid: false,
    paymentReviewed: true,
  });
  await pressButton('Mettre à jour le montant reçu');
  expect(
    renderer.root
      .findAllByType(Field)
      .some(n => n.props.label.includes('Code')),
  ).toBe(true);
});
test('a free diary slot opens a one-hour booking at the selected time', async () => {
  const day = tunisNow().date;
  await pressAccessible(`Planifier ${day} 10:00`);
  expect(
    renderer.root
      .findAllByType(Field)
      .find(n => n.props.label === 'Heure · HH:MM')!.props.value,
  ).toBe('10:00');
  await pressButton('Continuer au paiement');
  await pressButton('Non payé · Enregistrer');
  expect(savedData().lessons[0]).toMatchObject({
    date: day,
    start: '10:00',
    duration: 60,
    status: 'planned',
  });
});
test('success selects the next category and scheduling uses it; the final exam shows completion', async () => {
  await pressAccessible('Test élève');
  await pressButton('Réussi');
  expect(renderer.root.findByType(StudentAccount).props.student.stage).toBe(
    'conduite',
  );
  await ReactTestRenderer.act(async () => {
    renderer.root
      .findByType(StudentAccount)
      .findAll(
        n =>
          n.props.accessibilityLabel === 'Planifier' &&
          typeof n.props.onPress === 'function',
      )[0]
      .props.onPress();
  });
  expect(
    renderer.root.findAllByType(Chip).find(n => n.props.title === 'Conduite')!
      .props.active,
  ).toBe(true);
  await pressAccessible('Retour');
  expect(renderer.root.findByType(StudentAccount).props.student.id).toBe(
    'test',
  );
  await pressButton('Réussi');
  expect(savedData().students[0].stage).toBe('manoeuvre');
  await pressButton('Réussi');
  expect(JSON.stringify(renderer.toJSON())).toContain('Parcours terminé');
  expect(savedData().students[0].examResults).toEqual({
    code: 'passed',
    conduite: 'passed',
    manoeuvre: 'passed',
  });
});

test('calendar day click opens the correct date and selected hour/minute are saved with the candidate', async () => {
  await pressAccessible('Agenda');
  const day = `${tunisNow().date.slice(0, 7)}-20`;
  await pressAccessible(day);
  expect(
    renderer.root
      .findAllByType(Field)
      .find(n => n.props.label === 'Date · AAAA-MM-JJ')!.props.value,
  ).toBe(day);
  await pressAccessible('14 h');
  await pressChip('30 min');
  await pressChip('Conduite');
  await pressButton('Continuer au paiement');
  await pressButton('Non payé · Enregistrer');
  expect(savedData().lessons).toHaveLength(1);
  expect(savedData().lessons[0]).toMatchObject({
    studentId: 'test',
    date: day,
    start: '14:30',
    type: 'conduite',
    duration: 60,
    status: 'planned',
  });
});
test('student profile persists exam results and per-category payments separately', async () => {
  await pressAccessible('Test élève');
  await pressButton('Échoué');
  expect(savedData().students[0].examResults.code).toBe('failed');
  await pressButton('Corriger le résultat / nouvelle tentative');
  await pressButton('Réussi');
  expect(savedData().students[0].examResults.code).toBe('passed');
  expect(savedData().students[0].stage).toBe('conduite');
  await pressAccessible('Ouvrir la catégorie · Conduite');
  await pressButton('Échoué');
  expect(savedData().students[0].examResults).toMatchObject({
    code: 'passed',
    conduite: 'failed',
  });
  await pressAccessible('Ouvrir la catégorie · Manœuvre');
  expect(
    renderer.root.findAll(
      n => n.props.accessibilityLabel === 'Ajouter des heures',
    ).length > 0,
  ).toBe(true);
  await pressAccessible('Bilan des paiements');
  await pressButton('Paiements par catégorie');
  await fill('Autres versements · Code · DT', '10');
  await fill('Autres versements · Conduite · DT', '20,500');
  await fill('Autres versements · Manœuvre · DT', '0');
  await pressButton('Enregistrer');
  expect(savedData().students[0].paidByStage).toEqual({
    code: 10000,
    conduite: 20500,
    manoeuvre: 0,
  });
  expect(
    renderer.root.findByType(StudentAccount).props.student.examResults.code,
  ).toBe('passed');
  expect(savedData().settings.rates).toEqual({
    code: 10000,
    conduite: 30000,
    manoeuvre: 35000,
  });
});
test('candidate tariff editor saves one candidate-specific price and returns to the same profile', async () => {
  await pressAccessible('Test élève');
  await pressAccessible('Tarif horaire du candidat');
  await fill('Tarif horaire du candidat · DT', '40');
  await pressButton('Enregistrer');
  expect(savedData().students[0].hourlyRate).toBe(40000);
  expect(savedData().settings.rates.conduite).toBe(30000);
  expect(renderer.root.findByType(StudentAccount).props.student.id).toBe(
    'test',
  );
});
