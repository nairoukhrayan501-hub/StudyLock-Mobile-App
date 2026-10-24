import React, { type ReactNode } from 'react';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ScrollViewProps,
  type TextInputProps,
  type TextProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Bell,
  BookOpen,
  CalendarDays,
  ChartColumn,
  Check,
  Circle,
  CircleCheck,
  Clock3,
  Coffee,
  Copy,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  House,
  LockKeyhole,
  LogOut,
  Minus,
  Moon,
  Pause,
  Pencil,
  Play,
  Plus,
  Settings,
  Shield,
  SlidersHorizontal,
  Square,
  Sunrise,
  Sun,
  Target,
  Trash2,
  TrendingUp,
  Wind,
  Zap,
  type LucideIcon,
} from 'lucide-react-native';
import { useApp } from '../state/AppContext';

const ICONS = {
  home: House,
  calendar: CalendarDays,
  clock: Clock3,
  'bar-chart-2': ChartColumn,
  settings: Settings,
  sliders: SlidersHorizontal,
  target: Target,
  'check-circle': CircleCheck,
  circle: Circle,
  zap: Zap,
  'book-open': BookOpen,
  check: Check,
  play: Play,
  pause: Pause,
  square: Square,
  coffee: Coffee,
  moon: Moon,
  wind: Wind,
  'edit-2': Pencil,
  copy: Copy,
  'trash-2': Trash2,
  'chevron-up': ChevronUp,
  'chevron-down': ChevronDown,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  minus: Minus,
  plus: Plus,
  'log-out': LogOut,
  bell: Bell,
  sunrise: Sunrise,
  shield: Shield,
  lock: LockKeyhole,
  'trending-up': TrendingUp,
  sun: Sun,
} satisfies Record<string, LucideIcon>;

export type AppIconName = keyof typeof ICONS;

export function AppIcon({
  name,
  size = 20,
  color,
  strokeWidth = 2,
}: {
  name: AppIconName;
  size?: number;
  color: string;
  strokeWidth?: number;
}) {
  const Icon = ICONS[name];
  return <Icon size={size} color={color} strokeWidth={strokeWidth} />;
}

const FONT = {
  en: {
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semibold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
  },
  ar: {
    regular: 'Cairo_400Regular',
    medium: 'Cairo_500Medium',
    semibold: 'Cairo_600SemiBold',
    bold: 'Cairo_700Bold',
  },
} as const;

export function fontFamily(language: 'ar' | 'en', weight: keyof typeof FONT.en = 'regular') {
  return FONT[language][weight];
}

