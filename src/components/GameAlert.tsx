import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Modal, Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../store/ThemeContext';

interface GameAlertProps {
  visible: boolean;
  title: string;
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  onClose: () => void;
  buttons?: { text: string; onPress?: () => void; style?: 'default' | 'cancel' | 'destructive' }[];
}

const TYPE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  success: 'checkmark-circle',
  error: 'close-circle',
  info: 'information-circle',
  warning: 'warning',
};

const FUN_SUCCESS_MESSAGES = [
  'Somebody call the fire department!',
  'You absolute legend!',
  'The crowd goes wild!',
  'Is this real life?!',
  'Better than a lottery!',
  'Your ticket was on fire!',
];

const FUN_ERROR_MESSAGES = [
  'Not today, champ!',
  'Nice try though!',
  'Almost had it! So close!',
  'The numbers weren\'t feeling it.',
  'Patience is a virtue!',
  'Keep calm and mark on!',
];

export function getFunMessage(type: 'success' | 'error'): string {
  const arr = type === 'success' ? FUN_SUCCESS_MESSAGES : FUN_ERROR_MESSAGES;
  return arr[Math.floor(Math.random() * arr.length)];
}

function getTypeBg(type: string, colors: any): string {
  switch (type) {
    case 'success': return '#059669';
    case 'error': return colors.primary;
    case 'info': return colors.secondary;
    case 'warning': return '#ea8a2e';
    default: return colors.secondary;
  }
}

export default function GameAlert({ visible, title, message, type = 'info', onClose, buttons }: GameAlertProps) {
  const { colors } = useTheme();
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, friction: 5, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      scaleAnim.setValue(0.5);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  const bg = getTypeBg(type, colors);
  const icon = TYPE_ICONS[type] || 'information-circle';
  const actionButtons = buttons || [{ text: 'OK', onPress: onClose }];

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.overlay, { opacity: opacityAnim }]}>
        <Animated.View style={[styles.container, { transform: [{ scale: scaleAnim }], backgroundColor: colors.surface }]}>
          <View style={[styles.iconCircle, { backgroundColor: bg }]}>
            <Ionicons name={icon} size={32} color="#fff" />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
          <View style={styles.buttonRow}>
            {actionButtons.map((btn, i) => (
              <TouchableOpacity
                key={i}
                style={[
                  styles.button,
                  btn.style === 'destructive' && { backgroundColor: colors.primary },
                  btn.style === 'cancel' && { backgroundColor: colors.card },
                  !btn.style && { backgroundColor: bg },
                ]}
                onPress={() => { btn.onPress?.(); onClose(); }}
              >
                <Text style={[styles.buttonText, btn.style === 'cancel' && { color: colors.textSecondary }]}>
                  {btn.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  container: {
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
