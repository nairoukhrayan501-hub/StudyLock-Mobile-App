import React, { useMemo, useState } from 'react';
import { Alert, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppInput, AppText, ChoiceChip, FormLabel, IconButton, Panel, PrimaryButton } from '../components/AppUI';
import { fontFamily } from '../components/AppUI';
import { useApp, makeTask } from '../state/AppContext';
import type { Priority, StudySession, StudyTask } from '../models';
import { cancelSessionReminder, scheduleSessionReminder } from '../services/notifications';
import { addDays, dateKey, formatMinutes, getSessionsForDate, isValidDateKey, makeId, minutesForTime, sessionsOverlap } from '../utils';

const DAY_CODES = [1, 2, 3, 4, 5, 6, 0];
const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

export default function SessionEditorScreen() {
  const params = useLocalSearchParams<{ id?: string; date?: string }>();
  const { sessions, subjects, settings, language, colors, isRTL, t, addSession, updateSession } = useApp();
  const existing = sessions.find((session) => session.id === params.id);
  const insets = useSafeAreaInsets();
  const [subjectId, setSubjectId] = useState(existing?.subjectId ?? subjects[0]?.id ?? '');
  const [date, setDate] = useState(existing?.date ?? (typeof params.date === 'string' ? params.date : dateKey()));
  const [startTime, setStartTime] = useState(existing?.startTime ?? '16:00');
  const [endTime, setEndTime] = useState(existing?.endTime ?? '17:00');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [repeatDays, setRepeatDays] = useState<number[]>(existing?.repeatDays ?? []);
  const [reminderMinutes, setReminderMinutes] = useState<number | null>(existing?.reminderMinutes ?? null);
  const [tasks, setTasks] = useState<StudyTask[]>(existing?.tasks ?? []);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskPriority, setTaskPriority] = useState<Priority>('medium');
  const [taskMinutes, setTaskMinutes] = useState('25');
  const [error, setError] = useState('');
  const selectedSubjectId = subjectId || subjects[0]?.id || '';

  const duration = useMemo(() => {
    const start = minutesForTime(startTime);
    const end = minutesForTime(endTime);
    return start === null || end === null ? 0 : end - start;
  }, [startTime, endTime]);

  const toggleDay = (day: number) => {
    setRepeatDays((current) =>
      current.includes(day) ? current.filter((value) => value !== day) : [...current, day].sort(),
    );
  };

  const addTask = () => {
    if (!taskTitle.trim()) return;
    const parsedMinutes = Number(taskMinutes);
    const next = makeTask({
      title: taskTitle,
      description: taskDescription,
      priority: taskPriority,
      estimatedMinutes: Number.isFinite(parsedMinutes) && parsedMinutes > 0 ? Math.min(parsedMinutes, 480) : 25,
    });
    setTasks((current) => [...current, next]);
    setTaskTitle('');
    setTaskDescription('');
  };

  const updateTask = (taskId: string, patch: Partial<StudyTask>) => {
    setTasks((current) => current.map((task) => (task.id === taskId ? { ...task, ...patch } : task)));
  };

  const moveTask = (taskId: string, direction: -1 | 1) => {
    setTasks((current) => {
      const index = current.findIndex((task) => task.id === taskId);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current;
      const reordered = [...current];
      [reordered[index], reordered[nextIndex]] = [reordered[nextIndex], reordered[index]];
      return reordered;
    });
  };

  const persist = async () => {
    const start = minutesForTime(startTime);
    const end = minutesForTime(endTime);
    if (!selectedSubjectId) {
      setError(t('noSubjects'));
      return;
    }
    if (!isValidDateKey(date)) {
      setError(t('invalidDate'));
      return;
    }
    if (start === null || end === null) {
      setError(t('invalidTime'));
      return;
    }
    if (end <= start) {
      setError(t('endAfterStart'));
      return;
    }
    const candidate: StudySession = {
      id: existing?.id ?? makeId('session'),
      subjectId: selectedSubjectId,
      date,
      startTime,
      endTime,
      notes: notes.trim(),
      reminderMinutes,
      reminderNotificationId: existing?.reminderNotificationId,
      repeatDays,
      tasks,
      completedDates: existing?.completedDates ?? [],
      cancelledDates: existing?.cancelledDates ?? [],
    };

    const datesToValidate = repeatDays.length
      ? Array.from({ length: 8 }, (_, offset) => addDays(date, offset))
      : [date];
    const hasConflict = datesToValidate.some((occurrenceDate, offset) => {
      if (
        offset > 0 &&
        repeatDays.length > 0 &&
        !repeatDays.includes(new Date(`${occurrenceDate}T12:00:00`).getDay())
      ) {
        return false;
      }
      return getSessionsForDate(sessions, occurrenceDate).some(
        (session) => session.id !== candidate.id && sessionsOverlap(candidate, session),
      );
    });

    const save = async () => {
      try {
        await cancelSessionReminder(existing?.reminderNotificationId);
        if (settings.notificationsEnabled && candidate.reminderMinutes !== null) {
          candidate.reminderNotificationId = await scheduleSessionReminder(
            candidate,
            subjects.find((subject) => subject.id === selectedSubjectId)?.name ?? t('subject'),
            t('focusReminderTitle'),
            (subject, minutes) =>
              t('focusReminderBody')
                .replace('{subject}', subject)
                .replace('{minutes}', String(minutes)),
          );
        } else {
          candidate.reminderNotificationId = undefined;
        }
        if (existing) updateSession(candidate);
        else addSession(candidate);
        router.back();
      } catch {
        setError(t('dataError'));
      }
    };

    setError('');
    if (hasConflict) {
      Alert.alert(t('overlapTitle'), t('overlapMessage'), [
        { text: t('cancel'), style: 'cancel' },
        { text: t('saveAnyway'), onPress: () => void save() },
      ]);
    } else {
      await save();
    }
  };

  const removeTask = (taskId: string) => setTasks((current) => current.filter((task) => task.id !== taskId));
  const priorities: Priority[] = ['low', 'medium', 'high'];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <KeyboardAwareScrollViewCompat
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{
          paddingTop: 10,
          paddingHorizontal: 20,
          paddingBottom: Math.max(insets.bottom, 24) + 26,
        }}
        bottomOffset={84}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', marginBottom: 20 }}>
          <IconButton name={isRTL ? 'chevron-right' : 'chevron-left'} accessibilityLabel={t('back')} onPress={() => router.back()} />
          <AppText weight="bold" style={{ color: colors.foreground, fontSize: 23, flex: 1, marginHorizontal: 6 }}>
            {existing ? t('editSession') : t('newSessionTitle')}
          </AppText>
        </View>

        <FormLabel>{t('subject')}</FormLabel>
        {subjects.length > 0 ? (
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
            {subjects.map((subject) => (
              <ChoiceChip
                key={subject.id}
                label={subject.name}
                selected={subject.id === selectedSubjectId}
                color={subject.color}
                onPress={() => setSubjectId(subject.id)}
              />
            ))}
          </View>
        ) : (
          <Panel style={{ marginBottom: 18 }}>
            <AppText style={{ color: colors.mutedForeground }}>{t('noSubjects')}</AppText>
            <PrimaryButton label={t('createSubject')} icon="plus" onPress={() => router.push('/subjects')} />
          </Panel>
        )}

        <FormLabel>{t('date')}</FormLabel>
        <AppInput
          value={date}
          onChangeText={setDate}
          placeholder="YYYY-MM-DD"
          autoCapitalize="none"
          testID="session-date"
          style={{ marginBottom: 17 }}
        />

        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <FormLabel>{t('startTime')}</FormLabel>
            <AppInput value={startTime} onChangeText={setStartTime} placeholder="16:00" keyboardType="numbers-and-punctuation" testID="session-start-time" />
          </View>
          <View style={{ flex: 1 }}>
            <FormLabel>{t('endTime')}</FormLabel>
            <AppInput value={endTime} onChangeText={setEndTime} placeholder="17:00" keyboardType="numbers-and-punctuation" testID="session-end-time" />
          </View>
        </View>
        <AppText style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 7, marginBottom: 18 }}>
          {t('duration')}: {duration > 0 ? formatMinutes(duration, language) : '—'}
        </AppText>

        <FormLabel>{t('recurringDays')}</FormLabel>
        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: 7, marginBottom: 18 }}>
          {DAY_CODES.map((day, index) => (
            <ChoiceChip
              key={day}
              label={t(DAY_KEYS[index])}
              selected={repeatDays.includes(day)}
              onPress={() => toggleDay(day)}
            />
          ))}
        </View>

        <FormLabel>{t('reminder')}</FormLabel>
        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 8, marginBottom: 18 }}>
          {[null, 5, 10, 15].map((minutes) => (
            <ChoiceChip
              key={minutes ?? 'off'}
              label={minutes === null ? t('noReminder') : `${minutes} ${t('minute')}`}
              selected={minutes === reminderMinutes}
              onPress={() => setReminderMinutes(minutes)}
            />
          ))}
        </View>

        <FormLabel>{t('sessionNotes')}</FormLabel>
        <AppInput
          value={notes}
          onChangeText={setNotes}
          placeholder={t('sessionNotes')}
          multiline
          numberOfLines={3}
          style={{ minHeight: 88, textAlignVertical: 'top', marginBottom: 20 }}
        />

        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <AppText weight="semibold" style={{ color: colors.foreground, fontSize: 18 }}>
            {t('tasks')}
          </AppText>
          {tasks.length > 0 ? (
            <AppText style={{ color: colors.mutedForeground, fontSize: 12 }}>
              {tasks.length} {t('task')}
            </AppText>
          ) : null}
        </View>

        <Panel style={{ gap: 9, marginBottom: 12 }}>
          <AppInput value={taskTitle} onChangeText={setTaskTitle} placeholder={t('taskPlaceholder')} returnKeyType="done" onSubmitEditing={addTask} />
          <AppInput value={taskDescription} onChangeText={setTaskDescription} placeholder={t('taskDescription')} />
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <View style={{ flex: 1, flexDirection: isRTL ? 'row-reverse' : 'row', gap: 6 }}>
              {priorities.map((priority) => (
                <ChoiceChip key={priority} label={t(priority)} selected={priority === taskPriority} onPress={() => setTaskPriority(priority)} />
              ))}
            </View>
            <AppInput
              value={taskMinutes}
              onChangeText={setTaskMinutes}
              keyboardType="number-pad"
              placeholder="25"
              accessibilityLabel={t('taskMinutes')}
              style={{ width: 66, minHeight: 40, textAlign: 'center', fontFamily: fontFamily(language) }}
            />
          </View>
          <PrimaryButton label={t('addTask')} icon="plus" secondary onPress={addTask} disabled={!taskTitle.trim()} />
        </Panel>

        {tasks.map((task, index) => (
          <Panel key={task.id} style={{ marginBottom: 8, padding: 11, gap: 8 }}>
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 5 }}>
              <AppInput
                value={task.title}
                onChangeText={(value) => updateTask(task.id, { title: value })}
                style={{ flex: 1, minHeight: 42 }}
              />
              <IconButton name="chevron-up" accessibilityLabel={t('reorderUp')} onPress={() => moveTask(task.id, -1)} />
              <IconButton name="chevron-down" accessibilityLabel={t('reorderDown')} onPress={() => moveTask(task.id, 1)} />
              <IconButton name="trash-2" accessibilityLabel={t('delete')} onPress={() => removeTask(task.id)} color={colors.danger} />
            </View>
            <AppInput
              value={task.description}
              onChangeText={(value) => updateTask(task.id, { description: value })}
              placeholder={t('taskDescription')}
              style={{ minHeight: 38, fontSize: 13 }}
            />
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between' }}>
              <AppText style={{ color: colors.mutedForeground, fontSize: 12 }}>
                {t(task.priority)} · {formatMinutes(task.estimatedMinutes, language)}
              </AppText>
              <AppText style={{ color: colors.mutedForeground, fontSize: 12 }}>{index + 1}/{tasks.length}</AppText>
            </View>
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', flex: 1, gap: 5 }}>
                {priorities.map((priority) => (
                  <ChoiceChip
                    key={priority}
                    label={t(priority)}
                    selected={task.priority === priority}
                    onPress={() => updateTask(task.id, { priority })}
                  />
                ))}
              </View>
              <AppInput
                value={String(task.estimatedMinutes)}
                onChangeText={(value) =>
                  updateTask(task.id, {
                    estimatedMinutes: Math.max(1, Math.min(480, Number(value) || 1)),
                  })
                }
                keyboardType="number-pad"
                accessibilityLabel={t('taskMinutes')}
                style={{ width: 68, minHeight: 38, textAlign: 'center', fontSize: 13 }}
              />
            </View>
          </Panel>
        ))}

        {error ? (
          <AppText style={{ color: colors.danger, marginVertical: 12, fontSize: 13 }}>{error}</AppText>
        ) : null}
        <View style={{ marginTop: 12 }}>
          <PrimaryButton label={t('saveSession')} icon="check" onPress={() => void persist()} testID="save-session" />
        </View>
      </KeyboardAwareScrollViewCompat>
    </SafeAreaView>
  );
}