export function AppText({
  children,
  weight = 'regular',
  style,
  ...props
}: TextProps & { children: ReactNode; weight?: keyof typeof FONT.en }) {
  const { language, isRTL, colors } = useApp();
  return (
    <Text
      {...props}
      style={[
        {
          color: colors.foreground,
          fontFamily: fontFamily(language, weight),
          textAlign: isRTL ? 'right' : 'left',
          writingDirection: isRTL ? 'rtl' : 'ltr',
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

export function AppInput({ style, ...props }: TextInputProps) {
  const { colors, language, isRTL } = useApp();
  return (
    <TextInput
      {...props}
      placeholderTextColor={colors.mutedForeground}
      textAlign={isRTL ? 'right' : 'left'}
      style={[
        styles.input,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          color: colors.foreground,
          fontFamily: fontFamily(language),
          writingDirection: isRTL ? 'rtl' : 'ltr',
        },
        style,
      ]}
    />
  );
}

export function AppScreen({
  children,
  contentStyle,
  scroll = true,
  ...scrollProps
}: {
  children: ReactNode;
  contentStyle?: ViewStyle;
  scroll?: boolean;
} & Omit<ScrollViewProps, 'contentContainerStyle'>) {
  const { colors, storageError, t, isRTL } = useApp();
  const insets = useSafeAreaInsets();
  const contentPadding = {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'web' ? 67 : 12,
    paddingBottom: Platform.OS === 'web' ? 112 : Math.max(insets.bottom, 24) + 96,
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      {scroll ? (
        <ScrollView
          style={{ backgroundColor: colors.background }}
          contentContainerStyle={[contentPadding, contentStyle]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          {...scrollProps}
        >
          {storageError ? (
            <View
              style={{
                backgroundColor: colors.danger,
                borderRadius: 13,
                padding: 11,
                marginBottom: 14,
                flexDirection: isRTL ? 'row-reverse' : 'row',
              }}
            >
              <AppText style={{ color: colors.primaryForeground, fontSize: 12 }}>{t('dataError')}</AppText>
            </View>
          ) : null}
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.fill, contentPadding, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export function Panel({
  children,
  style,
}: {
  children: ReactNode;
  style?: ViewStyle;
}) {
  const { colors } = useApp();
  return (
    <View
      style={[
        styles.panel,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  icon,
  secondary = false,
  disabled = false,
  testID,
}: {
  label: string;
  onPress: () => void;
  icon?: AppIconName;
  secondary?: boolean;
  disabled?: boolean;
  testID?: string;
}) {
  const { colors, isRTL } = useApp();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: secondary ? colors.secondary : colors.primary,
          opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
          flexDirection: isRTL ? 'row-reverse' : 'row',
        },
      ]}
    >
      {icon ? (
        <AppIcon
          name={icon}
          size={17}
          color={secondary ? colors.secondaryForeground : colors.primaryForeground}
        />
      ) : null}
      <AppText
        weight="semibold"
        style={{
          color: secondary ? colors.secondaryForeground : colors.primaryForeground,
          fontSize: 15,
        }}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

export function IconButton({
  name,
  onPress,
  color,
  size = 18,
  accessibilityLabel,
  testID,
}: {
  name: AppIconName;
  onPress: () => void;
  color?: string;
  size?: number;
  accessibilityLabel: string;
  testID?: string;
}) {
  const { colors } = useApp();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => ({ padding: 8, opacity: pressed ? 0.55 : 1 })}
    >
      <AppIcon name={name} size={size} color={color ?? colors.mutedForeground} />
    </Pressable>
  );
}

export function ScreenHeading({
  title,
  subtitle,
  trailing,
}: {
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
}) {
  const { colors, isRTL } = useApp();
  return (
    <View style={[styles.headingRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
      <View style={{ flex: 1 }}>
        <AppText weight="bold" style={{ color: colors.foreground, fontSize: 27, lineHeight: 36 }}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText style={{ color: colors.mutedForeground, fontSize: 14, marginTop: 3 }}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {trailing}
    </View>
  );
}

export function SectionTitle({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  const { colors, isRTL } = useApp();
  return (
    <View style={[styles.sectionRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
      <AppText weight="semibold" style={{ color: colors.foreground, fontSize: 18 }}>
        {title}
      </AppText>
      {action && onAction ? (
        <Pressable onPress={onAction} accessibilityRole="button">
          <AppText weight="semibold" style={{ color: colors.primary, fontSize: 13 }}>
            {action}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

export function ChoiceChip({
  label,
  selected,
  onPress,
  color,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  color?: string;
}) {
  const { colors } = useApp();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? color ?? colors.primary : colors.card,
          borderColor: selected ? color ?? colors.primary : colors.border,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
    >
      <AppText
        weight="medium"
        style={{ color: selected ? colors.primaryForeground : colors.foreground, fontSize: 13 }}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

export function ProgressBar({ value, color }: { value: number; color?: string }) {
  const { colors } = useApp();
  const bounded = Math.max(0, Math.min(1, value));
  return (
    <View style={[styles.progressTrack, { backgroundColor: colors.muted }]}>
      {Platform.OS === 'web' ? (
        <View
          style={[
            styles.progressFill,
            { width: `${bounded * 100}%`, backgroundColor: color ?? colors.primary },
          ]}
        />
      ) : (
        <AnimatedProgressFill value={bounded} color={color ?? colors.primary} />
      )}
    </View>
  );
}

function AnimatedProgressFill({ value, color }: { value: number; color: string }) {
  const progress = useSharedValue(0);
  React.useEffect(() => {
    progress.value = withTiming(value, { duration: 420 });
  }, [progress, value]);
  const animatedStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));
  return <Animated.View style={[styles.progressFill, { backgroundColor: color }, animatedStyle]} />;
}

export function EmptyState({
  title,
  description,
  icon = 'book-open',
  action,
}: {
  title: string;
  description: string;
  icon?: AppIconName;
  action?: ReactNode;
}) {
  const { colors } = useApp();
  return (
    <Panel style={styles.emptyPanel}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.accent }]}>
        <AppIcon name={icon} size={24} color={colors.primary} />
      </View>
      <AppText weight="semibold" style={{ color: colors.foreground, fontSize: 17, textAlign: 'center' }}>
        {title}
      </AppText>
      <AppText style={{ color: colors.mutedForeground, fontSize: 14, lineHeight: 22, textAlign: 'center' }}>
        {description}
      </AppText>
      {action}
    </Panel>
  );
}

export function FormLabel({ children }: { children: ReactNode }) {
  const { colors } = useApp();
  return (
    <AppText weight="medium" style={{ color: colors.foreground, fontSize: 14, marginBottom: 8 }}>
      {children}
    </AppText>
  );
}

export function InlineDivider() {
  const { colors } = useApp();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border }} />;
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  fill: { flex: 1 },
  panel: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  headingRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    marginBottom: 22,
  },
  sectionRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 26,
    marginBottom: 12,
  },
  button: {
    minHeight: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    gap: 9,
  },
  chip: {
    minHeight: 36,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 13,
    paddingVertical: 10,
    fontSize: 15,
  },
  progressTrack: {
    height: 8,
    overflow: 'hidden',
    borderRadius: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 8,
  },
  emptyPanel: {
    alignItems: 'center',
    paddingVertical: 25,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
});
