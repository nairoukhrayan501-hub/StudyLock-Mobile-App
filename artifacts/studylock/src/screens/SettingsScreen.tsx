import React from 'react';
import { Alert, Platform, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { AppIcon, AppScreen, AppText, ChoiceChip, IconButton, Panel, ScreenHeading, SectionTitle, type AppIconName } from '../components/AppUI';
import { useApp } from '../state/AppContext';
import { getAppBlockingStatus } from '../services/appBlocking';
import {
  cancelAllScheduledNotifications,
  cancelSessionReminder,
  requestLocalNotificationPermission,
  scheduleDailyStudyReminder,
  scheduleSessionReminder,
} from '../services/notifications';
import type { ThemeMode } from '../models';

function SettingStepper({
  label,
  value,
  suffix,
  lower = 5,
  upper = 240,
  step = 5,
  onChange,
}: {
  label: string;
  value: number;
  suffix: string;
  lower?: number;
  upper?: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  const { colors, isRTL, t } = useApp();
  return (
    <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13 }}>
      <AppText style={{ color: colors.foreground, fontSize: 14, flex: 1 }}>{label}</AppText>
      <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 13 }}>
        <IconButton name="minus" accessibilityLabel={t('decrease')} onPress={() => onChange(Math.max(lower, value - step))} />
        <AppText weight="semibold" style={{ color: colors.foreground, minWidth: 58, textAlign: 'center', fontSize: 14 }}>
          {value} {suffix}
        </AppText>
        <IconButton name="plus" accessibilityLabel={t('increase')} onPress={() => onChange(Math.min(upper, value + step))} />
      </View>
    </View>
  );
}

