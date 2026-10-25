export const colors = {
  yellow: '#FFD400',
  black: '#101010',
  gray: '#F1F2F2',
  white: '#FFFFFF',
  cream: '#FFF7EE',
  orange: '#FFA000',
  orangeInk: '#7C4300',
  purple: '#A900C8',
  lime: '#D9FF96',
  sky: '#D7F5F8',
  blue: '#D7F5F8',
  blueStrong: '#68BDD1',
  purpleSoft: '#F0D5F5',
  coral: '#E93225',
  warmRule: '#E9DDD1',
  muted: '#687073',
  rule: '#D7D9D9',
  warning: '#7A4B00',
  danger: '#8F2020',
  paleWarning: '#F2E8D7',
  paleDanger: '#F3E4E4',
  paleYellow: '#FFFBE0',
  heroMuted: '#3E3C00',
  mapLand: '#D7E7C9',
  mapWater: '#D6F6FC',
  mapStore: '#2F7D32',
  statusGreen: '#36804B',
  statusOlive: '#5A8C2C',
  badgePeach: '#F7E6DD',
  limeInk: '#485439',
  whiteWash: '#FFFFFFA8',
  oliveRule: '#66784A',
  titleLime: '#688B20',
  titleBlue: '#27899F',
  footerInk: '#2E252C',
  inkSoft: '#353535',
  factRule: '#F1E8DF',
  bestWash: '#FFF4BC',
  bestInk: '#704000',
  orderDoorDash: '#C41200',
  orderUber: '#06C167',
};

/** iOS continuous corners. Android ignores the value. */
export const curve = 'continuous' as const;

export const fonts = {
  regular: 'DMSans_400Regular',
  medium: 'DMSans_500Medium',
  bold: 'DMSans_700Bold',
  mono: 'SpaceMono_400Regular',
  monoBold: 'SpaceMono_700Bold',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 40,
};

export const radii = {
  sm: 10,
  md: 16,
  lg: 24,
  pill: 999,
};

export const tabular = { fontVariant: ['tabular-nums'] as const };

/** Android touch feedback. iOS and web keep the opacity press state. */
export const ripple = { color: 'rgba(16, 16, 16, 0.12)' } as const;
