import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { colors, radius, type } from '@/theme';

type Props = TextInputProps & {
  label: string;
  hint?: string;
  error?: string;
  password?: boolean;
};

export function TextField({ label, hint, error, password, secureTextEntry, style, ...props }: Props) {
  const { t } = useTranslation();
  const [revealed, setRevealed] = useState(false);
  const hidden = password ? !revealed : Boolean(secureTextEntry);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrap}>
        <TextInput
          placeholderTextColor={colors.textMuted}
          {...props}
          secureTextEntry={hidden}
          autoCorrect={password ? false : props.autoCorrect}
          autoCapitalize={password ? 'none' : props.autoCapitalize}
          style={[styles.input, password ? styles.inputPassword : null, error ? styles.inputError : null, style]}
        />
        {password ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={revealed ? t('auth.hidePassword') : t('auth.showPassword')}
            hitSlop={8}
            onPress={() => setRevealed((value) => !value)}
            style={({ pressed }) => [styles.eye, pressed && styles.eyePressed]}
          >
            <Ionicons name={revealed ? 'eye-off-outline' : 'eye-outline'} size={22} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 6,
    width: '100%',
  },
  inputWrap: {
    position: 'relative',
    width: '100%',
  },
  label: {
    ...type.label,
    color: colors.text,
  },
  input: {
    ...type.body,
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    backgroundColor: colors.surface,
    color: colors.text,
  },
  inputPassword: {
    paddingRight: 48,
  },
  inputError: {
    borderColor: colors.danger,
  },
  eye: {
    position: 'absolute',
    right: 4,
    top: 0,
    bottom: 0,
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyePressed: {
    opacity: 0.6,
  },
  hint: {
    ...type.caption,
    color: colors.textSecondary,
  },
  error: {
    ...type.caption,
    color: colors.danger,
  },
});
