import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../store/ThemeContext';

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  hideBack?: boolean;
  rightActionLabel?: string;
  onRightPress?: () => void;
};

export default function ScreenHeader({
  title,
  subtitle,
  hideBack = false,
  rightActionLabel,
  onRightPress,
}: ScreenHeaderProps) {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <View style={[styles.wrap, { borderBottomColor: colors.border }]}>
      <View style={styles.row}>
        {hideBack ? (
          <View style={styles.iconSlot} />
        ) : (
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: colors.surface }]}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={18} color={colors.text} />
          </TouchableOpacity>
        )}

        <View style={styles.center}>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          {subtitle ? <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text> : null}
        </View>

        {rightActionLabel && onRightPress ? (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.surface }]}
            onPress={onRightPress}
            activeOpacity={0.7}
          >
            <Text style={[styles.actionText, { color: colors.text }]}>{rightActionLabel}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.iconSlot} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  center: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconSlot: {
    width: 34,
  },
  actionBtn: {
    minWidth: 34,
    height: 34,
    paddingHorizontal: 10,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
