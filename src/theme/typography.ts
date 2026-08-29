export const fonts = {
  regular: 'DMSans_400Regular',
  medium: 'DMSans_500Medium',
  semibold: 'DMSans_600SemiBold',
  bold: 'DMSans_700Bold',
} as const;

export const type = {
  display: { fontFamily: fonts.bold, fontSize: 32, lineHeight: 38 },
  title: { fontFamily: fonts.bold, fontSize: 28, lineHeight: 34 },
  subtitle: { fontFamily: fonts.semibold, fontSize: 20, lineHeight: 26 },
  section: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 24 },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24 },
  bodyMedium: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 24 },
  callout: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 22 },
  caption: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  captionMedium: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18 },
  metric: { fontFamily: fonts.bold, fontSize: 28, lineHeight: 34 },
  label: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 20 },
} as const;
