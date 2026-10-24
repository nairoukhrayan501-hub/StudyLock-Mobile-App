import React, { useEffect, useRef, useState } from 'react';
import { Alert, AppState, Pressable, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import Svg, { Circle } from 'react-native-svg';
import { AppIcon, AppScreen, AppText, ChoiceChip, EmptyState, Panel, PrimaryButton, ScreenHeading, SectionTitle } from '../components/AppUI';
import { StudySessionCard } from '../components/StudySessionCard';
import { useApp } from '../state/AppContext';
import { dateKey, formatNumber, formatMinutes, formatTimestamp, getSessionsForDate, remainingMilliseconds } from '../utils';

const TIMER_SIZE = 236;
const TIMER_RADIUS = 101;
const TIMER_CIRCUMFERENCE = 2 * Math.PI * TIMER_RADIUS;

function timerLabel(milliseconds: number, language: 'ar' | 'en'): string {
  const totalSeconds = Math.ceil(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${formatNumber(minutes, language)}:${String(seconds).padStart(2, '0')}`;
}

export default function FocusScreen() {
  const {
    activeFocus,
    sessions,
    subjects,
    records,
    settings,
    colors,
    language,
    isRTL,
    t,
    startSessionFocus,
    startQuickFocus,
    startBreak,
    pauseFocus,
    resumeFocus,
    finishFocus,
    finishBreak,
    toggleTask,
  } = useApp();
  const [now, setNow] = useState(Date.now());
  const [selectedSubjectId, setSelectedSubjectId] = useState(subjects[0]?.id ?? '');
  const [finished, setFinished] = useState(false);
  const [finishedType, setFinishedType] = useState<'study' | 'break'>('study');
  const [finishedSubjectId, setFinishedSubjectId] = useState<string | null>(null);
  const completionKey = useRef('');
  const today = dateKey();
  const todaysSessions = getSessionsForDate(sessions, today);
  const activeSession = activeFocus?.sessionId
    ? sessions.find((session) => session.id === activeFocus.sessionId)
    : undefined;
  const activeSubject = subjects.find((subject) => subject.id === activeFocus?.subjectId);
  const remaining = activeFocus ? remainingMilliseconds(activeFocus, now) : 0;
  const ratio = activeFocus?.durationMinutes
    ? remaining / (activeFocus.durationMinutes * 60_000)
    : 0;

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    const subscription = AppState.addEventListener('change', () => setNow(Date.now()));
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!selectedSubjectId && subjects[0]) setSelectedSubjectId(subjects[0].id);
  }, [selectedSubjectId, subjects]);

  useEffect(() => {
    if (!activeFocus) return;
    setFinished(false);
    setFinishedType(activeFocus.mode);
    setFinishedSubjectId(activeFocus.subjectId);
    completionKey.current = '';
  }, [activeFocus?.startedAt]);

  useEffect(() => {
    if (!activeFocus || activeFocus.pausedRemainingMs !== null || remaining > 0) return;
    const key = `${activeFocus.mode}-${activeFocus.startedAt}`;
    if (completionKey.current === key) return;
    completionKey.current = key;
    setNow(Date.now());
    if (activeFocus.mode === 'study') {
      setFinishedSubjectId(activeFocus.subjectId);
      setFinishedType('study');
      setFinished(true);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      finishFocus(true);
    } else {
      setFinishedType('break');
      setFinished(true);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      finishBreak();
    }
  }, [activeFocus, remaining, finishBreak, finishFocus]);

  const startQuick = () => {
    if (!selectedSubjectId) return;
    setFinished(false);
    void Haptics.selectionAsync();
    startQuickFocus(selectedSubjectId);
  };

  const askEnd = () => {
    if (!activeFocus) return;
    if (activeFocus.mode === 'break') {
      finishBreak();
      setFinished(false);
      return;
    }
    Alert.alert(t('endEarlyTitle'), t('endEarlyMessage'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('emergencyExit'),
        style: 'destructive',
        onPress: () => {
          setFinished(false);
          finishFocus(settings.allowEarlyEnd);
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        },
      },
    ]);
  };

  const startNextBreak = (long = false) => {
    const todayCount = records.filter((record) => record.date === today && record.completed).length;
    const minutes = long ? settings.longBreakMinutes : todayCount > 0 && todayCount % 4 === 0
      ? settings.longBreakMinutes
      : settings.shortBreakMinutes;
    setFinished(false);
    startBreak(minutes, finishedSubjectId);
  };

  if (activeFocus) {
    const sessionTasks = activeSession?.tasks ?? [];
    const completedTaskCount = sessionTasks.filter((task) => task.completed).length;
    return (
      <AppScreen>
        <ScreenHeading title={activeFocus.mode === 'break' ? t('breakNow') : t('focus')} subtitle={t('focusSettingsNote')} />
        <Panel style={{ alignItems: 'center', paddingVertical: 24 }}>
          <View style={{ width: TIMER_SIZE, height: TIMER_SIZE, alignItems: 'center', justifyContent: 'center' }}>
            <Svg width={TIMER_SIZE} height={TIMER_SIZE} viewBox={`0 0 ${TIMER_SIZE} ${TIMER_SIZE}`}>
              <Circle
                cx={TIMER_SIZE / 2}
                cy={TIMER_SIZE / 2}
                r={TIMER_RADIUS}
                stroke={colors.timerTrack}
                strokeWidth={11}
                fill="none"
              />
              <Circle
                cx={TIMER_SIZE / 2}
                cy={TIMER_SIZE / 2}
                r={TIMER_RADIUS}
                stroke={activeFocus.mode === 'break' ? colors.success : colors.primary}
                strokeWidth={11}
                strokeLinecap="round"
                strokeDasharray={`${TIMER_CIRCUMFERENCE} ${TIMER_CIRCUMFERENCE}`}
                strokeDashoffset={TIMER_CIRCUMFERENCE * (1 - Math.max(0, Math.min(1, ratio)))}
                rotation={-90}
                originX={TIMER_SIZE / 2}
                originY={TIMER_SIZE / 2}
                fill="none"
              />
            </Svg>
            <View style={{ position: 'absolute', alignItems: 'center', gap: 5 }}>
              <AppText weight="bold" style={{ color: colors.foreground, fontSize: 46, lineHeight: 56 }}>
                {timerLabel(remaining, language)}
              </AppText>
              <AppText style={{ color: colors.mutedForeground, fontSize: 13 }}>
                {activeFocus.pausedRemainingMs !== null ? t('paused') : t('remaining')}
              </AppText>
            </View>
          </View>

          <AppText weight="semibold" style={{ color: activeSubject?.color ?? colors.primary, fontSize: 19, marginTop: 8 }}>
            {activeFocus.mode === 'break' ? t('breakNow') : activeSubject?.name ?? t('focus')}
          </AppText>
          {activeSession ? (
            <AppText style={{ color: colors.mutedForeground, fontSize: 13 }}>
              {completedTaskCount}/{sessionTasks.length} {t('tasks')}
            </AppText>
          ) : (
            <AppText style={{ color: colors.mutedForeground, fontSize: 13 }}>
              {formatMinutes(activeFocus.durationMinutes, language)}
            </AppText>
          )}
          <View
            style={{
              width: '100%',
              flexDirection: isRTL ? 'row-reverse' : 'row',
              justifyContent: 'space-around',
              borderTopWidth: 1,
              borderTopColor: colors.border,
              paddingTop: 13,
              marginTop: 3,
            }}
          >
            <View style={{ alignItems: 'center', gap: 3 }}>
              <AppText style={{ color: colors.mutedForeground, fontSize: 11 }}>{t('startTime')}</AppText>
              <AppText weight="semibold" style={{ color: colors.foreground, fontSize: 13 }}>
                {formatTimestamp(activeFocus.startedAt, language)}
              </AppText>
            </View>
            <View style={{ alignItems: 'center', gap: 3 }}>
              <AppText style={{ color: colors.mutedForeground, fontSize: 11 }}>{t('endTime')}</AppText>
              <AppText weight="semibold" style={{ color: colors.foreground, fontSize: 13 }}>
                {formatTimestamp(
                  activeFocus.pausedRemainingMs === null
                    ? activeFocus.endsAt
                    : now + activeFocus.pausedRemainingMs,
                  language,
                )}
              </AppText>
            </View>
          </View>

          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 10, marginTop: 20, width: '100%' }}>
            <View style={{ flex: 1 }}>
              <PrimaryButton
                label={activeFocus.pausedRemainingMs === null ? t('pause') : t('resume')}
                icon={activeFocus.pausedRemainingMs === null ? 'pause' : 'play'}
                secondary
                onPress={() => {
                  if (activeFocus.pausedRemainingMs === null) pauseFocus();
                  else resumeFocus();
                  void Haptics.selectionAsync();
                }}
              />
            </View>
            <View style={{ flex: 1 }}>
              <PrimaryButton label={t('emergencyExit')} icon="square" onPress={askEnd} />
            </View>
          </View>
        </Panel>

        {activeFocus.mode === 'study' && activeSession ? (
          <>
            <SectionTitle title={t('sessionTasks')} />
            {sessionTasks.length ? (
              <Panel style={{ gap: 0 }}>
                {sessionTasks.map((task, index) => (
                  <View
                    key={task.id}
                    style={{
                      flexDirection: isRTL ? 'row-reverse' : 'row',
                      alignItems: 'center',
                      paddingVertical: 12,
                      borderBottomWidth: index === sessionTasks.length - 1 ? 0 : 1,
                      borderBottomColor: colors.border,
                      gap: 10,
                    }}
                  >
                    <Pressable
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: task.completed }}
                      onPress={() => toggleTask(activeSession.id, task.id)}
                      style={{
                        width: 23,
                        height: 23,
                        borderRadius: 8,
                        borderWidth: 1.5,
                        borderColor: task.completed ? colors.success : colors.border,
                        backgroundColor: task.completed ? colors.success : 'transparent',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {task.completed ? <AppIcon name="check" size={14} color={colors.heroForeground} /> : null}
                    </Pressable>
                    <View style={{ flex: 1 }}>
                      <AppText
                        weight="medium"
                        style={{
                          color: task.completed ? colors.mutedForeground : colors.foreground,
                          fontSize: 14,
                          textDecorationLine: task.completed ? 'line-through' : 'none',
                        }}
                      >
                        {task.title}
                      </AppText>
                      {task.description ? (
                        <AppText style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 3 }}>
                          {task.description}
                        </AppText>
                      ) : null}
                    </View>
                    <AppText style={{ color: colors.mutedForeground, fontSize: 11 }}>
                      {formatMinutes(task.estimatedMinutes, language)}
                    </AppText>
                  </View>
                ))}
              </Panel>
            ) : null}
          </>
        ) : null}
      </AppScreen>
    );
  }

  if (finished) {
    return (
      <AppScreen contentStyle={{ flexGrow: 1, justifyContent: 'center' }}>
        <EmptyState
          icon="check-circle"
          title={t(finishedType === 'break' ? 'breakFinished' : 'focusComplete')}
          description={finishedType === 'break' ? t('breakFinished') : t('greatWork')}
          action={
            <View style={{ width: '100%', gap: 9 }}>
              <PrimaryButton label={t('startBreak')} icon="coffee" onPress={() => startNextBreak()} />
              <PrimaryButton label={t('longBreak')} icon="moon" secondary onPress={() => startNextBreak(true)} />
            </View>
          }
        />
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <ScreenHeading title={t('focus')} subtitle={t('sessionReady')} />
      <Panel style={{ alignItems: 'center', paddingVertical: 23 }}>
        <View
          style={{
            width: 68,
            height: 68,
            borderRadius: 24,
            backgroundColor: colors.accent,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AppIcon name="wind" size={30} color={colors.primary} />
        </View>
        <AppText weight="semibold" style={{ color: colors.foreground, fontSize: 19, textAlign: 'center' }}>
          {t('chooseSession')}
        </AppText>
        <AppText style={{ color: colors.mutedForeground, fontSize: 13, textAlign: 'center', lineHeight: 20 }}>
          {t('focusSettingsNote')}
        </AppText>
      </Panel>

      {todaysSessions.length > 0 ? (
        <>
          <SectionTitle title={t('todaySessions')} />
          <View style={{ gap: 10 }}>
            {todaysSessions.map((session) => (
              <StudySessionCard key={session.id} session={session} occurrenceDate={today} />
            ))}
          </View>
        </>
      ) : null}

      <SectionTitle title={t('freeFocus')} />
      {subjects.length > 0 ? (
        <>
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
            {subjects.map((subject) => (
              <ChoiceChip
                key={subject.id}
                label={subject.name}
                color={subject.color}
                selected={selectedSubjectId === subject.id}
                onPress={() => setSelectedSubjectId(subject.id)}
              />
            ))}
          </View>
          <Panel style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 11 }}>
              <AppIcon name="clock" size={18} color={colors.primary} />
              <View>
                <AppText weight="semibold" style={{ color: colors.foreground, fontSize: 15 }}>
                  {formatMinutes(settings.defaultStudyMinutes, language)}
                </AppText>
                <AppText style={{ color: colors.mutedForeground, fontSize: 12 }}>{t('quickStart')}</AppText>
              </View>
            </View>
            <Pressable
              accessibilityRole="button"
              testID="quick-focus-start"
              onPress={startQuick}
              style={({ pressed }) => ({
                width: 48,
                height: 48,
                borderRadius: 17,
                backgroundColor: colors.primary,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.75 : 1,
              })}
            >
              <AppIcon name="play" size={19} color={colors.primaryForeground} />
            </Pressable>
          </Panel>
        </>
      ) : (
        <EmptyState
          icon="book-open"
          title={t('noSubjects')}
          description={t('noFocusSubject')}
          action={<PrimaryButton label={t('createSubject')} icon="plus" onPress={() => router.push('/subjects')} />}
        />
      )}
    </AppScreen>
  );
}
