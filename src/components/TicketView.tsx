import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Animated } from 'react-native';
import { useTheme } from '../store/ThemeContext';

type TicketData = (number | null)[][];

export const PLAYER_COLORS = [
  '#e94560', '#7c3aed', '#f5c542', '#00d68f', '#ff9f43', '#3b82f6', '#ec4899', '#14b8a6',
];

// Paper colors for the ticket body — always warm tones regardless of theme
const PAPER = {
  bg: '#FFF9F2',
  cell: '#FFF9F2',
  empty: '#F5EDE4',
  grid: '#E8DDD0',
  gridHeavy: '#D4C5B2',
  number: '#2C2C2C',
  numberLight: '#8A8070',
};

interface TicketViewProps {
  ticket: TicketData;
  markedNumbers: Set<number>;
  calledNumbers: Set<number>;
  onNumberPress?: (num: number) => void;
  label?: string;
  currentNumber?: number | null;
  playerColor?: string;
  enableBlinking?: boolean;
}

const SCREEN_WIDTH = Dimensions.get('window').width;

function NumberCell({
  num,
  cellHeight,
  isMarked,
  isCalled,
  isCurrentCall,
  markedColor,
  onPress,
}: {
  num: number;
  cellHeight: number;
  isMarked: boolean;
  isCalled: boolean;
  isCurrentCall: boolean;
  markedColor: string;
  onPress?: () => void;
}) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isCurrentCall && !isMarked) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.4, duration: 500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      ).start();
      return () => pulseAnim.stopAnimation();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isCurrentCall, isMarked]);

  // Scale in animation for marked state
  useEffect(() => {
    if (isMarked) {
      Animated.spring(scaleAnim, { toValue: 1, friction: 4, tension: 100, useNativeDriver: true }).start();
    } else {
      scaleAnim.setValue(0);
    }
  }, [isMarked]);

  return (
    <TouchableOpacity
      style={{ flex: 1 }}
      onPress={isMarked ? undefined : onPress}
      activeOpacity={isMarked ? 1 : 0.5}
      disabled={isMarked}
    >
      <View style={[s.cell, { height: cellHeight }]}>
        {/* Called highlight ring */}
        {isCalled && !isMarked && (
          <Animated.View
            style={[
              s.calledRing,
              isCurrentCall && { opacity: pulseAnim },
              { borderColor: isCurrentCall ? '#e94560' : '#f5c542' },
            ]}
          />
        )}

        {/* Dauber stamp for marked */}
        {isMarked && (
          <Animated.View
            style={[
              s.dauber,
              { backgroundColor: markedColor, transform: [{ scale: scaleAnim }] },
            ]}
          />
        )}

        {/* Number text */}
        <Text
          style={[
            s.cellNumber,
            isMarked && s.cellNumberMarked,
            isCalled && !isMarked && s.cellNumberCalled,
            isCurrentCall && !isMarked && s.cellNumberCurrent,
          ]}
        >
          {num}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function TicketView({
  ticket,
  markedNumbers,
  calledNumbers,
  onNumberPress,
  label,
  currentNumber,
  playerColor,
  enableBlinking = true,
}: TicketViewProps) {
  const { colors, mode } = useTheme();
  const color = playerColor || PLAYER_COLORS[0];
  const cellHeight = Math.floor((SCREEN_WIDTH - 16) / 9) + 4;

  const safeTicket: (number | null)[][] = [];
  for (let r = 0; r < 3; r++) {
    const row: (number | null)[] = [];
    for (let c = 0; c < 9; c++) {
      const val = ticket?.[r]?.[c];
      row.push(typeof val === 'number' ? val : null);
    }
    safeTicket.push(row);
  }

  const markedCount = safeTicket.flat().filter(n => n !== null && markedNumbers.has(n)).length;
  const isDark = mode === 'dark';

  return (
    <View style={s.wrapper}>
      {/* Shadow layer */}
      <View style={[s.shadowLayer, isDark && s.shadowLayerDark]}>
        {/* Ticket card */}
        <View style={s.ticket}>
          {/* Header ribbon */}
          <View style={[s.ribbon, { backgroundColor: color }]}>
            <Text style={s.ribbonText}>{label || 'HOUSIE'}</Text>
            <View style={s.ribbonCountBox}>
              <Text style={s.ribbonCount}>{markedCount}</Text>
              <Text style={s.ribbonCountTotal}>/15</Text>
            </View>
          </View>

          {/* Decorative line under ribbon */}
          <View style={[s.ribbonStripe, { backgroundColor: `${color}40` }]} />

          {/* Grid */}
          <View style={s.grid}>
            {safeTicket.map((row, rowIndex) => (
              <View key={rowIndex}>
                <View style={s.gridRow}>
                  {row.map((cell, colIndex) => {
                    if (cell === null) {
                      return (
                        <View key={colIndex} style={[s.emptyCell, { height: cellHeight }]}>
                          {/* Diagonal lines pattern for empty cells */}
                          <View style={s.emptyPattern}>
                            <View style={s.emptyLine1} />
                            <View style={s.emptyLine2} />
                          </View>
                        </View>
                      );
                    }
                    return (
                      <NumberCell
                        key={colIndex}
                        num={cell}
                        cellHeight={cellHeight}
                        isMarked={markedNumbers.has(cell)}
                        isCalled={calledNumbers.has(cell)}
                        isCurrentCall={enableBlinking && currentNumber === cell}
                        markedColor={color}
                        onPress={() => onNumberPress?.(cell)}
                      />
                    );
                  })}
                </View>
                {rowIndex < 2 && <View style={s.rowDivider} />}
              </View>
            ))}
          </View>

        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
    marginHorizontal: 6,
  },
  shadowLayer: {
    borderRadius: 12,
    shadowColor: '#8B7355',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  shadowLayerDark: {
    shadowColor: '#000',
    shadowOpacity: 0.4,
  },
  ticket: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: PAPER.bg,
    borderWidth: 1,
    borderColor: PAPER.grid,
  },
  // Ribbon header
  ribbon: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  ribbonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 3,
  },
  ribbonCountBox: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  ribbonCount: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
  },
  ribbonCountTotal: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '600',
  },
  ribbonStripe: {
    height: 3,
  },
  // Grid
  grid: {
    padding: 2,
  },
  gridRow: {
    flexDirection: 'row',
  },
  rowDivider: {
    height: 1.5,
    backgroundColor: PAPER.gridHeavy,
    marginHorizontal: 4,
  },
  // Empty cell
  emptyCell: {
    flex: 1,
    backgroundColor: PAPER.empty,
    borderWidth: 0.5,
    borderColor: PAPER.grid,
    overflow: 'hidden',
  },
  emptyPattern: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.3,
  },
  emptyLine1: {
    position: 'absolute',
    width: '140%',
    height: 1,
    backgroundColor: PAPER.grid,
    top: '30%',
    left: '-20%',
    transform: [{ rotate: '-45deg' }],
  },
  emptyLine2: {
    position: 'absolute',
    width: '140%',
    height: 1,
    backgroundColor: PAPER.grid,
    top: '65%',
    left: '-20%',
    transform: [{ rotate: '-45deg' }],
  },
  // Number cell
  cell: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: PAPER.cell,
    borderWidth: 0.5,
    borderColor: PAPER.grid,
  },
  cellNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: PAPER.number,
    zIndex: 2,
  },
  cellNumberMarked: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 15,
  },
  cellNumberCalled: {
    color: '#B8860B',
    fontWeight: '800',
  },
  cellNumberCurrent: {
    color: '#c0392b',
    fontWeight: '900',
    fontSize: 17,
  },
  // Called ring
  calledRing: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderRadius: 4,
    margin: 2,
    zIndex: 1,
  },
  // Dauber stamp
  dauber: {
    position: 'absolute',
    width: '75%',
    aspectRatio: 1,
    borderRadius: 100,
    opacity: 0.85,
    zIndex: 1,
    // Inner shadow effect
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
});
