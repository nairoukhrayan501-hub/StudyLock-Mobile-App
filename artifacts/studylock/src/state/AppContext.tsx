import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useColorScheme } from 'react-native';
import { useColors } from '@/hooks/useColors';
import {
  DEFAULT_SETTINGS,
  SUBJECT_COLORS,
  type ActiveFocus,
  type AppData,
  type FocusRecord,
  type Language,
  type Priority,
  type StudySession,
  type StudySettings,
  type StudySubject,
  type StudyTask,
} from '../models';
import { translate, type CopyKey } from '../i18n';
import { addDays, dateKey, makeId, minutesForTime, remainingMilliseconds } from '../utils';
import {
  cancelSessionReminder,
  scheduleTimerCompletionNotification,
  sendLocalNotification,
} from '../services/notifications';

const STORAGE_KEY = '@studylock/data-v1';

const initialData: AppData = {
  subjects: [],
  sessions: [],
  records: [],
  settings: DEFAULT_SETTINGS,
  activeFocus: null,
};

interface AppContextValue extends AppData {
  ready: boolean;
  storageError: boolean;
  isRTL: boolean;
  language: Language;
  colors: ReturnType<typeof useColors>;
  t: (key: CopyKey) => string;
  addSubject: (input: Omit<StudySubject, 'id'>) => StudySubject;
  updateSubject: (subject: StudySubject) => void;
  removeSubject: (id: string) => void;
  addSession: (session: StudySession) => void;
  updateSession: (session: StudySession) => void;
  removeSession: (id: string) => void;
  duplicateSession: (session: StudySession) => StudySession;
  toggleTask: (sessionId: string, taskId: string) => void;
  moveTask: (sessionId: string, taskId: string, direction: -1 | 1) => void;
  updateSettings: (settings: Partial<StudySettings>) => void;
  startSessionFocus: (session: StudySession, occurrenceDate?: string) => void;
  startQuickFocus: (subjectId: string, durationMinutes?: number) => void;
  startBreak: (durationMinutes: number, subjectId?: string | null) => void;
  pauseFocus: () => void;
  resumeFocus: () => void;
  finishFocus: (completed: boolean) => void;
  finishBreak: () => void;
  clearAllData: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

function normalizeData(input: Partial<AppData> | null): AppData {
  return {
    ...initialData,
    ...input,
    settings: { ...DEFAULT_SETTINGS, ...input?.settings },
    subjects: Array.isArray(input?.subjects) ? input.subjects : [],
    sessions: Array.isArray(input?.sessions) ? input.sessions : [],
    records: Array.isArray(input?.records) ? input.records : [],
    activeFocus: input?.activeFocus ?? null,
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(initialData);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const systemScheme = useColorScheme();
  const effectiveTheme =
    data.settings.theme === 'system'
      ? systemScheme === 'dark'
        ? 'dark'
        : 'light'
      : data.settings.theme;
  const colors = useColors(effectiveTheme);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => {
        if (!mounted) return;
        if (value) setData(normalizeData(JSON.parse(value) as Partial<AppData>));
      })
      .catch((error) => {
        console.error('StudyLock local data could not be loaded.', error);
        if (mounted) setStorageError(true);
      })
      .finally(() => {
        if (mounted) setReady(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)).catch(() => setStorageError(true));
  }, [data, ready]);

  const addSubject = useCallback((input: Omit<StudySubject, 'id'>) => {
    const subject = { ...input, id: makeId('subject') };
    setData((current) => ({ ...current, subjects: [...current.subjects, subject] }));
    return subject;
  }, []);

  const updateSubject = useCallback((subject: StudySubject) => {
    setData((current) => ({
      ...current,
      subjects: current.subjects.map((item) => (item.id === subject.id ? subject : item)),
    }));
  }, []);

  const removeSubject = useCallback((id: string) => {
    const removedSessions = data.sessions.filter((session) => session.subjectId === id);
    const completionNotificationId =
      data.activeFocus?.subjectId === id ? data.activeFocus.completionNotificationId : undefined;
    void Promise.allSettled([
      ...removedSessions.map((session) => cancelSessionReminder(session.reminderNotificationId)),
      cancelSessionReminder(completionNotificationId),
    ]);
    setData((current) => ({
      ...current,
      subjects: current.subjects.filter((subject) => subject.id !== id),
      sessions: current.sessions.filter((session) => session.subjectId !== id),
      activeFocus:
        current.activeFocus?.subjectId === id ? null : current.activeFocus,
    }));
  }, [data.activeFocus, data.sessions]);

  const addSession = useCallback((session: StudySession) => {
    setData((current) => ({ ...current, sessions: [...current.sessions, session] }));
  }, []);

  const updateSession = useCallback((session: StudySession) => {
    setData((current) => ({
      ...current,
      sessions: current.sessions.map((item) => (item.id === session.id ? session : item)),
    }));
  }, []);

