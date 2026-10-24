export type Language = 'ar' | 'en';
export type ThemeMode = 'system' | 'light' | 'dark';
export type Priority = 'low' | 'medium' | 'high';

export interface StudySubject {
  id: string;
  name: string;
  description: string;
  color: string;
  priority: Priority;
}

export interface StudyTask {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  estimatedMinutes: number;
  completed: boolean;
}

export interface StudySession {
  id: string;
  subjectId: string;
  date: string;
  startTime: string;
  endTime: string;
  notes: string;
  reminderMinutes: number | null;
  reminderNotificationId?: string;
  repeatDays: number[];
  tasks: StudyTask[];
  completedDates: string[];
  cancelledDates: string[];
}

export interface FocusRecord {
  id: string;
  sessionId: string | null;
  subjectId: string | null;
  date: string;
  startedAt: number;
  plannedMinutes: number;
  actualMinutes: number;
  completed: boolean;
}

export interface ActiveFocus {
  sessionId: string | null;
  occurrenceDate: string | null;
  subjectId: string | null;
  mode: 'study' | 'break';
  startedAt: number;
  endsAt: number;
  durationMinutes: number;
  pausedRemainingMs: number | null;
  completionNotificationId?: string;
}

export interface StudySettings {
  language: Language;
  theme: ThemeMode;
  notificationsEnabled: boolean;
  defaultStudyMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  dailyGoalMinutes: number;
  allowEarlyEnd: boolean;
  dailyReminderEnabled: boolean;
  dailyReminderHour: number;
  dailyReminderNotificationId?: string;
}

export interface AppData {
  subjects: StudySubject[];
  sessions: StudySession[];
  records: FocusRecord[];
  settings: StudySettings;
  activeFocus: ActiveFocus | null;
}

export const SUBJECT_COLORS = [
  '#2563EB',
  '#16A34A',
  '#D97706',
  '#DB2777',
  '#7C3AED',
  '#0891B2',
];

export const DEFAULT_SETTINGS: StudySettings = {
  language: 'ar',
  theme: 'system',
  notificationsEnabled: false,
  defaultStudyMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  dailyGoalMinutes: 120,
  allowEarlyEnd: true,
  dailyReminderEnabled: false,
  dailyReminderHour: 18,
};
