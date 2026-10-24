import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { StudySession } from '../models';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestLocalNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('study-sessions', {
      name: 'Study reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 200, 100, 200],
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export async function cancelSessionReminder(identifier?: string): Promise<void> {
  if (!identifier || Platform.OS === 'web') return;
  await Notifications.cancelScheduledNotificationAsync(identifier);
}

export async function scheduleTimerCompletionNotification(
  endsAt: number,
  title: string,
  body: string,
): Promise<string | undefined> {
  if (Platform.OS === 'web' || endsAt <= Date.now()) return undefined;
  return Notifications.scheduleNotificationAsync({
    content: { title, body, sound: true },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(endsAt),
      channelId: 'study-sessions',
    },
  });
}

export async function sendLocalNotification(title: string, body: string): Promise<void> {
  if (Platform.OS === 'web') return;
  await Notifications.scheduleNotificationAsync({
    content: { title, body, sound: true },
    trigger: null,
  });
}

export async function scheduleDailyStudyReminder(
  hour: number,
  title: string,
  body: string,
): Promise<string | undefined> {
  if (Platform.OS === 'web') return undefined;
  return Notifications.scheduleNotificationAsync({
    content: { title, body, sound: true },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute: 0,
      channelId: 'study-sessions',
    },
  });
}

export async function cancelAllScheduledNotifications(): Promise<void> {
  if (Platform.OS === 'web') return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function scheduleSessionReminder(
  session: StudySession,
  subjectName: string,
  title: string,
  body: (subject: string, minutes: number) => string,
): Promise<string | undefined> {
  if (Platform.OS === 'web' || session.reminderMinutes === null) return undefined;
  const triggerDate = new Date(`${session.date}T${session.startTime}:00`);
  triggerDate.setMinutes(triggerDate.getMinutes() - session.reminderMinutes);
  if (triggerDate.getTime() <= Date.now()) return undefined;
  return Notifications.scheduleNotificationAsync({
    content: {
      title,
      body: body(subjectName, session.reminderMinutes),
      sound: true,
      data: { sessionId: session.id },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
      channelId: 'study-sessions',
    },
  });
}
