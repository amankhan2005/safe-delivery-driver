import { Platform, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export const COLORS = {
  primary:      '#1B4FD8',
  primaryLight: '#EFF6FF',
  primaryDark:  '#0B1F4B',
  red:          '#E8212B',
  redLight:     '#FFF0F0',
  white:        '#FFFFFF',
  black:        '#111827',
  gray900:      '#111827',
  gray700:      '#374151',
  gray500:      '#6B7280',
  gray400:      '#9CA3AF',
  gray200:      '#E5E7EB',
  gray100:      '#F3F4F6',
  gray50:       '#F9FAFB',
  green:        '#22C55E',
  greenLight:   '#DCFCE7',
  yellow:       '#F59E0B',
  yellowLight:  '#FEF9C3',
  background:   '#F5F7FA',
  border:       '#E2E8F0',
  card:         '#FFFFFF',
};

export const SIZES = {
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  xxl:  24,
  xxxl: 32,
  width,
  height,
  radiusSm:   8,
  radiusMd:   12,
  radiusLg:   16,
  radiusXl:   20,
  radiusFull: 999,
  fontXs:   11,
  fontSm:   12,
  fontMd:   14,
  fontLg:   16,
  fontXl:   18,
  fontXxl:  22,
  fontXxxl: 28,
};

export const SHADOWS = {
  sm: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
    },
    android: { elevation: 2 },
  }),
  md: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
    },
    android: { elevation: 4 },
  }),
  lg: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 20,
    },
    android: { elevation: 8 },
  }),
};

export const HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };
