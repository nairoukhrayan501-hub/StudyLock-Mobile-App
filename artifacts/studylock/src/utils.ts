import type { StudySession } from './models';

export function makeId(prefix = 'id'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function dateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDateKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function addDays(key: string, amount: number): string {
  const date = parseDateKey(key);
  date.setDate(date.getDate() + amount);
  return dateKey(date);
}

export function getWeekDates(key: string): string[] {
  const date = parseDateKey(key);
  const mondayOffset = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - mondayOffset);
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(date);
    day.setDate(date.getDate() + index);
    return dateKey(day);
  });
}

export function formatDate(key: string, language: 'ar' | 'en', options?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(language === 'ar' ? 'ar' : 'en', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    ...options,
  }).format(parseDateKey(key));
}

export function formatShortDay(key: string, language: 'ar' | 'en'): string {
  return new Intl.DateTimeFormat(language === 'ar' ? 'ar' : 'en', {
    weekday: 'short',
  }).format(parseDateKey(key));
}

export function formatNumber(value: number, language: 'ar' | 'en'): string {
  return new Intl.NumberFormat(language === 'ar' ? 'ar' : 'en').format(value);
}

export function formatClockTime(value: string, language: 'ar' | 'en'): string {
  const [hours, minutes] = value.split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return value;
  return new Intl.DateTimeFormat(language === 'ar' ? 'ar' : 'en', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: language === 'en',
  }).format(new Date(2020, 0, 1, hours, minutes));
}

export function formatTimestamp(value: number, language: 'ar' | 'en'): string {
  return new Intl.DateTimeFormat(language === 'ar' ? 'ar' : 'en', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: language === 'en',
  }).format(new Date(value));
}

export function formatMinutes(minutes: number, language: 'ar' | 'en'): string {
  const safeMinutes = Math.max(0, Math.floor(minutes));
  const hours = Math.floor(safeMinutes / 60);
  const remaining = safeMinutes % 60;
  const number = (value: number) => formatNumber(value, language);
  if (hours === 0) return `${number(remaining)} ${language === 'ar' ? 'د' : 'min'}`;
  if (remaining === 0) return `${number(hours)} ${language === 'ar' ? 'س' : 'hr'}`;
  return `${number(hours)} ${language === 'ar' ? 'س' : 'hr'} ${number(remaining)} ${language === 'ar' ? 'د' : 'min'}`;
}

export function minutesForTime(value: string): number | null {
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)) return null;
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

export function isValidDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = parseDateKey(value);
  return dateKey(date) === value;
}

export function getSessionsForDate(sessions: StudySession[], key: string): StudySession[] {
  const dayOfWeek = parseDateKey(key).getDay();
  return sessions
    .filter((session) => !session.cancelledDates.includes(key))
    .filter(
      (session) =>
        session.date === key ||
        (key >= session.date && session.repeatDays.includes(dayOfWeek)),
    )
    .sort((first, second) => first.startTime.localeCompare(second.startTime));
}

export function sessionsOverlap(first: StudySession, second: StudySession): boolean {
  const firstStart = minutesForTime(first.startTime);
  const firstEnd = minutesForTime(first.endTime);
  const secondStart = minutesForTime(second.startTime);
  const secondEnd = minutesForTime(second.endTime);
  if (firstStart === null || firstEnd === null || secondStart === null || secondEnd === null) return false;
  return firstStart < secondEnd && secondStart < firstEnd;
}

export function remainingMilliseconds(
  focus: { endsAt: number; pausedRemainingMs: number | null },
  now: number,
): number {
  return Math.max(0, focus.pausedRemainingMs ?? focus.endsAt - now);
}
