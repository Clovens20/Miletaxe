import { Text, useWindowDimensions } from 'react-native';
import { Tabs, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useUnreadSupportReplies } from '@/features/support/hooks';
import { colors, fonts } from '@/theme';

const TAB_BAR_CONTENT_HEIGHT = 64;

export default function TabsLayout() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const supportReplies = useUnreadSupportReplies();
  const onMessages = pathname === '/messages' || pathname.endsWith('/messages');
  const badge = !onMessages && supportReplies.count ? String(supportReplies.count) : undefined;
  const bottomInset = Math.max(insets.bottom, 0);
  const { width } = useWindowDimensions();
  const labelSize = width < 400 ? 10 : 11;

  return (
    <Tabs
      safeAreaInsets={{ bottom: bottomInset }}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarAllowFontScaling: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: TAB_BAR_CONTENT_HEIGHT + bottomInset,
          paddingTop: 4,
        },
        tabBarItemStyle: {
          paddingVertical: 2,
          paddingHorizontal: 0,
          minWidth: 0,
        },
        tabBarIconStyle: {
          marginBottom: 0,
        },
        tabBarLabel: ({ color, children }) => (
          <Text
            numberOfLines={2}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
            allowFontScaling={false}
            style={{
              color,
              fontFamily: fonts.medium,
              fontSize: labelSize,
              lineHeight: labelSize + 2,
              textAlign: 'center',
              width: '100%',
              marginTop: 2,
            }}
          >
            {children}
          </Text>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="mileage"
        options={{
          title: t('tabs.mileage'),
          tabBarIcon: ({ color, size }) => <Ionicons name="speedometer-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="expenses"
        options={{
          title: t('tabs.expenses'),
          tabBarIcon: ({ color, size }) => <Ionicons name="receipt-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="income"
        options={{
          title: t('tabs.income'),
          tabBarIcon: ({ color, size }) => <Ionicons name="cash-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: t('tabs.messages'),
          tabBarBadge: badge,
          tabBarBadgeStyle: { backgroundColor: colors.accent, color: colors.textInverse },
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline'}
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: t('tabs.more'),
          tabBarIcon: ({ color, size }) => <Ionicons name="menu-outline" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
