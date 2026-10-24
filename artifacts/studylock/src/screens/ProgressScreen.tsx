import React from 'react';
import { View } from 'react-native';
import { AppIcon, AppScreen, AppText, EmptyState, Panel, ProgressBar, ScreenHeading, SectionTitle } from '../components/AppUI';
import { useApp } from '../state/AppContext';
import { addDays, dateKey, formatMinutes, getWeekDates } from '../utils';

export default function ProgressScreen() {
  const { records, subjects, sessions, colors, language, isRTL, t } = useApp();
  const today = dateKey();
  const weekDays = getWeekDates(today);
  const todayRecords = records.filter((record) => record.date === today);
  const weekRecords = records.filter((record) => weekDays.includes(record.date));
  const monthPrefix = today.slice(0, 7);
  const monthRecords = records.filter((record) => record.date.startsWith(monthPrefix));
  const todayMinutes = todayRecords.reduce((sum, record) => sum + record.actualMinutes, 0);
  const weekMinutes = weekRecords.reduce((sum, record) => sum + record.actualMinutes, 0);
  const monthMinutes = monthRecords.reduce((sum, record) => sum + record.actualMinutes, 0);
  const completed = records.filter((record) => record.completed).length;
  const missed = sessions.filter(
    (session) =>
      session.repeatDays.length === 0 &&
      session.date < today &&
      !session.completedDates.includes(session.date),
  ).length;
  const completionRate = records.length ? Math.round((completed / records.length) * 100) : 0;
  const studyDates = new Set(records.filter((record) => record.actualMinutes > 0).map((record) => record.date));
  let streak = 0;
  for (let offset = 0; offset < 366; offset += 1) {
    const key = addDays(today, -offset);
    if (!studyDates.has(key)) break;
    streak += 1;
  }
  const subjectTotals = subjects
    .map((subject) => ({
      ...subject,
      minutes: records
        .filter((record) => record.subjectId === subject.id)
        .reduce((sum, record) => sum + record.actualMinutes, 0),
    }))
    .filter((subject) => subject.minutes > 0)
    .sort((first, second) => second.minutes - first.minutes);
  const dailyBars = weekDays.map((day) => ({
    day,
    minutes: records
      .filter((record) => record.date === day)
      .reduce((sum, record) => sum + record.actualMinutes, 0),
  }));
  const maxBar = Math.max(30, ...dailyBars.map((bar) => bar.minutes));
  const allSubjectMinutes = subjectTotals.reduce((sum, subject) => sum + subject.minutes, 0);
  const metrics = [
    { label: t('dailyTime'), value: formatMinutes(todayMinutes, language), icon: 'sun' as const, tint: colors.primary },
    { label: t('weeklyTime'), value: formatMinutes(weekMinutes, language), icon: 'bar-chart-2' as const, tint: colors.success },
    { label: t('monthlyTime'), value: formatMinutes(monthMinutes, language), icon: 'calendar' as const, tint: colors.warning },
    { label: t('completedSessions'), value: String(completed), icon: 'check-circle' as const, tint: colors.pink },
    { label: t('missedSessions'), value: String(missed), icon: 'calendar' as const, tint: colors.danger },
  ];

  return (
    <AppScreen>
      <ScreenHeading title={t('progress')} subtitle={t('studyTime')} />

      {records.length === 0 ? (
        <EmptyState icon="trending-up" title={t('noProgress')} description={t('noProgressDescription')} />
      ) : null}

      <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: 10 }}>
        {metrics.map((metric) => (
          <Panel key={metric.label} style={{ width: '48%', flexGrow: 1, flexBasis: '45%', padding: 15, gap: 9 }}>
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <AppText style={{ color: colors.mutedForeground, fontSize: 12 }}>{metric.label}</AppText>
              <AppIcon name={metric.icon} size={16} color={metric.tint} />
            </View>
            <AppText weight="bold" style={{ color: colors.foreground, fontSize: 20 }}>
              {metric.value}
            </AppText>
          </Panel>
        ))}
      </View>

      <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 10, marginTop: 10 }}>
        <Panel style={{ flex: 1, flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent }}>
            <AppIcon name="zap" size={17} color={colors.primary} />
          </View>
          <View>
            <AppText weight="bold" style={{ color: colors.foreground, fontSize: 17 }}>
              {streak} {t('streakDays')}
            </AppText>
            <AppText style={{ color: colors.mutedForeground, fontSize: 11 }}>{t('studyStreak')}</AppText>
          </View>
        </Panel>
        <Panel style={{ flex: 1, flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.successSoft }}>
            <AppIcon name="check" size={17} color={colors.success} />
          </View>
          <View>
            <AppText weight="bold" style={{ color: colors.foreground, fontSize: 17 }}>
              {completionRate}%
            </AppText>
            <AppText style={{ color: colors.mutedForeground, fontSize: 11 }}>{t('completionRate')}</AppText>
          </View>
        </Panel>
      </View>

      <SectionTitle title={t('studyChart')} />
      <Panel style={{ padding: 17 }}>
        <View style={{ height: 132, flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'flex-end', justifyContent: 'space-around', gap: 8 }}>
          {dailyBars.map((bar) => (
            <View key={bar.day} style={{ flex: 1, height: '100%', alignItems: 'center', justifyContent: 'flex-end', gap: 7 }}>
              <AppText style={{ color: colors.mutedForeground, fontSize: 9 }}>
                {bar.minutes ? String(bar.minutes) : ''}
              </AppText>
              <View
                style={{
                  width: '72%',
                  minHeight: bar.minutes ? 8 : 4,
                  height: `${Math.max(4, (bar.minutes / maxBar) * 72)}%`,
                  borderRadius: 8,
                  backgroundColor: bar.day === today ? colors.primary : colors.chartMuted,
                }}
              />
              <AppText style={{ color: colors.mutedForeground, fontSize: 10 }}>
                {new Intl.DateTimeFormat(language === 'ar' ? 'ar' : 'en', { weekday: 'narrow' }).format(new Date(`${bar.day}T12:00:00`))}
              </AppText>
            </View>
          ))}
        </View>
      </Panel>

      <SectionTitle title={t('subjectDistribution')} />
      {subjectTotals.length > 0 ? (
        <Panel style={{ gap: 14 }}>
          {subjectTotals.map((subject) => (
            <View key={subject.id} style={{ gap: 7 }}>
              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between' }}>
                <AppText weight="medium" style={{ color: colors.foreground, fontSize: 13 }}>
                  {subject.name}
                </AppText>
                <AppText style={{ color: colors.mutedForeground, fontSize: 12 }}>
                  {formatMinutes(subject.minutes, language)}
                </AppText>
              </View>
              <ProgressBar value={allSubjectMinutes > 0 ? subject.minutes / allSubjectMinutes : 0} color={subject.color} />
            </View>
          ))}
        </Panel>
      ) : (
        <Panel>
          <AppText style={{ color: colors.mutedForeground, fontSize: 13 }}>{t('noProgressDescription')}</AppText>
        </Panel>
      )}
    </AppScreen>
  );
}