function SettingRow({
  label,
  detail,
  icon,
  trailing,
  onPress,
}: {
  label: string;
  detail?: string;
  icon: AppIconName;
  trailing?: React.ReactNode;
  onPress?: () => void;
}) {
  const { colors, isRTL } = useApp();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => ({
        flexDirection: isRTL ? 'row-reverse' : 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 13,
        opacity: pressed ? 0.75 : 1,
      })}
    >
      <View style={{ width: 38, height: 38, borderRadius: 13, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
        <AppIcon name={icon} size={17} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <AppText weight="medium" style={{ color: colors.foreground, fontSize: 14 }}>{label}</AppText>
        {detail ? <AppText style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 3 }}>{detail}</AppText> : null}
      </View>
      {trailing}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const {
    settings,
    colors,
    isRTL,
    t,
    updateSettings,
    updateSession,
    clearAllData,
    sessions,
    subjects,
    activeFocus,
  } = useApp();
  const blocking = getAppBlockingStatus();

  const changeNotifications = async () => {
    if (settings.notificationsEnabled) {
      await Promise.all([
        ...sessions.map((session) => cancelSessionReminder(session.reminderNotificationId)),
        cancelSessionReminder(activeFocus?.completionNotificationId),
        cancelSessionReminder(settings.dailyReminderNotificationId),
      ]);
      sessions.forEach((session) => {
        if (session.reminderNotificationId) {
          updateSession({ ...session, reminderNotificationId: undefined });
        }
      });
      updateSettings({ notificationsEnabled: false, dailyReminderNotificationId: undefined });
      return;
    }
    if (Platform.OS === 'web') {
      Alert.alert(t('notificationUnavailable'));
      return;
    }
    try {
      const granted = await requestLocalNotificationPermission();
      if (!granted) {
        Alert.alert(t('notificationPermissionDenied'));
        return;
      }
      updateSettings({ notificationsEnabled: true });
      for (const session of sessions) {
        if (session.reminderMinutes === null) continue;
        const identifier = await scheduleSessionReminder(
          session,
          subjects.find((subject) => subject.id === session.subjectId)?.name ?? t('subject'),
          t('focusReminderTitle'),
          (subject, minutes) =>
            t('focusReminderBody')
              .replace('{subject}', subject)
              .replace('{minutes}', String(minutes)),
        );
        updateSession({ ...session, reminderNotificationId: identifier });
      }
      if (settings.dailyReminderEnabled) {
        const identifier = await scheduleDailyStudyReminder(
          settings.dailyReminderHour,
          t('dailyReminder'),
          t('calmStart'),
        );
        updateSettings({ dailyReminderNotificationId: identifier });
      }
    } catch {
      Alert.alert(t('notificationUnavailable'));
    }
  };

  const toggleDailyReminder = async () => {
    if (settings.dailyReminderEnabled) {
      await cancelSessionReminder(settings.dailyReminderNotificationId);
      updateSettings({
        dailyReminderEnabled: false,
        dailyReminderNotificationId: undefined,
      });
      return;
    }
    let identifier: string | undefined;
    if (settings.notificationsEnabled) {
      identifier = await scheduleDailyStudyReminder(
        settings.dailyReminderHour,
        t('dailyReminder'),
        t('calmStart'),
      );
    }
    updateSettings({
      dailyReminderEnabled: true,
      dailyReminderNotificationId: identifier,
    });
  };

  const updateDailyReminderHour = async (hour: number) => {
    await cancelSessionReminder(settings.dailyReminderNotificationId);
    const identifier =
      settings.notificationsEnabled && settings.dailyReminderEnabled
        ? await scheduleDailyStudyReminder(hour, t('dailyReminder'), t('calmStart'))
        : undefined;
    updateSettings({ dailyReminderHour: hour, dailyReminderNotificationId: identifier });
  };

  const askClearData = () => {
    Alert.alert(t('clearAllData'), t('clearAllConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('clear'),
        style: 'destructive',
        onPress: () => {
          void cancelAllScheduledNotifications();
          clearAllData();
          Alert.alert(t('clearDataDone'));
        },
      },
    ]);
  };

  const themeChoices: { value: ThemeMode; label: string }[] = [
    { value: 'system', label: t('system') },
    { value: 'light', label: t('light') },
    { value: 'dark', label: t('dark') },
  ];

  return (
    <AppScreen>
      <ScreenHeading title={t('settings')} subtitle={t('savedLocally')} />

      <SectionTitle title={t('language')} />
      <Panel style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 9 }}>
        <View style={{ flex: 1 }}>
          <ChoiceChip label={t('arabic')} selected={settings.language === 'ar'} onPress={() => updateSettings({ language: 'ar' })} />
        </View>
        <View style={{ flex: 1 }}>
          <ChoiceChip label={t('english')} selected={settings.language === 'en'} onPress={() => updateSettings({ language: 'en' })} />
        </View>
      </Panel>

      <SectionTitle title={t('theme')} />
      <Panel style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 7, justifyContent: 'space-between' }}>
        {themeChoices.map((choice) => (
          <View key={choice.value} style={{ flex: 1 }}>
            <ChoiceChip label={choice.label} selected={settings.theme === choice.value} onPress={() => updateSettings({ theme: choice.value })} />
          </View>
        ))}
      </Panel>

      <SectionTitle title={t('focusSettings')} />
      <Panel style={{ gap: 0 }}>
        <SettingStepper label={t('studyDuration')} value={settings.defaultStudyMinutes} suffix={t('minute')} lower={10} upper={180} onChange={(value) => updateSettings({ defaultStudyMinutes: value })} />
        <View style={{ height: 1, backgroundColor: colors.border }} />
        <SettingStepper label={t('shortBreakDuration')} value={settings.shortBreakMinutes} suffix={t('minute')} lower={1} upper={30} step={1} onChange={(value) => updateSettings({ shortBreakMinutes: value })} />
        <View style={{ height: 1, backgroundColor: colors.border }} />
        <SettingStepper label={t('longBreakDuration')} value={settings.longBreakMinutes} suffix={t('minute')} lower={5} upper={60} onChange={(value) => updateSettings({ longBreakMinutes: value })} />
        <View style={{ height: 1, backgroundColor: colors.border }} />
        <SettingStepper label={t('dailyGoalMinutes')} value={settings.dailyGoalMinutes} suffix={t('minute')} lower={15} upper={600} step={15} onChange={(value) => updateSettings({ dailyGoalMinutes: value })} />
        <View style={{ height: 1, backgroundColor: colors.border }} />
        <SettingRow
          label={t('allowEarlyEnding')}
          detail={settings.allowEarlyEnd ? t('active') : t('paused')}
          icon="log-out"
          trailing={
            <Pressable
              onPress={() => updateSettings({ allowEarlyEnd: !settings.allowEarlyEnd })}
              accessibilityRole="switch"
              accessibilityState={{ checked: settings.allowEarlyEnd }}
              style={{
                width: 44,
                height: 27,
                borderRadius: 15,
                backgroundColor: settings.allowEarlyEnd ? colors.primary : colors.muted,
                justifyContent: 'center',
                paddingHorizontal: 3,
              }}
            >
              <View style={{ width: 21, height: 21, borderRadius: 11, backgroundColor: colors.switchKnob, alignSelf: settings.allowEarlyEnd ? (isRTL ? 'flex-start' : 'flex-end') : (isRTL ? 'flex-end' : 'flex-start') }} />
            </Pressable>
          }
        />
      </Panel>

      <SectionTitle title={t('notifications')} />
      <Panel>
        <SettingRow
          label={settings.notificationsEnabled ? t('notificationsOn') : t('notificationsOff')}
          detail={t('notifPermission')}
          icon="bell"
          trailing={
            <Pressable
              onPress={() => void changeNotifications()}
              accessibilityRole="switch"
              accessibilityState={{ checked: settings.notificationsEnabled }}
              style={{
                width: 44,
                height: 27,
                borderRadius: 15,
                backgroundColor: settings.notificationsEnabled ? colors.primary : colors.muted,
                justifyContent: 'center',
                paddingHorizontal: 3,
              }}
            >
              <View style={{ width: 21, height: 21, borderRadius: 11, backgroundColor: colors.switchKnob, alignSelf: settings.notificationsEnabled ? (isRTL ? 'flex-start' : 'flex-end') : (isRTL ? 'flex-end' : 'flex-start') }} />
            </Pressable>
          }
        />
      </Panel>
      <Panel style={{ marginTop: 9 }}>
        <SettingRow
          label={t('dailyReminder')}
          detail={
            settings.dailyReminderEnabled
              ? `${settings.notificationsEnabled ? `${String(settings.dailyReminderHour).padStart(2, '0')}:00` : t('notificationsOff')} · ${t('dailyReminderTime')}`
              : t('notificationsOff')
          }
          icon="sunrise"
          trailing={
            <Pressable
              onPress={() => void toggleDailyReminder()}
              accessibilityRole="switch"
              accessibilityState={{ checked: settings.dailyReminderEnabled }}
              style={{
                width: 44,
                height: 27,
                borderRadius: 15,
                backgroundColor: settings.dailyReminderEnabled ? colors.primary : colors.muted,
                justifyContent: 'center',
                paddingHorizontal: 3,
              }}
            >
              <View style={{ width: 21, height: 21, borderRadius: 11, backgroundColor: colors.switchKnob, alignSelf: settings.dailyReminderEnabled ? (isRTL ? 'flex-start' : 'flex-end') : (isRTL ? 'flex-end' : 'flex-start') }} />
            </Pressable>
          }
        />
        {settings.dailyReminderEnabled ? (
          <SettingStepper
            label={t('dailyReminderTime')}
            value={settings.dailyReminderHour}
            suffix=":00"
            lower={7}
            upper={22}
            step={1}
            onChange={(value) => void updateDailyReminderHour(value)}
          />
        ) : null}
      </Panel>

      <SectionTitle title={t('manageSubjects')} action={t('edit')} onAction={() => router.push('/subjects')} />
      <Panel>
        <SettingRow
          label={t('manageSubjects')}
          detail={`${sessions.length} ${t('planned')}`}
          icon="book-open"
          onPress={() => router.push('/subjects')}
          trailing={<AppIcon name={isRTL ? 'chevron-left' : 'chevron-right'} size={18} color={colors.mutedForeground} />}
        />
      </Panel>

      <SectionTitle title={t('appBlocking')} />
      <Panel>
        <SettingRow label={t('appBlockingUnavailable')} icon="shield" />
        <AppText style={{ color: colors.mutedForeground, fontSize: 13, lineHeight: 21 }}>
          {blocking.explanation}
        </AppText>
        <AppText style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 19 }}>
          {t('appBlockingExplain')}
        </AppText>
      </Panel>

      <SectionTitle title={t('dataManagement')} />
      <Panel>
        <SettingRow label={t('privacy')} detail={t('privacyMessage')} icon="lock" />
        <Pressable
          onPress={askClearData}
          accessibilityRole="button"
          style={({ pressed }) => ({
            flexDirection: isRTL ? 'row-reverse' : 'row',
            alignItems: 'center',
            gap: 10,
            paddingVertical: 12,
            opacity: pressed ? 0.65 : 1,
          })}
        >
          <AppIcon name="trash-2" size={17} color={colors.danger} />
          <AppText weight="semibold" style={{ color: colors.danger, fontSize: 14 }}>{t('clearAllData')}</AppText>
        </Pressable>
      </Panel>

      <Panel style={{ alignItems: 'center', marginTop: 16 }}>
        <AppText weight="semibold" style={{ color: colors.foreground, fontSize: 16 }}>{t('about')}</AppText>
        <AppText style={{ color: colors.mutedForeground, fontSize: 12 }}>{t('version')}</AppText>
        <AppText style={{ color: colors.mutedForeground, fontSize: 11 }}>{t('tagline')}</AppText>
      </Panel>
    </AppScreen>
  );
}
