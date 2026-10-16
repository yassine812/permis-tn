/* eslint-env browser */
import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Button, colors, Icon, Locale, Row, Txt } from './ui';
import { dateLabel, hours, money } from './domain';
import { translate } from './i18n';
import { LoginForm, portalCopy, portalRequest } from './Portal.web';
import { styles as s } from './styles';

export default function StudentPortal() {
  const [language, setLanguage] = useState('fr');
  const [role, setRole] = useState(null),
    [dashboard, setDashboard] = useState(null);
  const [busy, setBusy] = useState(true),
    [error, setError] = useState('');
  const text = portalCopy[language],
    t = key => translate(language, key);
  const copy =
    language === 'fr'
      ? {
          title: 'Votre parcours, en un regard.',
          intro: 'Les identifiants vous sont remis par votre moniteur.',
          refresh: 'Actualiser mon bilan',
          updated: 'Dernière mise à jour par le moniteur',
          readOnly:
            'Consultation uniquement · Pour une correction, contactez votre moniteur.',
          owner: 'Vous êtes connecté comme moniteur.',
          back: 'Ouvrir mon carnet',
          loading: 'Ouverture de votre espace…',
          incomplete: 'Votre moniteur doit encore compléter certains montants.',
          details: 'Vos trois étapes',
          offline:
            'Connexion indisponible. Ce bilan reste affiché, mais il peut avoir changé. Réessayez en ligne.',
          history:
            'Les heures prévues ne sont pas encore comptées comme effectuées. Un paiement anticipé apparaît comme une avance.',
        }
      : {
          title: 'وين وصلت في تكوينك.',
          intro: 'المونيتور يعطيك المعرّف وكلمة السر.',
          refresh: 'حدّث حسابي',
          updated: 'آخر تحديث من المونيتور',
          readOnly: 'للاطّلاع برك · إذا فمّا غلطة احكي مع المونيتور.',
          owner: 'إنت داخل بحساب المونيتور.',
          back: 'حلّ دفتري',
          loading: 'نحلّوا في حسابك…',
          incomplete: 'المونيتور مازال يلزمو يكمّل بعض المبالغ.',
          details: 'المراحل الثلاثة',
          offline:
            'ما فماش اتصال. الحساب هذا ينجم يكون تبدّل، عاود جرّب بالإنترنت.',
          history:
            'الحصص المبرمجة ما تتحسبش كساعات تعدّاو. الخلاص المسبق يظهر كتسبقة.',
        };
  const refresh = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      const result = await portalRequest('dashboard');
      setDashboard(result.dashboard);
      setRole('student');
    } catch (e) {
      if (e.message === 'loginRequired') {
        setRole(null);
        setDashboard(null);
      }
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }, []);
  useEffect(() => {
    portalRequest('session')
      .then(async result => {
        setRole(result.role);
        if (result.role === 'student') await refresh();
      })
      .catch(e => setError(e.message))
      .finally(() => setBusy(false));
  }, [refresh]);
  useEffect(() => {
    if (role !== 'student') return;
    const update = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    const timer = setInterval(update, 300000);
    window.addEventListener('online', update);
    document.addEventListener('visibilitychange', update);
    return () => {
      clearInterval(timer);
      window.removeEventListener('online', update);
      document.removeEventListener('visibilitychange', update);
    };
  }, [role, refresh]);
  useEffect(() => {
    document.documentElement.lang = language === 'fr' ? 'fr-TN' : 'ar-TN';
  }, [language]);
  return (
    <SafeAreaProvider>
      <Locale.Provider value={language}>
        <SafeAreaView style={s.root}>
          <View style={s.shell}>
            <ScrollView
              contentContainerStyle={[s.content, { paddingTop: 24, gap: 24 }]}
            >
              <Row style={{ justifyContent: 'space-between' }}>
                <View>
                  <Txt style={s.logo}>permis tn.</Txt>
                  <Txt style={s.kicker}>{text.title.toUpperCase()}</Txt>
                </View>
                <Button
                  compact
                  secondary
                  title={language === 'fr' ? 'عربي' : 'Français'}
                  onPress={() => setLanguage(language === 'fr' ? 'ar' : 'fr')}
                />
              </Row>
              {busy && !dashboard && <Txt>{copy.loading}</Txt>}
              {role === 'owner' ? (
                <>
                  <Txt>{copy.owner}</Txt>
                  <Button
                    title={copy.back}
                    onPress={() => {
                      window.location.href = '?espace=moniteur';
                    }}
                  />
                </>
              ) : (
                !role && (
                  <>
                    <Icon name="book" color={colors.blue} size={40} />
                    <Txt style={s.hero}>{copy.title}</Txt>
                    <Txt style={s.muted}>{copy.intro}</Txt>
                    <LoginForm
                      onLogin={async (username, password) => {
                        const result = await portalRequest('login', {
                          username,
                          password,
                        });
                        setRole(result.role);
                        if (result.role === 'student') await refresh();
                      }}
                    />
                  </>
                )
              )}
              {!!error && (
                <View
                  accessibilityRole="alert"
                  style={{
                    padding: 14,
                    backgroundColor: '#FFF1DF',
                    borderRadius: 10,
                  }}
                >
                  <Txt>{text[error] || copy.offline}</Txt>
                </View>
              )}
              {dashboard && role === 'student' && (
                <>
                  <View style={{ gap: 8 }}>
                    <Txt style={s.kicker}>{dashboard.school}</Txt>
                    <Txt style={s.hero}>{dashboard.name}</Txt>
                    <Txt>
                      {t('currentLevel')} · {t(dashboard.stage)}
                    </Txt>
                  </View>
                  <View
                    style={{
                      backgroundColor: colors.ink,
                      padding: 24,
                      borderRadius: 14,
                      gap: 12,
                    }}
                  >
                    <Txt style={{ color: '#DCE2E0', fontSize: 13 }}>
                      {t('completedHours')}
                    </Txt>
                    <Txt
                      style={{ color: '#fff', fontSize: 46, fontWeight: '800' }}
                    >
                      {hours(dashboard.minutes)}{' '}
                      <Txt style={{ color: '#fff', fontSize: 18 }}>h</Txt>
                    </Txt>
                  </View>
                  <Row style={{ alignItems: 'stretch' }}>
                    <View style={[s.metric, { backgroundColor: colors.mint }]}>
                      <Txt style={s.muted}>{t('amountPaid')}</Txt>
                      <Txt
                        style={{
                          fontSize: 20,
                          fontWeight: '700',
                          color: colors.green,
                        }}
                      >
                        {money(dashboard.paid, language)}
                      </Txt>
                    </View>
                    <View style={s.metric}>
                      <Txt style={s.muted}>{t('balanceDue')}</Txt>
                      <Txt
                        style={{
                          fontSize: 20,
                          fontWeight: '700',
                          color: colors.red,
                        }}
                      >
                        {money(dashboard.due, language)}
                      </Txt>
                    </View>
                  </Row>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <Txt>{t('totalCost')}</Txt>
                    <Txt style={{ fontWeight: '700' }}>
                      {money(dashboard.total, language)}
                    </Txt>
                  </Row>
                  {!!dashboard.credit && (
                    <Txt style={{ color: colors.green }}>
                      {t('credit')} : {money(dashboard.credit, language)}
                    </Txt>
                  )}
                  {(dashboard.paid === null || dashboard.total === null) && (
                    <Txt style={s.muted}>{copy.incomplete}</Txt>
                  )}
                  <Txt style={s.sectionTitle}>{copy.details}</Txt>
                  {dashboard.categories.map(row => (
                    <View
                      key={row.stage}
                      style={[s.card, { padding: 20, gap: 12 }]}
                    >
                      <Row style={{ justifyContent: 'space-between' }}>
                        <Txt style={s.sectionTitle}>{t(row.stage)}</Txt>
                        <Txt style={{ fontSize: 22, fontWeight: '700' }}>
                          {hours(row.minutes)} h
                        </Txt>
                      </Row>
                      <Txt style={s.muted}>{t(row.result)}</Txt>
                      <Row style={{ justifyContent: 'space-between' }}>
                        <Txt>{t('hourPrice')}</Txt>
                        <Txt>{money(row.rate, language)}</Txt>
                      </Row>
                      <Row style={{ justifyContent: 'space-between' }}>
                        <Txt>{t('amountPaid')}</Txt>
                        <Txt style={{ color: colors.green, fontWeight: '700' }}>
                          {money(row.paid, language)}
                        </Txt>
                      </Row>
                      <Row style={{ justifyContent: 'space-between' }}>
                        <Txt>{t('balanceDue')}</Txt>
                        <Txt style={{ color: colors.red, fontWeight: '700' }}>
                          {money(row.due, language)}
                        </Txt>
                      </Row>
                      {!!row.credit && (
                        <Txt>
                          {t('credit')} : {money(row.credit, language)}
                        </Txt>
                      )}
                    </View>
                  ))}
                  <Txt style={s.muted}>{copy.history}</Txt>
                  <Txt style={s.muted}>
                    {copy.updated} :{' '}
                    {dateLabel(dashboard.updatedAt.slice(0, 10), language)} ·{' '}
                    {new Date(dashboard.updatedAt).toLocaleTimeString(
                      language === 'fr' ? 'fr-TN' : 'ar-TN',
                      {
                        timeZone: 'Africa/Tunis',
                        hour: '2-digit',
                        minute: '2-digit',
                      },
                    )}
                  </Txt>
                  <Button
                    title={copy.refresh}
                    disabled={busy}
                    onPress={() => {
                      void refresh();
                    }}
                  />
                  <Txt style={s.muted}>{copy.readOnly}</Txt>
                </>
              )}
              {!!role && (
                <Button
                  secondary
                  title={text.signOut}
                  disabled={busy}
                  onPress={async () => {
                    setBusy(true);
                    try {
                      await portalRequest('logout', {});
                      setRole(null);
                      setDashboard(null);
                      setError('');
                    } catch (e) {
                      setError(e.message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                />
              )}
            </ScrollView>
          </View>
        </SafeAreaView>
      </Locale.Provider>
    </SafeAreaProvider>
  );
}
