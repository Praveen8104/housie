import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions } from 'react-native';
import { ref, onChildAdded, query, orderByChild, startAt } from 'firebase/database';
import { db } from '../firebase/config';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../store/ThemeContext';
import { hapticLight } from '../utils/haptics';

const REACTIONS: { icon: keyof typeof Ionicons.glyphMap; label: string; color: string }[] = [
  { icon: 'thumbs-up', label: 'like', color: '#3b82f6' },
  { icon: 'sparkles', label: 'wow', color: '#f5c542' },
  { icon: 'happy', label: 'haha', color: '#00d68f' },
  { icon: 'alert-circle', label: 'shock', color: '#ff9f43' },
  { icon: 'flame', label: 'fire', color: '#e94560' },
  { icon: 'heart-dislike', label: 'sad', color: '#7c3aed' },
];
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface FloatingEmoji {
  id: string;
  emoji: string;
  playerName: string;
  x: number;
  y: Animated.Value;
  scale: Animated.Value;
  opacity: Animated.Value;
}

interface ReactionBarProps {
  roomCode: string;
  playerName: string;
  onSend: (emoji: string) => void;
}

export function ReactionOverlay({ roomCode }: { roomCode: string }) {
  const [floatingEmojis, setFloatingEmojis] = useState<FloatingEmoji[]>([]);
  const mountTime = useRef(Date.now());
  const mountedRef = useRef(true);

  useEffect(() => { return () => { mountedRef.current = false; }; }, []);

  useEffect(() => {
    const reactionsRef = query(
      ref(db, `rooms/${roomCode}/reactions`),
      orderByChild('timestamp'),
      startAt(mountTime.current)
    );

    const unsub = onChildAdded(reactionsRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) return;

      const id = snapshot.key || String(Math.random());
      const xPos = 20 + Math.random() * 60; // 20-80% of width
      const floater: FloatingEmoji = {
        id,
        emoji: data.emoji,
        playerName: data.playerName,
        x: xPos,
        y: new Animated.Value(0),
        scale: new Animated.Value(0.3),
        opacity: new Animated.Value(1),
      };

      if (!mountedRef.current) return;
      setFloatingEmojis(prev => [...prev, floater]);

      Animated.parallel([
        Animated.timing(floater.y, {
          toValue: -SCREEN_HEIGHT * 0.4,
          duration: 2500,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.spring(floater.scale, {
            toValue: 1,
            friction: 4,
            useNativeDriver: true,
          }),
          Animated.timing(floater.scale, {
            toValue: 0.6,
            duration: 1500,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.delay(1500),
          Animated.timing(floater.opacity, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => {
        if (mountedRef.current) setFloatingEmojis(prev => prev.filter(e => e.id !== id));
      });
    });

    return () => unsub();
  }, [roomCode]);

  if (floatingEmojis.length === 0) return null;

  return (
    <View style={overlayStyles.container} pointerEvents="none">
      {floatingEmojis.map(f => (
        <Animated.View
          key={f.id}
          style={[
            overlayStyles.floating,
            {
              left: `${f.x}%`,
              transform: [
                { translateY: f.y },
                { scale: f.scale },
              ],
              opacity: f.opacity,
            },
          ]}
        >
          <Ionicons
            name={(REACTIONS.find(r => r.label === f.emoji)?.icon || 'heart') as keyof typeof Ionicons.glyphMap}
            size={32}
            color={REACTIONS.find(r => r.label === f.emoji)?.color || '#fff'}
          />
          <View style={overlayStyles.nameBadge}>
            <Text style={overlayStyles.name}>{f.playerName}</Text>
          </View>
        </Animated.View>
      ))}
    </View>
  );
}

const overlayStyles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
  floating: {
    position: 'absolute',
    bottom: 100,
    alignItems: 'center',
  },
  nameBadge: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 2,
  },
  name: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
});

export default function ReactionBar({ roomCode, playerName, onSend }: ReactionBarProps) {
  const { colors } = useTheme();
  const lastSentRef = useRef(0);

  const handleSend = (emoji: string) => {
    const now = Date.now();
    if (now - lastSentRef.current < 2000) return; // 2s cooldown
    lastSentRef.current = now;
    hapticLight();
    onSend(emoji);
  };

  return (
    <View style={[styles.bar, { backgroundColor: colors.surface }]}>
      {REACTIONS.map(reaction => (
        <TouchableOpacity
          key={reaction.label}
          style={[styles.emojiBtn, { backgroundColor: colors.card }]}
          onPress={() => handleSend(reaction.label)}
          activeOpacity={0.6}
        >
          <Ionicons name={reaction.icon} size={22} color={reaction.color} />
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    // backgroundColor set inline via colors.surface
    borderRadius: 12,
    marginTop: 16,
    marginBottom: 8,
  },
  emojiBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    // backgroundColor set inline via colors.card
    justifyContent: 'center',
    alignItems: 'center',
  },
});
