import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { AppIcon, AppScreen, AppText, EmptyState, IconButton, PrimaryButton, ScreenHeading } from '../components/AppUI';
import { StudySessionCard } from '../components/StudySessionCard';
import { useApp } from '../state/AppContext';
import { addDays, dateKey, formatDate, formatShortDay, getSessionsForDate, parseDateKey } from '../utils';

export default function ScheduleScreen() {
  const { sessions, colors, language, isRTL, t } = useApp();
  const [selectedDate, setSelectedDate] = useState(dateKey());
  const week = useMemo(() => {
    const monday = addDays(selectedDate, -((parseDateKey(selectedDate).getDay() + 6) % 7));
    return Array.from({ length: 7 }, (_, index) => addDays(monday, index));
  }, [selectedDate]);
  const daySessions = getSessionsForDate(sessions, selectedDate);

  const shiftWeek = (amount: number) => setSelectedDate((current) => addDays(current, amount * 7));

  return (
    <AppScreen>
      <ScreenHeading
        title={t('schedule')}
        subtitle={t('weeklyPlan')}
        trailing={
          <IconButton
            name="plus"
            accessibilityLabel={t('createSession')}
            onPress={() => router.push({ pathname: '/session-editor', params: { date: selectedDate } })}
            color={colors.primary}
            size={22}
          />
        }
      />

      <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <IconButton name={isRTL ? 'chevron-right' : 'chevron-left'} accessibilityLabel={t('previousWeek')} onPress={() => shiftWeek(-1)} />
        <AppText weight="semibold" style={{ color: colors.foreground, fontSize: 15 }}>
          {formatDate(selectedDate, language, { month: 'long', year: 'numeric' })}
        </AppText>
        <IconButton name={isRTL ? 'chevron-left' : 'chevron-right'} accessibilityLabel={t('nextWeek')} onPress={() => shiftWeek(1)} />
      </View>

      <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', gap: 5, marginTop: 13 }}>
        {week.map((day) => {
          const active = day === selectedDate;
          const isToday = day === dateKey();
          return (
            <Pressable
              key={day}
              onPress={() => setSelectedDate(day)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={({ pressed }) => ({
                flex: 1,
                minHeight: 70,
                borderRadius: 17,
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
                backgroundColor: active ? colors.primary : colors.card,
                borderColor: active ? colors.primary : colors.border,
                borderWidth: 1,
                opacity: pressed ? 0.75 : 1,
              })}
            >
              <AppText style={{ color: active ? colors.primaryForeground : colors.mutedForeground, fontSize: 11 }}>
                {formatShortDay(day, language)}
              </AppText>
              <AppText weight="semibold" style={{ color: active ? colors.primaryForeground : colors.foreground, fontSize: 15 }}>
                {new Intl.DateTimeFormat(language === 'ar' ? 'ar' : 'en', { day: 'numeric' }).format(parseDateKey(day))}
              </AppText>
              {isToday && !active ? <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: colors.primary }} /> : null}
            </Pressable>
          );
        })}
      </View>

      <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, marginBottom: 12 }}>
        <View style={{ flex: 1 }}>
          <AppText weight="semibold" style={{ color: colors.foreground, fontSize: 18 }}>
            {formatDate(selectedDate, language)}
          </AppText>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push({ pathname: '/session-editor', params: { date: selectedDate } })}
          style={({ pressed }) => ({
            flexDirection: isRTL ? 'row-reverse' : 'row',
            alignItems: 'center',
            gap: 6,
            paddingHorizontal: 12,
            paddingVertical: 9,
            borderRadius: 14,
            backgroundColor: colors.accent,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <AppIcon name="plus" size={15} color={colors.primary} />
          <AppText weight="semibold" style={{ color: colors.primary, fontSize: 13 }}>
            {t('createSession')}
          </AppText>
        </Pressable>
      </View>

      {daySessions.length > 0 ? (
        <View style={{ gap: 12 }}>
          {daySessions.map((session) => (
            <StudySessionCard key={`${session.id}-${selectedDate}`} session={session} occurrenceDate={selectedDate} />
          ))}
        </View>
      ) : (
        <EmptyState
          icon="calendar"
          title={t('noPlannedSessions')}
          description={t('noSessionsDescription')}
          action={
            <PrimaryButton
              label={t('createSession')}
              icon="plus"
              onPress={() => router.push({ pathname: '/session-editor', params: { date: selectedDate } })}
            />
          }
        />
      )}
    </AppScreen>
  );
}