  const removeSession = useCallback((id: string) => {
    setData((current) => ({
      ...current,
      sessions: current.sessions.filter((session) => session.id !== id),
      activeFocus: current.activeFocus?.sessionId === id ? null : current.activeFocus,
    }));
  }, []);

  const duplicateSession = useCallback((session: StudySession) => {
    const duplicate: StudySession = {
      ...session,
      id: makeId('session'),
      date: addDays(session.date, 7),
      tasks: session.tasks.map((task) => ({ ...task, id: makeId('task'), completed: false })),
      completedDates: [],
      cancelledDates: [],
      reminderNotificationId: undefined,
    };
    setData((current) => ({ ...current, sessions: [...current.sessions, duplicate] }));
    return duplicate;
  }, []);

  const toggleTask = useCallback((sessionId: string, taskId: string) => {
    setData((current) => ({
      ...current,
      sessions: current.sessions.map((session) =>
        session.id !== sessionId
          ? session
          : {
              ...session,
              tasks: session.tasks.map((task) =>
                task.id === taskId ? { ...task, completed: !task.completed } : task,
              ),
            },
      ),
    }));
  }, []);

  const moveTask = useCallback((sessionId: string, taskId: string, direction: -1 | 1) => {
    setData((current) => ({
      ...current,
      sessions: current.sessions.map((session) => {
        if (session.id !== sessionId) return session;
        const index = session.tasks.findIndex((task) => task.id === taskId);
        const nextIndex = index + direction;
        if (index < 0 || nextIndex < 0 || nextIndex >= session.tasks.length) return session;
        const tasks = [...session.tasks];
        [tasks[index], tasks[nextIndex]] = [tasks[nextIndex], tasks[index]];
        return { ...session, tasks };
      }),
    }));
  }, []);

  const updateSettings = useCallback((settings: Partial<StudySettings>) => {
    setData((current) => ({
      ...current,
      settings: { ...current.settings, ...settings },
    }));
  }, []);

  const makeActiveFocus = useCallback(
    (
      sessionId: string | null,
      occurrenceDate: string | null,
      subjectId: string | null,
      durationMinutes: number,
      mode: 'study' | 'break' = 'study',
    ): ActiveFocus => {
      const now = Date.now();
      return {
        sessionId,
        occurrenceDate,
        subjectId,
        mode,
        startedAt: now,
        endsAt: now + durationMinutes * 60_000,
        durationMinutes,
        pausedRemainingMs: null,
      };
    },
    [],
  );

  const scheduleFocusNotice = useCallback(
    (focus: ActiveFocus) => {
      if (!data.settings.notificationsEnabled) return;
      const subjectName =
        data.subjects.find((subject) => subject.id === focus.subjectId)?.name ??
        translate('focus', data.settings.language);
      const title = translate(
        focus.mode === 'study' ? 'focusFinishedTitle' : 'breakFinishedTitle',
        data.settings.language,
      );
      const body = translate(
        focus.mode === 'study' ? 'focusFinishedBody' : 'breakFinishedBody',
        data.settings.language,
      );
      void scheduleTimerCompletionNotification(focus.endsAt, title, `${subjectName} · ${body}`).then(
        (notificationId) => {
          if (!notificationId) return;
          setData((current) =>
            current.activeFocus?.startedAt === focus.startedAt
              ? {
                  ...current,
                  activeFocus: { ...current.activeFocus, completionNotificationId: notificationId },
                }
              : current,
          );
        },
      );
      if (focus.mode === 'study') {
        void sendLocalNotification(
          translate('sessionStartedTitle', data.settings.language),
          translate('sessionStartedBody', data.settings.language),
        );
      } else {
        void sendLocalNotification(
          translate('breakStartedTitle', data.settings.language),
          translate('breakStartedBody', data.settings.language),
        );
      }
    },
    [data.settings.language, data.settings.notificationsEnabled, data.subjects],
  );

  const startSessionFocus = useCallback(
    (session: StudySession, occurrenceDate = session.date) => {
      const sessionDuration =
        (minutesForTime(session.endTime) ?? 0) - (minutesForTime(session.startTime) ?? 0);
      const start = makeActiveFocus(
        session.id,
        occurrenceDate,
        session.subjectId,
        Math.max(1, sessionDuration),
      );
      setData((current) => ({ ...current, activeFocus: start }));
      scheduleFocusNotice(start);
    },
    [makeActiveFocus, scheduleFocusNotice],
  );

  const startQuickFocus = useCallback(
    (subjectId: string, durationMinutes = data.settings.defaultStudyMinutes) => {
      const focus = makeActiveFocus(null, dateKey(), subjectId, durationMinutes);
      setData((current) => ({
        ...current,
        activeFocus: focus,
      }));
      scheduleFocusNotice(focus);
    },
    [data.settings.defaultStudyMinutes, makeActiveFocus, scheduleFocusNotice],
  );

