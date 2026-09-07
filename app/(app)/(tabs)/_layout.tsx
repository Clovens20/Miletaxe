import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useUnreadSupportReplies } from '@/features/support/hooks';
import { colors, fonts } from '@/theme';

export default function TabsLayout() {
  const { t } = useTranslation();
  const supportReplies = useUnreadSupportReplies();
  const badge = supportReplies.count ? String(supportReplies.count) : undefined;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 64,
        },
        tabBarLabelStyle: {
          fontFamily: fonts.medium,
          fontSize: 12,
          marginBottom: 6,
        },
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
