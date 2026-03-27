import React, { useEffect, useRef } from 'react';
import { View, Animated, Dimensions, StyleSheet } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CONFETTI_COUNT = 30;
const COLORS = ['#e94560', '#f5c542', '#00d68f', '#7c3aed', '#ff9f43', '#fff'];

interface ConfettiPiece {
  x: Animated.Value;
  y: Animated.Value;
  rotate: Animated.Value;
  opacity: Animated.Value;
  color: string;
  size: number;
}

interface ConfettiProps {
  visible: boolean;
  onComplete?: () => void;
}

export default function Confetti({ visible, onComplete }: ConfettiProps) {
  const pieces = useRef<ConfettiPiece[]>(
    Array.from({ length: CONFETTI_COUNT }, () => ({
      x: new Animated.Value(Math.random() * SCREEN_WIDTH),
      y: new Animated.Value(-20),
      rotate: new Animated.Value(0),
      opacity: new Animated.Value(1),
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: 6 + Math.random() * 8,
    }))
  ).current;

  useEffect(() => {
    if (!visible) return;

    // Reset positions
    pieces.forEach(p => {
      p.x.setValue(Math.random() * SCREEN_WIDTH);
      p.y.setValue(-20 - Math.random() * 100);
      p.rotate.setValue(0);
      p.opacity.setValue(1);
    });

    const animations = pieces.map(p => {
      const duration = 2000 + Math.random() * 1500;
      const xTarget = (Math.random() - 0.5) * 200;
      return Animated.parallel([
        Animated.timing(p.y, {
          toValue: SCREEN_HEIGHT + 20,
          duration,
          useNativeDriver: true,
        }),
        Animated.timing(p.x, {
          toValue: xTarget + Math.random() * SCREEN_WIDTH,
          duration,
          useNativeDriver: true,
        }),
        Animated.timing(p.rotate, {
          toValue: Math.random() * 10,
          duration,
          useNativeDriver: true,
        }),
        Animated.timing(p.opacity, {
          toValue: 0,
          duration,
          useNativeDriver: true,
        }),
      ]);
    });

    Animated.stagger(40, animations).start(() => {
      onComplete?.();
    });
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {pieces.map((p, i) => (
        <Animated.View
          key={i}
          style={[
            styles.piece,
            {
              width: p.size,
              height: p.size * 0.6,
              backgroundColor: p.color,
              transform: [
                { translateX: p.x },
                { translateY: p.y },
                { rotate: p.rotate.interpolate({
                    inputRange: [0, 10],
                    outputRange: ['0deg', '3600deg'],
                  })
                },
              ],
              opacity: p.opacity,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
  },
  piece: {
    position: 'absolute',
    borderRadius: 2,
  },
});