  const startBreak = useCallback(
    (durationMinutes: number, subjectId?: string | null) => {
      const focus = makeActiveFocus(null, dateKey(), subjectId ?? null, durationMinutes, 'break');
      setData((current) => ({
        ...current,
        activeFocus: focus,
      }));
      scheduleFocusNotice(focus);
    },
    [makeActiveFocus, scheduleFocusNotice],
  );

  const pauseFocus = useCallback(() => {
    const focus = data.activeFocus;
    if (!focus || focus.pausedRemainingMs !== null) return;
    void cancelSessionReminder(focus.completionNotificationId);
    setData((current) => {
      if (current.activeFocus?.startedAt !== focus.startedAt) return current;
      return {
        ...current,
        activeFocus: {
          ...current.activeFocus,
          pausedRemainingMs: remainingMilliseconds(current.activeFocus, Date.now()),
          completionNotificationId: undefined,
        },
      };
    });
  }, [data.activeFocus]);

  const resumeFocus = useCallback(() => {
    const focus = data.activeFocus;
    if (!focus || focus.pausedRemainingMs === null) return;
    const resumed: ActiveFocus = {
      ...focus,
      endsAt: Date.now() + focus.pausedRemainingMs,
      pausedRemainingMs: null,
      completionNotificationId: undefined,
    };
    setData((current) => {
      return current.activeFocus?.startedAt === focus.startedAt
        ? { ...current, activeFocus: resumed }
        : current;
    });
    scheduleFocusNotice(resumed);
  }, [data.activeFocus, scheduleFocusNotice]);

  const finishFocus = useCallback((completed: boolean) => {
    void cancelSessionReminder(data.activeFocus?.completionNotificationId);
    setData((current) => {
      const focus = current.activeFocus;
      if (!focus || focus.mode !== 'study') return current;
      const left = remainingMilliseconds(focus, Date.now());
      const actualMinutes = Math.max(
        0,
        Math.floor((focus.durationMinutes * 60_000 - left) / 60_000),
      );
      const record: FocusRecord = {
        id: makeId('focus'),
        sessionId: focus.sessionId,
        subjectId: focus.subjectId,
        date: focus.occurrenceDate ?? dateKey(),
        startedAt: focus.startedAt,
        plannedMinutes: focus.durationMinutes,
        actualMinutes,
        completed,
      };
      return {
        ...current,
        records: actualMinutes > 0 ? [...current.records, record] : current.records,
        sessions: completed && focus.sessionId
          ? current.sessions.map((session) =>
              session.id === focus.sessionId
                ? {
                    ...session,
                    completedDates: Array.from(
                      new Set([...session.completedDates, focus.occurrenceDate ?? dateKey()]),
                    ),
                  }
                : session,
            )
          : current.sessions,
        activeFocus: null,
      };
    });
  }, [data.activeFocus]);

  const finishBreak = useCallback(() => {
    void cancelSessionReminder(
      data.activeFocus?.mode === 'break' ? data.activeFocus.completionNotificationId : undefined,
    );
    setData((current) => ({
      ...current,
      activeFocus: current.activeFocus?.mode === 'break' ? null : current.activeFocus,
    }));
  }, [data.activeFocus]);

  const clearAllData = useCallback(() => {
    setData({ ...initialData, settings: { ...DEFAULT_SETTINGS } });
    setStorageError(false);
  }, []);

  const language: Language = data.settings.language;
  const value = useMemo<AppContextValue>(
    () => ({
      ...data,
      ready,
      storageError,
      isRTL: language === 'ar',
      language,
      colors,
      t: (key) => translate(key, language),
      addSubject,
      updateSubject,
      removeSubject,
      addSession,
      updateSession,
      removeSession,
      duplicateSession,
      toggleTask,
      moveTask,
      updateSettings,
      startSessionFocus,
      startQuickFocus,
      startBreak,
      pauseFocus,
      resumeFocus,
      finishFocus,
      finishBreak,
      clearAllData,
    }),
    [
      data,
      ready,
      storageError,
      language,
      colors,
      addSubject,
      updateSubject,
      removeSubject,
      addSession,
      updateSession,
      removeSession,
      duplicateSession,
      toggleTask,
      moveTask,
      updateSettings,
      startSessionFocus,
      startQuickFocus,
      startBreak,
      pauseFocus,
      resumeFocus,
      finishFocus,
      finishBreak,
      clearAllData,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used inside AppProvider.');
  return context;
}

export function makeTask(input: {
  title: string;
  description?: string;
  priority?: Priority;
  estimatedMinutes?: number;
}): StudyTask {
  return {
    id: makeId('task'),
    title: input.title.trim(),
    description: input.description?.trim() ?? '',
    priority: input.priority ?? 'medium',
    estimatedMinutes: input.estimatedMinutes ?? 25,
    completed: false,
  };
}
