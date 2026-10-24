import React from 'react';
import { Pressable, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { AppIcon, AppScreen, AppText, PrimaryButton, ScreenHeading, SectionTitle, Panel, ProgressBar, EmptyState } from '../components/AppUI';
import { StudySessionCard } from '../components/StudySessionCard';
import { useApp } from '../state/AppContext';
import { addDays, dateKey, formatDate, formatMinutes, getSessionsForDate, minutesForTime } from '../utils';

export default function HomeScreen() {
  const { sessions, subjects, records, settings, activeFocus, colors, language, isRTL, t } = useApp();
  const today = dateKey();
  const todaysSessions = getSessionsForDate(sessions, today);
  const todayRecords = records.filter((record) => record.date === today);
  const todayMinutes = todayRecords.reduce((sum, record) => sum + record.actualMinutes, 0);
  const goalProgress = settings.dailyGoalMinutes > 0 ? todayMinutes / settings.dailyGoalMinutes : 0;
  const now = new Date();
  const nowTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  let nextSession: (typeof todaysSessions)[number] | undefined;
  let nextSessionDate = '';
  for (let offset = 0; offset < 8 && !nextSession; offset += 1) {
    const candidateDate = addDays(today, offset);
    const candidate = getSessionsForDate(sessions, candidateDate).find(
      (session) =>
        !session.completedDates.includes(candidateDate) &&
        (offset > 0 || session.startTime >= nowTime),
    );
    if (candidate) {
      nextSession = candidate;
      nextSessionDate = candidateDate;
    }
  }
  const plannedMinutes = todaysSessions.reduce((sum, session) => {
    const start = minutesForTime(session.startTime) ?? 0;
    const end = minutesForTime(session.endTime) ?? 0;
    return sum + Math.max(0, end - start);
  }, 0);
  const completedToday = todayRecords.filter((record) => record.completed).length;
  const nextStart = nextSessionDate && nextSession
    ? new Date(`${nextSessionDate}T${nextSession.startTime}:00`).getTime()
    : 0;
  const minutesUntilNext = Math.max(0, Math.ceil((nextStart - now.getTime()) / 60_000));
  const greetingDate = formatDate(today, language);

  return (
    <AppScreen>
      <ScreenHeading
        title={t('welcome')}
        subtitle={`${greetingDate} · ${t('calmStart')}`}
        trailing={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('settings')}
            onPress={() => router.push('/(tabs)/settings')}
            style={({ pressed }) => ({
              width: 44,
              height: 44,
              borderRadius: 16,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.card,
              borderWidth: 1,
              borderColor: colors.border,
              opacity: pressed ? 0.65 : 1,
            })}
          >
            <AppIcon name="sliders" size={19} color={colors.foreground} />
          </Pressable>
        }
      />

      <LinearGradient
        colors={[colors.heroStart, colors.heroEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: 26, padding: 21, overflow: 'hidden' }}
      >
        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <View style={{ flex: 1, gap: 5 }}>
            <AppText weight="medium" style={{ color: colors.heroMuted, fontSize: 13 }}>
              {t('dailyGoal')}
            </AppText>
            <AppText weight="bold" style={{ color: colors.heroForeground, fontSize: 30, lineHeight: 40 }}>
              {formatMinutes(todayMinutes, language)}
            </AppText>
            <AppText style={{ color: colors.heroMuted, fontSize: 13 }}>
              {t('studyTime')} · {formatMinutes(settings.dailyGoalMinutes, language)}
            </AppText>
          </View>
          <View
            style={{
              width: 62,
              height: 62,
              borderRadius: 22,
              backgroundColor: colors.heroOverlay,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AppIcon name="target" size={28} color={colors.heroForeground} />
          </View>
        </View>
        <View style={{ marginTop: 20, marginBottom: 8 }}>
          <ProgressBar value={goalProgress} color={colors.heroProgress} />
        </View>
        <AppText style={{ color: colors.heroMuted, fontSize: 12 }}>
          {Math.min(100, Math.round(goalProgress * 100))}% {t('completed')}
        </AppText>
      </LinearGradient>

      <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 10, marginTop: 15 }}>
        <View style={{ flex: 1 }}>
          <PrimaryButton
            label={t('startFocus')}
            icon="play"
            onPress={() => router.push('/(tabs)/focus')}
            testID="home-start-focus"
          />
        </View>
        <View style={{ flex: 1 }}>
          <PrimaryButton
            label={t('createSession')}
            icon="plus"
            secondary
            onPress={() => router.push({ pathname: '/session-editor', params: { date: today } })}
            testID="home-create-session"
          />
        </View>
      </View>

      <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 9, marginTop: 11 }}>
        {[
          { title: t('plannedTime'), value: formatMinutes(plannedMinutes, language), icon: 'calendar' as const },
          { title: t('completedSessions'), value: String(completedToday), icon: 'check-circle' as const },
          {
            title: t('focusStatus'),
            value: activeFocus
              ? activeFocus.pausedRemainingMs !== null
                ? t('paused')
                : activeFocus.mode === 'break'
                  ? t('breakNow')
                  : t('active')
              : t('noActiveSession'),
            icon: activeFocus ? 'zap' as const : 'circle' as const,
          },
        ].map((item) => (
          <Panel key={item.title} style={{ flex: 1, padding: 11, gap: 7 }}>
            <AppIcon name={item.icon} size={15} color={colors.primary} />
            <AppText weight="semibold" numberOfLines={1} style={{ color: colors.foreground, fontSize: 13 }}>
              {item.value}
            </AppText>
            <AppText numberOfLines={1} style={{ color: colors.mutedForeground, fontSize: 10 }}>
              {item.title}
            </AppText>
          </Panel>
        ))}
      </View>

      <SectionTitle
        title={t('nextSession')}
        action={t('viewSchedule')}
        onAction={() => router.push('/(tabs)/schedule')}
      />
      {nextSession ? (
        <>
          <AppText style={{ color: colors.mutedForeground, fontSize: 12, marginBottom: 8 }}>
            {formatDate(nextSessionDate, language, { weekday: 'short', month: 'short', day: 'numeric' })}
            {minutesUntilNext > 0 ? ` · ${formatMinutes(minutesUntilNext, language)}` : ''}
          </AppText>
          <StudySessionCard session={nextSession} occurrenceDate={nextSessionDate} compact />
        </>
      ) : (
        <Panel style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' }}>
          <View
            style={{
              width: 42,
              height: 42,
              borderRadius: 15,
              backgroundColor: colors.accent,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AppIcon name="calendar" size={19} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText weight="semibold" style={{ color: colors.foreground, fontSize: 14 }}>
              {t('noSessions')}
            </AppText>
            <AppText style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 3 }}>
              {t('noSessionsDescription')}
            </AppText>
          </View>
        </Panel>
      )}

      <SectionTitle title={t('todaySessions')} action={t('viewSchedule')} onAction={() => router.push('/(tabs)/schedule')} />
      {todaysSessions.length > 0 ? (
        <View style={{ gap: 11 }}>
          {todaysSessions.slice(0, 3).map((session) => (
            <StudySessionCard key={`${session.id}-${today}`} session={session} occurrenceDate={today} compact />
          ))}
        </View>
      ) : subjects.length === 0 ? (
        <EmptyState
          icon="book-open"
          title={t('noSubjects')}
          description={t('addFirstSubject')}
          action={
            <PrimaryButton
              label={t('createSubject')}
              icon="plus"
              onPress={() => router.push('/subjects')}
            />
          }
        />
      ) : null}

      <View style={{ height: 12 }} />
    </AppScreen>
  );
}
