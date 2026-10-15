/* eslint-env browser */
import React, { useContext, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { Button, colors, Locale, Txt } from './ui';
import { getOfflineState, watchOfflineState, installApp } from './pwa.web';
const copy = {
  fr: {
    title: 'Votre carnet, sur l’écran d’accueil',
    intro: 'Gratuit. Sans câble, sans compte, sans abonnement.',
    install: 'Installer Permis TN',
    ios: 'Sur iPhone : ouvrez ce lien dans Safari → Partager (le carré avec une flèche) → Sur l’écran d’accueil → Ajouter. Activez « Ouvrir comme app web » si proposé.',
    other:
      'Sur Android : ouvrez le menu de Chrome → Installer l’application ou Ajouter à l’écran d’accueil.',
    ready: 'Prêt à fonctionner hors connexion',
    preparing: 'Préparation du mode hors connexion… Gardez cette page ouverte.',
    failed:
      'Mode hors connexion indisponible. Reconnectez-vous et rouvrez cette page.',
    update:
      'Une mise à jour est prête. Fermez toutes les fenêtres Permis TN, puis rouvrez l’app.',
    local:
      'Vos élèves restent sur cet appareil. Exportez une sauvegarde régulièrement : effacer les données du navigateur peut les supprimer.',
    reminders:
      'Cette version ne sonne pas à 06:00 ni avant ou après les séances quand elle est fermée.',
    download: 'Télécharger la sauvegarde .json',
    choose: 'Choisir un fichier de sauvegarde',
    offline: 'Vous êtes hors connexion',
  },
  ar: {
    title: 'دفترك على الشاشة الرئيسية',
    intro: 'بلاش. بلا كابل، بلا حساب، بلا اشتراك.',
    install: 'ثبّت Permis TN',
    ios: 'على آيفون: حلّ الرابط في Safari ← مشاركة ← إضافة إلى الشاشة الرئيسية ← إضافة. فعّل «فتح كتطبيق ويب» إذا تظهرلك.',
    other:
      'على أندرويد: من قائمة Chrome اختار تثبيت التطبيق ولا إضافة إلى الشاشة الرئيسية.',
    ready: 'جاهز يخدم بلا إنترنت',
    preparing: 'نحضّروا الخدمة بلا إنترنت… خلّي الصفحة محلولة.',
    failed:
      'الخدمة بلا إنترنت موش جاهزة. ارجع اتّصل بالإنترنت وعاود حلّ الصفحة.',
    update: 'فمّا تحديث جاهز. سكّر نوافذ Permis TN الكل وعاود حلّ التطبيق.',
    local:
      'معطيات التلامذة تبقى في الجهاز هذا. خزّن نسخة احتياطية بانتظام: مسح بيانات المتصفّح ينجم يمسحها.',
    reminders:
      'النسخة هاذي ما تبعثش تذكير مع الستّة ولا قبل وبعد الحصص كي تكون مسكّرة.',
    download: 'نزّل نسخة احتياطية .json',
    choose: 'اختار ملفّ النسخة الاحتياطية',
    offline: 'إنت توّا بلا إنترنت',
  },
};
const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  navigator.standalone === true;
export function WebInstall({ compact = false }) {
  const language = useContext(Locale);
  const text = copy[language];
  const [status, setStatus] = useState(getOfflineState);
  const [standalone, setStandalone] = useState(isStandalone);
  const [instructions, setInstructions] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
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
        backgroundColor: '#EAF0FF',
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
      {status.update && <Txt style={{ fontSize: 12 }}>{text.update}</Txt>}
      {!compact && (
        <>
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
