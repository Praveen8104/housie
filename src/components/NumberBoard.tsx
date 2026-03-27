import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { useTheme } from '../store/ThemeContext';

interface NumberBoardProps {
  calledNumbers: Set<number>;
  currentNumber?: number | null;
}

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function NumberBoard({ calledNumbers, currentNumber }: NumberBoardProps) {
  const { colors } = useTheme();
  const cellSize = Math.floor((SCREEN_WIDTH - 40) / 10);

  const rows: number[][] = [];
  for (let i = 0; i < 9; i++) {
    const row: number[] = [];
    for (let j = 1; j <= 10; j++) {
      const num = i * 10 + j;
      if (num <= 90) row.push(num);
    }
    rows.push(row);
  }

  return (
    <View style={[styles.container, { borderColor: colors.border }]}>
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map(num => {
            const isCalled = calledNumbers.has(num);
            const isCurrent = num === currentNumber;
            return (
              <View
                key={num}
                style={[
                  styles.cell,
                  { width: cellSize, height: cellSize - 4, backgroundColor: colors.surface, borderColor: colors.border },
                  isCalled && { backgroundColor: colors.calledNumber },
                  isCurrent && { backgroundColor: colors.primary },
                ]}
              >
                <Text style={[
                  styles.cellText,
                  { color: colors.textSecondary },
                  isCalled && { color: colors.background, fontWeight: '800' },
                  isCurrent && { color: '#fff', fontWeight: '900' },
                ]}>
                  {num}
                </Text>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
  },
  row: { flexDirection: 'row' },
  cell: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
  },
  cellText: { fontSize: 11, fontWeight: '500' },
});
