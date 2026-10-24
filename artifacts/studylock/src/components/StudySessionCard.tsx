import React from 'react';
import { Alert, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import type { StudySession } from '../models';
import { useApp } from '../state/AppContext';
import { formatClockTime, formatMinutes } from '../utils';
import { AppIcon, AppText, IconButton, Panel, ProgressBar } from './AppUI';
import { cancelSessionReminder, scheduleSessionReminder } from '../services/notifications';

export function StudySessionCard({
  session,
  occurrenceDate,
  compact = false,
}: {
  session: StudySession;
  occurrenceDate: string;
  compact?: boolean;
}) {
  const {
    subjects,
    colors,
    language,
    isRTL,
    t,
    settings,
    updateSession,
    startSessionFocus,
    duplicateSession,
    removeSession,
  } = useApp();
  const subject = subjects.find((item) => item.id === session.subjectId);
  const complete = session.completedDates.includes(occurrenceDate);
  const doneTasks = session.tasks.filter((task) => task.completed).length;
  const progress = session.tasks.length ? doneTasks / session.tasks.length : 0;

  const askDelete = () => {
    Alert.alert(t('delete'), `${subject?.name ?? t('subject')} · ${session.startTime}`, [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: () => {
          void cancelSessionReminder(session.reminderNotificationId);
          removeSession(session.id);
        },
      },
    ]);
  };

  const copySession = () => {
    const duplicate = duplicateSession(session);
    if (settings.notificationsEnabled && duplicate.reminderMinutes !== null) {
      void scheduleSessionReminder(
        duplicate,
        subject?.name ?? t('subject'),
        t('focusReminderTitle'),
        (subjectName, minutes) =>
          t('focusReminderBody')
            .replace('{subject}', subjectName)
            .replace('{minutes}', String(minutes)),
      ).then((identifier) => {
        updateSession({ ...duplicate, reminderNotificationId: identifier });
      }).catch(() => undefined);
    }
    Alert.alert(t('duplicate'), t('duplicateSession'));
  };

  return (
    <Panel
      style={{
        borderLeftWidth: isRTL ? 1 : 4,
        borderRightWidth: isRTL ? 4 : 1,
        borderLeftColor: isRTL ? colors.border : subject?.color ?? colors.primary,
        borderRightColor: isRTL ? subject?.color ?? colors.primary : colors.border,
        padding: compact ? 13 : 15,
      }}
    >
      <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 10 }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 14,
            backgroundColor: subject?.color ?? colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AppIcon name="book-open" size={18} color={colors.heroForeground} />
        </View>
        <View style={{ flex: 1 }}>
          <AppText weight="semibold" style={{ color: colors.foreground, fontSize: 16 }}>
            {subject?.name ?? t('subject')}
          </AppText>
          <AppText style={{ color: colors.mutedForeground, fontSize: 13, marginTop: 3 }}>
            {formatClockTime(session.startTime, language)} – {formatClockTime(session.endTime, language)}
            {'  ·  '}
            {formatMinutes(
              Math.max(
                0,
                Number(session.endTime.slice(0, 2)) * 60 +
                  Number(session.endTime.slice(3, 5)) -
                  (Number(session.startTime.slice(0, 2)) * 60 + Number(session.startTime.slice(3, 5))),
              ),
              language,
            )}
          </AppText>
        </View>
        {complete ? (
          <View style={{ backgroundColor: colors.successSoft, borderRadius: 12, padding: 7 }}>
            <AppIcon name="check" size={15} color={colors.success} />
          </View>
        ) : null}
      </View>

      {session.notes && !compact ? (
        <AppText numberOfLines={2} style={{ color: colors.mutedForeground, fontSize: 13 }}>
          {session.notes}
        </AppText>
      ) : null}

      {session.tasks.length > 0 ? (
        <View style={{ gap: 6 }}>
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between' }}>
            <AppText style={{ color: colors.mutedForeground, fontSize: 12 }}>
              {doneTasks}/{session.tasks.length} {t('tasks')}
            </AppText>
            {!compact ? (
              <AppText style={{ color: colors.mutedForeground, fontSize: 12 }}>
                {Math.round(progress * 100)}%
              </AppText>
            ) : null}
          </View>
          <ProgressBar value={progress} color={subject?.color} />
        </View>
      ) : null}

      {!compact ? (
        <View
          style={{
            flexDirection: isRTL ? 'row-reverse' : 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 1,
          }}
        >
          <Pressable
            accessibilityRole="button"
            onPress={() => startSessionFocus(session, occurrenceDate)}
            style={({ pressed }) => ({
              flexDirection: isRTL ? 'row-reverse' : 'row',
              alignItems: 'center',
              gap: 7,
              backgroundColor: colors.accent,
              paddingHorizontal: 13,
              paddingVertical: 10,
              borderRadius: 13,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <AppIcon name="play" size={14} color={colors.primary} />
            <AppText weight="semibold" style={{ color: colors.primary, fontSize: 13 }}>
              {t('startFocus')}
            </AppText>
          </Pressable>
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' }}>
            <IconButton
              name="edit-2"
              accessibilityLabel={t('edit')}
              onPress={() => router.push({ pathname: '/session-editor', params: { id: session.id } })}
            />
            <IconButton name="copy" accessibilityLabel={t('duplicate')} onPress={copySession} />
            <IconButton name="trash-2" accessibilityLabel={t('delete')} onPress={askDelete} color={colors.danger} />
          </View>
        </View>
      ) : null}
    </Panel>
  );
}
