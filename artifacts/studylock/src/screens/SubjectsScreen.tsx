import React, { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppInput, AppText, ChoiceChip, FormLabel, IconButton, Panel, PrimaryButton } from '../components/AppUI';
import { useApp } from '../state/AppContext';
import { SUBJECT_COLORS, type Priority, type StudySubject } from '../models';
import { cancelSessionReminder } from '../services/notifications';

const PRIORITIES: Priority[] = ['low', 'medium', 'high'];
const SUGGESTIONS = [
  { en: 'Mathematics', ar: 'الرياضيات' },
  { en: 'Physics', ar: 'الفيزياء' },
  { en: 'Chemistry', ar: 'الكيمياء' },
  { en: 'Biology', ar: 'الأحياء' },
  { en: 'English', ar: 'الإنجليزية' },
  { en: 'Arabic', ar: 'العربية' },
];

export default function SubjectsScreen() {
  const { subjects, sessions, language, colors, isRTL, t, addSubject, updateSubject, removeSubject } = useApp();
  const insets = useSafeAreaInsets();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(SUBJECT_COLORS[0]);
  const [priority, setPriority] = useState<Priority>('medium');
  const [error, setError] = useState('');

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setDescription('');
    setColor(SUBJECT_COLORS[0]);
    setPriority('medium');
    setError('');
  };

  const beginEdit = (subject: StudySubject) => {
    setEditingId(subject.id);
    setName(subject.name);
    setDescription(subject.description);
    setColor(subject.color);
    setPriority(subject.priority);
    setError('');
  };

  const saveSubject = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError(t('subjectNameRequired'));
      return;
    }
    if (subjects.some((subject) => subject.name.toLocaleLowerCase() === trimmedName.toLocaleLowerCase() && subject.id !== editingId)) {
      setError(t('subjectExists'));
      return;
    }
    if (editingId) {
      updateSubject({ id: editingId, name: trimmedName, description: description.trim(), color, priority });
    } else {
      addSubject({ name: trimmedName, description: description.trim(), color, priority });
    }
    resetForm();
  };

  const deleteSubject = (subject: StudySubject) => {
    Alert.alert(t('deleteSubject'), t('deleteSubjectConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: () => {
          sessions
            .filter((session) => session.subjectId === subject.id)
            .forEach((session) => void cancelSessionReminder(session.reminderNotificationId));
          removeSubject(subject.id);
          if (editingId === subject.id) resetForm();
        },
      },
    ]);
  };

  const addSuggested = (suggestion: { en: string; ar: string }) => {
    const suggestedName = language === 'ar' ? suggestion.ar : suggestion.en;
    if (subjects.some((subject) => subject.name.toLocaleLowerCase() === suggestedName.toLocaleLowerCase())) return;
    addSubject({
      name: suggestedName,
      description: '',
      color: SUBJECT_COLORS[subjects.length % SUBJECT_COLORS.length],
      priority: 'medium',
    });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <KeyboardAwareScrollViewCompat
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{
          paddingTop: 10,
          paddingHorizontal: 20,
          paddingBottom: Math.max(insets.bottom, 24) + 28,
        }}
        bottomOffset={84}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', marginBottom: 20 }}>
          <IconButton name={isRTL ? 'chevron-right' : 'chevron-left'} accessibilityLabel={t('back')} onPress={() => router.back()} />
          <View style={{ flex: 1, marginHorizontal: 6 }}>
            <AppText weight="bold" style={{ color: colors.foreground, fontSize: 24 }}>{t('manageSubjects')}</AppText>
            <AppText style={{ color: colors.mutedForeground, fontSize: 13, marginTop: 2 }}>{subjects.length} {t('subject')}</AppText>
          </View>
        </View>

        <Panel style={{ gap: 10, marginBottom: 17 }}>
          <AppText weight="semibold" style={{ color: colors.foreground, fontSize: 17 }}>
            {editingId ? t('edit') : t('createSubject')}
          </AppText>
          <FormLabel>{t('subjectName')}</FormLabel>
          <AppInput value={name} onChangeText={setName} placeholder={t('subjectName')} />
          <FormLabel>{t('description')}</FormLabel>
          <AppInput value={description} onChangeText={setDescription} placeholder={t('descriptionPlaceholder')} />
          <FormLabel>{t('colors')}</FormLabel>
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 11 }}>
            {SUBJECT_COLORS.map((item) => (
              <Pressable
                key={item}
                accessibilityRole="button"
                accessibilityState={{ selected: color === item }}
                accessibilityLabel={t('colors')}
                onPress={() => setColor(item)}
                style={{
                  width: 29,
                  height: 29,
                  borderRadius: 15,
                  backgroundColor: item,
                  borderWidth: color === item ? 3 : 0,
                  borderColor: colors.foreground,
                }}
              />
            ))}
          </View>
          <FormLabel>{t('priority')}</FormLabel>
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 8 }}>
            {PRIORITIES.map((item) => (
              <ChoiceChip key={item} label={t(item)} selected={priority === item} onPress={() => setPriority(item)} />
            ))}
          </View>
          {error ? <AppText style={{ color: colors.danger, fontSize: 13 }}>{error}</AppText> : null}
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <PrimaryButton label={editingId ? t('updateSubject') : t('createSubject')} icon="check" onPress={saveSubject} />
            </View>
            {editingId ? (
              <PrimaryButton label={t('cancel')} secondary onPress={resetForm} />
            ) : null}
          </View>
        </Panel>

        {subjects.length === 0 ? (
          <Panel style={{ marginBottom: 16 }}>
            <AppText weight="semibold" style={{ color: colors.foreground, fontSize: 15 }}>{t('noSubjects')}</AppText>
            <AppText style={{ color: colors.mutedForeground, fontSize: 13 }}>{t('addFirstSubject')}</AppText>
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: 7 }}>
              {SUGGESTIONS.map((suggestion) => (
                <ChoiceChip
                  key={suggestion.en}
                  label={language === 'ar' ? suggestion.ar : suggestion.en}
                  selected={false}
                  onPress={() => addSuggested(suggestion)}
                />
              ))}
            </View>
          </Panel>
        ) : (
          <View style={{ gap: 9 }}>
            {subjects.map((subject) => (
              <Panel key={subject.id} style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', padding: 13 }}>
                <View style={{ width: 12, height: 42, borderRadius: 8, backgroundColor: subject.color }} />
                <View style={{ flex: 1, marginHorizontal: 10 }}>
                  <AppText weight="semibold" style={{ color: colors.foreground, fontSize: 15 }}>{subject.name}</AppText>
                  {subject.description ? (
                    <AppText style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 2 }}>{subject.description}</AppText>
                  ) : null}
                  <AppText style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 4 }}>
                    {t(subject.priority)}
                  </AppText>
                </View>
                <IconButton name="edit-2" accessibilityLabel={t('edit')} onPress={() => beginEdit(subject)} color={colors.primary} />
                <IconButton name="trash-2" accessibilityLabel={t('delete')} onPress={() => deleteSubject(subject)} color={colors.danger} />
              </Panel>
            ))}
          </View>
        )}
      </KeyboardAwareScrollViewCompat>
    </SafeAreaView>
  );
}
