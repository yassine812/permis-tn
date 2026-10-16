import { useTheme } from './theme';
/* eslint-env browser */
import React, { useContext, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { Button, Locale, Txt } from './ui';
import {
  getOfflineState,
  watchOfflineState,
  installApp,
  checkForAppUpdate,
  reloadUpdatedApp,
} from './pwa.web';
const copy = {
  fr: {
    title: 'Votre carnet, sur l’écran d’accueil',
    intro: 'Votre carnet hors ligne, sans câble ni abonnement.',
    install: 'Installer Permis TN',
    ios: 'Sur iPhone : ouvrez ce lien dans Safari → Partager (le carré avec une flèche) → Sur l’écran d’accueil → Ajouter. Activez « Ouvrir comme app web » si proposé.',
    other:
      'Sur Android : ouvrez le menu de Chrome → Installer l’application ou Ajouter à l’écran d’accueil.',
    ready: 'Prêt à fonctionner hors connexion',
    preparing: 'Préparation du mode hors connexion… Gardez cette page ouverte.',
    failed:
      'Mode hors connexion indisponible. Reconnectez-vous et rouvrez cette page.',
    update:
      'Une mise à jour est prête. Enregistrez vos modifications avant d’actualiser.',
    reload: 'Actualiser l’application',
    check: 'Vérifier les mises à jour',
    checking: 'Recherche en cours…',
    checked:
      'Vérification lancée. Toute nouvelle version sera proposée ici une fois prête.',
    checkFailed:
      'Vérification impossible. Réessayez avec une connexion Internet.',
    local:
      'Votre carnet complet reste sur cet appareil. Les bilans des élèves avec un accès activé sont synchronisés en ligne. Exportez régulièrement une sauvegarde du carnet.',
    reminders:
      'Cette version ne sonne pas à 06:00 ni avant ou après les séances quand elle est fermée.',
    download: 'Télécharger la sauvegarde .json',
    choose: 'Choisir un fichier de sauvegarde',
    offline: 'Vous êtes hors connexion',
  },
  ar: {
    title: 'دفترك على الشاشة الرئيسية',
    intro: 'دفترك يخدم بلا إنترنت، بلا كابل وبلا اشتراك.',
    install: 'ثبّت Permis TN',
    ios: 'على آيفون: حلّ الرابط في Safari ← مشاركة ← إضافة إلى الشاشة الرئيسية ← إضافة. فعّل «فتح كتطبيق ويب» إذا تظهرلك.',
    other:
      'على أندرويد: من قائمة Chrome اختار تثبيت التطبيق ولا إضافة إلى الشاشة الرئيسية.',
    ready: 'جاهز يخدم بلا إنترنت',
    preparing: 'نحضّروا الخدمة بلا إنترنت… خلّي الصفحة محلولة.',
    failed:
      'الخدمة بلا إنترنت موش جاهزة. ارجع اتّصل بالإنترنت وعاود حلّ الصفحة.',
    update: 'فمّا تحديث جاهز. سجّل تغييراتك قبل ما تعاود تحلّ التطبيق.',
    reload: 'حدّث التطبيق',
    check: 'لوّج على تحديث',
    checking: 'نلوّجوا على تحديث…',
    checked: 'بدينا نثبتوا. أي نسخة جديدة تظهر هنا كي تولّي جاهزة.',
    checkFailed: 'ما نجّمناش نثبتوا. عاود جرّب بالإنترنت.',
    local:
      'دفترك الكامل يبقى في جهازك. حسابات التلامذة اللي فعّلت دخولهم تتحدّث بالإنترنت. خزّن نسخة احتياطية بانتظام.',
    reminders:
      'النسخة هاذي ما تبعثش تذكير مع الستّة ولا قبل وبعد الحصص كي تكون مسكّرة.',
    download: 'نزّل نسخة احتياطية .json',
    choose: 'اختار ملفّ النسخة الاحتياطية',
    offline: 'إنت توّا بلا إنترنت',
  },
};
export function UpdateNotice() {
  const { colors } = useTheme();
  const text = copy[useContext(Locale)];
  const [status, setStatus] = useState(getOfflineState);
  useEffect(() => watchOfflineState(setStatus), []);
  if (!status.update) return null;
  return (
    <View
      accessibilityRole="alert"
      style={{ backgroundColor: colors.blueSoft, padding: 14, gap: 10 }}
    >
      <Txt>{text.update}</Txt>
      <Button compact title={text.reload} onPress={reloadUpdatedApp} />
    </View>
  );
}
const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  navigator.standalone === true;
export function WebInstall({ compact = false }) {
  const { colors } = useTheme();
  const language = useContext(Locale);
  const text = copy[language];
  const [status, setStatus] = useState(getOfflineState);
  const [standalone, setStandalone] = useState(isStandalone);
  const [instructions, setInstructions] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const [checking, setChecking] = useState(false);
  const [checkMessage, setCheckMessage] = useState('');
  useEffect(() => watchOfflineState(setStatus), []);
  useEffect(() => {
    document.documentElement.lang = language === 'ar' ? 'ar-TN' : 'fr-TN';
  }, [language]);
  useEffect(() => {
    const refresh = () => {
      setOnline(navigator.onLine);
      setStandalone(isStandalone());
    };
    window.addEventListener('online', refresh);
    window.addEventListener('offline', refresh);
    window.addEventListener('appinstalled', refresh);
    return () => {
      window.removeEventListener('online', refresh);
      window.removeEventListener('offline', refresh);
      window.removeEventListener('appinstalled', refresh);
    };
  }, []);
  if (import.meta.env.DEV) {
    return null;
  }
  return (
    <View
      style={{
        padding: 16,
        gap: 10,
        backgroundColor: colors.blueSoft,
        borderRadius: 12,
      }}
    >
      {!standalone && (
        <>
          <Txt style={{ fontWeight: '700', fontSize: 17 }}>{text.title}</Txt>
          <Txt style={{ fontSize: 12 }}>{text.intro}</Txt>
          <Button
            compact
            title={text.install}
            onPress={() => {
              setInstructions(true);
              void installApp().catch(() => {});
            }}
          />
          {(instructions || !compact) && (
            <>
              <Txt style={{ fontSize: 13 }}>{text.ios}</Txt>
              <Txt style={{ fontSize: 13 }}>{text.other}</Txt>
            </>
          )}
        </>
      )}
      <Txt
        style={{
          fontSize: 12,
          color: status.ready ? colors.green : colors.ink,
        }}
      >
        {status.ready
          ? text.ready
          : status.failed
          ? text.failed
          : text.preparing}
      </Txt>
      {!online && <Txt style={{ fontSize: 12 }}>{text.offline}</Txt>}
      {status.update && <UpdateNotice />}
      {!compact && (
        <>
          <Button
            secondary
            compact
            disabled={checking || !online}
            title={checking ? text.checking : text.check}
            onPress={async () => {
              setChecking(true);
              setCheckMessage('');
              try {
                await checkForAppUpdate();
                setCheckMessage(text.checked);
              } catch {
                setCheckMessage(text.checkFailed);
              } finally {
                setChecking(false);
              }
            }}
          />
          {!!checkMessage && <Txt style={{ fontSize: 12 }}>{checkMessage}</Txt>}
          <Txt style={{ fontSize: 12 }}>{text.local}</Txt>
          <Txt style={{ fontSize: 12 }}>{text.reminders}</Txt>
        </>
      )}
    </View>
  );
}
export function BackupDownload({ data }) {
  const text = copy[useContext(Locale)];
  return (
    <Button
      title={text.download}
      icon="download"
      onPress={() => {
        const url = URL.createObjectURL(
          new Blob([JSON.stringify(data, null, 2)], {
            type: 'application/json',
          }),
        );
        const link = document.createElement('a');
        link.href = url;
        link.download = `permis-tn-${new Date()
          .toISOString()
          .slice(0, 10)}.json`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      }}
    />
  );
}
export function BackupFilePicker({ onRead, onError }) {
  const text = copy[useContext(Locale)];
  const input = useRef(null);
  return (
    <>
      <Button
        secondary
        title={text.choose}
        onPress={() => input.current?.click()}
      />
      <input
        ref={input}
        type="file"
        accept=".json,application/json"
        style={{ display: 'none' }}
        onChange={async event => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (!file) {
            return;
          }
          if (file.size > 10000000) {
            onError();
            return;
          }
          try {
            onRead(await file.text());
          } catch {
            onError();
          }
        }}
      />
    </>
  );
}
