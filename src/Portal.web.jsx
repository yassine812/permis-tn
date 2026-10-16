import { useTheme } from './theme';
/* eslint-env browser */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { View } from 'react-native';
import { Button, Field, Locale, Txt } from './ui';
import { createStudentDashboard } from './studentDashboard';
import { saveStudent } from './domain';
import { useStyles } from './styles';
import { rememberAudience } from './portalAudience.web';

export const studentPortalURL = 'https://permis-tn.vercel.app/?espace=eleve';
export const portalCopy = {
  fr: {
    title: 'Espace élève',
    owner: 'Connexion du moniteur',
    login: 'Identifiant',
    password: 'Mot de passe',
    signIn: 'Se connecter',
    signOut: 'Se déconnecter',
    loginHint:
      'Connectez votre compte moniteur pour créer les accès et envoyer les bilans à vos élèves.',
    accessHint:
      'L’élève peut consulter ses heures et paiements. Il ne peut rien modifier.',
    ownerReady: 'Compte moniteur connecté',
    syncing: 'Envoi des bilans…',
    synced: 'Bilans synchronisés',
    local: 'Aucun accès élève activé',
    offline:
      'Hors connexion : les modifications restent sur cet appareil. Rouvrez l’app connectée pour les envoyer.',
    signin: 'Connectez le moniteur pour synchroniser les bilans.',
    retry: 'Synchroniser maintenant',
    link: 'Ouvrir la connexion élève',
    enable: 'Créer l’accès élève',
    disable: 'Désactiver l’accès',
    disabled: 'Accès désactivé',
    pending: 'Création de l’accès en attente de connexion.',
    revoking:
      'Désactivation en attente de synchronisation. L’ancien accès reste actif jusque-là.',
    reset: 'Réinitialiser le mot de passe',
    resetHint:
      'L’ancien mot de passe et les connexions en cours ne fonctionneront plus.',
    confirm: 'Confirmer',
    cancel: 'Annuler',
    copy: 'Copier les identifiants',
    copied: 'Identifiants copiés',
    copyHint: 'Remettez ces identifiants uniquement à cet élève.',
    passwordOnce:
      'Le mot de passe est affiché uniquement après sa création ou réinitialisation. Conservez-le avant de fermer la page.',
    passwordHidden:
      'Pour obtenir un nouveau mot de passe à remettre à l’élève, réinitialisez son accès.',
    error:
      'Impossible de synchroniser pour le moment. Vos données locales sont conservées.',
    invalidLogin: 'Identifiant ou mot de passe incorrect.',
    locked: 'Trop de tentatives. Réessayez dans 15 minutes.',
    ownerRequired: 'Utilisez le compte moniteur pour cette action.',
    loginRequired: 'Votre session a expiré. Reconnectez-vous.',
    notConfigured: 'L’espace en ligne n’est pas encore disponible.',
    invalidData: 'Le bilan ne peut pas être envoyé. Vérifiez les données.',
    accountLimit: 'La limite de 500 accès de cette école est atteinte.',
    retryError: 'Une mise à jour est en cours. Réessayez.',
    studentConnected:
      'Ce compte est un compte élève. Ouvrez son tableau de bord.',
    lastSync: 'Dernier envoi',
    privacy:
      'Seuls le nom de l’élève, les heures, tarifs, résultats d’examen et montants sont envoyés dans le stockage privé en ligne. Les notes et numéros de téléphone restent sur cet appareil.',
    free: 'Offre gratuite Vercel, dans ses quotas. Internet est nécessaire pour les connexions et la mise à jour des bilans.',
  },
  ar: {
    title: 'فضاء التلميذ',
    owner: 'دخول المونيتور',
    login: 'المعرّف',
    password: 'كلمة السر',
    signIn: 'ادخل',
    signOut: 'اخرج',
    loginHint:
      'ادخل بحساب المونيتور باش تعمل حسابات للتلامذة وتبعثلهم حساباتهم.',
    accessHint: 'التلميذ يشوف ساعاتو وخلاصو برك، ما ينجم يبدّل شيء.',
    ownerReady: 'حساب المونيتور متّصل',
    syncing: 'نبعثوا في الحسابات…',
    synced: 'الحسابات تحدّثت',
    local: 'ما فماش حساب تلميذ مفعّل',
    offline:
      'بلا إنترنت: التغييرات محفوظة في الجهاز. عاود حلّ التطبيق بالإنترنت باش تتبعث.',
    signin: 'ادخل بحساب المونيتور باش تبعث التحديثات.',
    retry: 'حدّث توّا',
    link: 'حلّ دخول التلميذ',
    enable: 'اعمل حساب للتلميذ',
    disable: 'عطّل الدخول',
    disabled: 'الدخول معطّل',
    pending: 'إنشاء الحساب يستنّى الاتصال.',
    revoking: 'تعطيل الدخول يستنّى التحديث. الحساب القديم مازال يخدم لوقتها.',
    reset: 'بدّل كلمة السر',
    resetHint: 'كلمة السر القديمة والجلسات المفتوحة ما عادش يخدموا.',
    confirm: 'أكّد',
    cancel: 'إلغاء',
    copy: 'انسخ معلومات الدخول',
    copied: 'تنسخوا معلومات الدخول',
    copyHint: 'أعطي المعلومات هاذم كان للتلميذ المعني.',
    passwordOnce:
      'كلمة السر تظهر كان وقت الإنشاء ولا التبديل. احفظها قبل ما تسكّر الصفحة.',
    passwordHidden: 'باش تاخو كلمة سر جديدة للتلميذ، اضغط بدّل كلمة السر.',
    error: 'ما نجّمناش نحدّثوا توّا. معطياتك المحلية محفوظة.',
    invalidLogin: 'المعرّف ولا كلمة السر غالط.',
    locked: 'محاولات برشة. عاود بعد ربع ساعة.',
    ownerRequired: 'استعمل حساب المونيتور للعملية هاذي.',
    loginRequired: 'وفات مدة الدخول، عاود ادخل.',
    notConfigured: 'الفضاء ما زال موش متاح.',
    invalidData: 'الحساب ما تبعثش. راجع المعطيات.',
    accountLimit: 'وصلت للحدّ الأقصى: 500 حساب.',
    retryError: 'فمّا تحديث توّا، عاود جرّب.',
    studentConnected: 'هذا حساب تلميذ. حلّ لوحة الحساب متاعو.',
    lastSync: 'آخر تحديث',
    privacy:
      'كان الاسم والساعات والأسوام ونتائج الامتحانات والمبالغ يتبعثوا للتخزين الخاص. النوطات والتليفونات يبقاو في جهازك.',
    free: 'على عرض Vercel المجاني وفي حدودو. الدخول والتحديث يلزمهم إنترنت.',
  },
};
export async function portalRequest(action, body) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(`/api/portal?action=${action}`, {
      method: body === undefined ? 'GET' : 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      ...(body === undefined
        ? {}
        : {
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          }),
      signal: controller.signal,
    });
    const result = await response
      .json()
      .catch(() => ({ error: 'notConfigured' }));
    if (!response.ok) throw new Error(result.error || 'error');
    if (action === 'login') rememberAudience(result.role);
    return result;
  } finally {
    clearTimeout(timer);
  }
}
const Portal = createContext(null);
export function PortalProvider({ children }) {
  const [role, setRole] = useState(null);
  const [data, setData] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [credentials, setCredentials] = useState({});
  const [status, setStatus] = useState('signin');
  const [error, setError] = useState('');
  const [lastSync, setLastSync] = useState(null);
  const lock = useRef(false);
  const lastSent = useRef('');
  const payload = useMemo(
    () =>
      data
        ? data.students
            .filter(st => st.portalEnabled !== undefined)
            .map(st => ({
              id: st.id,
              enabled: !!st.portalEnabled && !st.archived,
              ...(st.portalEnabled && !st.archived
                ? { dashboard: createStudentDashboard(data, st.id) }
                : {}),
            }))
        : [],
    [data],
  );
  const current = useRef({ role, payload });
  current.current = { role, payload };
  const remember = useCallback(result => {
    if (result.accounts) setAccounts(result.accounts);
    if (result.credentials?.length)
      setCredentials(previous => ({
        ...previous,
        ...Object.fromEntries(result.credentials.map(row => [row.id, row])),
      }));
  }, []);
  const sync = useCallback(
    async (force = false) => {
      const state = current.current;
      if (state.role !== 'owner' || lock.current) return;
      if (!state.payload.length) {
        setStatus('local');
        return;
      }
      if (!navigator.onLine) {
        setStatus('offline');
        return;
      }
      const signature = JSON.stringify(state.payload);
      if (!force && signature === lastSent.current) return;
      lock.current = true;
      setStatus('syncing');
      setError('');
      try {
        remember(await portalRequest('sync', { students: state.payload }));
        lastSent.current = signature;
        setLastSync(new Date());
        setStatus('synced');
      } catch (e) {
        if (['ownerRequired', 'loginRequired'].includes(e.message)) {
          setRole(null);
          setStatus('signin');
        } else {
          setStatus(navigator.onLine ? 'error' : 'offline');
          setError(e.message);
        }
      } finally {
        lock.current = false;
      }
    },
    [remember],
  );
  useEffect(() => {
    portalRequest('session')
      .then(async result => {
        setRole(result.role);
        if (result.role === 'owner') remember(await portalRequest('accounts'));
      })
      .catch(() => {});
  }, [remember]);
  useEffect(() => {
    const timer = setTimeout(() => {
      void sync();
    }, 1500);
    return () => clearTimeout(timer);
  }, [payload, role, sync]);
  useEffect(() => {
    const retry = () => {
      void sync();
    };
    const timer = setInterval(retry, 30000);
    window.addEventListener('online', retry);
    window.addEventListener('focus', retry);
    return () => {
      clearInterval(timer);
      window.removeEventListener('online', retry);
      window.removeEventListener('focus', retry);
    };
  }, [sync]);
  const signIn = async (username, password) => {
    const result = await portalRequest('login', { username, password });
    setRole(result.role);
    setError('');
    lastSent.current = '';
    if (result.role === 'owner') remember(await portalRequest('accounts'));
    return result.role;
  };
  const signOut = async () => {
    await portalRequest('logout', {});
    setRole(null);
    setAccounts([]);
    setCredentials({});
    setStatus('signin');
    lastSent.current = '';
  };
  return (
    <Portal.Provider
      value={{
        role,
        setData,
        accounts,
        credentials,
        status,
        error,
        lastSync,
        sync,
        signIn,
        signOut,
        reset: async id => remember(await portalRequest('reset', { id })),
      }}
    >
      {children}
    </Portal.Provider>
  );
}
export function usePortalSync(data) {
  const portal = useContext(Portal);
  const setData = portal?.setData;
  useEffect(() => {
    setData?.(data);
  }, [data, setData]);
}
export function LoginForm({ onLogin, owner = false }) {
  const { colors } = useTheme();
  const language = useContext(Locale),
    text = portalCopy[language];
  const [username, setUsername] = useState(owner ? 'moniteur' : '');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  return (
    <View style={{ gap: 16 }}>
      <Field
        label={text.login}
        value={username}
        onChange={setUsername}
        ltr
        maxLength={60}
      />
      <View style={{ gap: 8 }}>
        <label
          htmlFor={owner ? 'owner-password' : 'student-password'}
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: colors.ink,
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          {text.password}
        </label>
        <input
          id={owner ? 'owner-password' : 'student-password'}
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          maxLength={128}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: 15,
            borderRadius: 8,
            border: `1px solid ${colors.line}`,
            fontSize: 16,
            fontFamily: 'system-ui, -apple-system, sans-serif',
            background: colors.surface,
            color: colors.ink,
          }}
        />
      </View>
      {!!error && (
        <View accessibilityRole="alert">
          <Txt style={{ color: colors.red }}>{text[error] || text.error}</Txt>
        </View>
      )}
      <Button
        title={text.signIn}
        disabled={busy || !username || !password}
        onPress={async () => {
          setBusy(true);
          setError('');
          try {
            await onLogin(username, password);
            setPassword('');
          } catch (e) {
            setError(e.message);
          } finally {
            setBusy(false);
          }
        }}
      />
    </View>
  );
}
export function StudentLoginLink() {
  const text = portalCopy[useContext(Locale)];
  return (
    <Button
      secondary
      title={text.link}
      onPress={() => {
        window.location.href = '?espace=eleve';
      }}
    />
  );
}
export function PortalSettings({ embedded = false }) {
  const { colors } = useTheme();
  const s = useStyles();
  const portal = useContext(Portal),
    language = useContext(Locale),
    text = portalCopy[language];
  const [error, setError] = useState('');
  return (
    <View style={embedded ? { gap: 16 } : [s.card, { padding: 20, gap: 16 }]}>
      {!embedded && <Txt style={s.sectionTitle}>{text.title}</Txt>}
      {!embedded && <Txt style={s.muted}>{text.privacy}</Txt>}
      {portal.role === 'owner' ? (
        <>
          <Txt style={{ color: colors.green, fontWeight: '700' }}>
            {text.ownerReady}
          </Txt>
          <Txt>{text[portal.status] || text.error}</Txt>
          {portal.lastSync && (
            <Txt style={s.muted}>
              {text.lastSync} ·{' '}
              {portal.lastSync.toLocaleTimeString(
                language === 'fr' ? 'fr-TN' : 'ar-TN',
              )}
            </Txt>
          )}
          <Button
            title={text.retry}
            disabled={portal.status === 'syncing'}
            onPress={() => {
              void portal.sync(true);
            }}
          />
          <Button
            secondary
            title={text.signOut}
            onPress={() => {
              void portal.signOut().catch(() => setError(text.error));
            }}
          />
        </>
      ) : portal.role === 'student' ? (
        <>
          <Txt>{text.studentConnected}</Txt>
          <StudentLoginLink />
        </>
      ) : (
        <>
          <Txt style={{ fontWeight: '700' }}>{text.owner}</Txt>
          <Txt style={s.muted}>{text.loginHint}</Txt>
          <LoginForm owner onLogin={portal.signIn} />
        </>
      )}
      {!!error && <Txt style={{ color: colors.red }}>{error}</Txt>}
      {!embedded && <Txt style={s.muted}>{text.free}</Txt>}
    </View>
  );
}
export function StudentAccess({ student, commit, busy }) {
  const { colors } = useTheme();
  const s = useStyles();
  const portal = useContext(Portal),
    text = portalCopy[useContext(Locale)];
  const account = portal.accounts.find(a => a.id === student.id);
  const fresh = portal.credentials[student.id];
  const [error, setError] = useState(''),
    [copied, setCopied] = useState(false),
    [resetting, setResetting] = useState(false),
    [working, setWorking] = useState(false);
  return (
    <View style={[s.card, { padding: 20, gap: 14 }]}>
      <Txt style={s.sectionTitle}>{text.title}</Txt>
      <Txt style={s.muted}>{text.accessHint}</Txt>
      {portal.role !== 'owner' ? (
        <PortalSettings embedded />
      ) : (
        <>
          {account && (
            <Txt style={{ fontWeight: '700' }}>
              {text.login} : {account.username}
            </Txt>
          )}
          {!!student.portalEnabled && !student.archived && (
            <>
              <Txt style={s.muted}>{text[portal.status] || text.pending}</Txt>
              {fresh ? (
                <>
                  <Txt>
                    {text.password} : {fresh.password}
                  </Txt>
                  <Txt style={s.muted}>{text.passwordOnce}</Txt>
                  <Txt style={s.muted}>{text.copyHint}</Txt>
                  <Button
                    secondary
                    title={copied ? text.copied : text.copy}
                    onPress={async () => {
                      try {
                        await navigator.clipboard.writeText(
                          `${studentPortalURL}\n${text.login} : ${fresh.username}\n${text.password} : ${fresh.password}`,
                        );
                        setCopied(true);
                      } catch {
                        setError(text.error);
                      }
                    }}
                  />
                </>
              ) : account ? (
                <Txt style={s.muted}>{text.passwordHidden}</Txt>
              ) : (
                <Txt>{text.pending}</Txt>
              )}
              {account && (
                <Button
                  secondary
                  title={text.reset}
                  disabled={working || busy}
                  onPress={() => setResetting(true)}
                />
              )}
            </>
          )}
          {resetting && (
            <View style={{ gap: 12 }}>
              <Txt>{text.resetHint}</Txt>
              <Button
                title={text.confirm}
                disabled={working}
                onPress={async () => {
                  setWorking(true);
                  setError('');
                  try {
                    await portal.reset(student.id);
                    setResetting(false);
                    setCopied(false);
                  } catch (e) {
                    setError(text[e.message] || text.error);
                  } finally {
                    setWorking(false);
                  }
                }}
              />
              <Button
                secondary
                title={text.cancel}
                onPress={() => setResetting(false)}
              />
            </View>
          )}
          {!student.archived && (
            <Button
              secondary
              title={student.portalEnabled ? text.disable : text.enable}
              disabled={busy || working}
              onPress={() => {
                void commit(d =>
                  saveStudent(d, {
                    ...student,
                    portalEnabled: !student.portalEnabled,
                  }),
                );
              }}
            />
          )}
          {(!student.portalEnabled || student.archived) && (
            <Txt>{account?.enabled ? text.revoking : text.disabled}</Txt>
          )}
        </>
      )}
      {!!error && <Txt style={{ color: colors.red }}>{error}</Txt>}
    </View>
  );
}
