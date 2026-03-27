import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { ClaimType, CLAIM_LABELS } from '../utils/gameLogic';
import { PRIZE_DISTRIBUTION } from '../constants/theme';
import { useTheme } from '../store/ThemeContext';

interface ClaimButtonsProps {
  claims: Record<string, any> | null | undefined;
  onClaim: (claimType: ClaimType) => void;
  totalPool?: number;
}

const CLAIM_ORDER: ClaimType[] = ['fullHouse', 'jaldiFive', 'topLine', 'middleLine', 'bottomLine'];

export default function ClaimButtons({ claims, onClaim, totalPool = 0 }: ClaimButtonsProps) {
  const { colors } = useTheme();
  const safeClaims = claims || {};

  return (
    <View style={styles.container}>
      {CLAIM_ORDER.map(type => {
        const winner = safeClaims[type];
        const isClaimed = winner != null && winner.playerName;
        const prizeAmount = totalPool > 0
          ? Math.round(totalPool * (PRIZE_DISTRIBUTION[type] / 100))
          : 0;

        return (
          <TouchableOpacity
            key={type}
            style={[
              styles.button,
              { backgroundColor: colors.surface, borderColor: colors.primary },
              isClaimed && { backgroundColor: colors.success, borderColor: colors.success },
            ]}
            onPress={() => {
              if (isClaimed) {
                Alert.alert('Already Claimed', `${CLAIM_LABELS[type]} won by ${winner.playerName}${winner.prizeAmount ? ` — Won ₹${winner.prizeAmount}` : ''}`);
              } else {
                onClaim(type);
              }
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.buttonText, { color: colors.primary }, isClaimed && styles.claimedText]}>
              {CLAIM_LABELS[type]}
            </Text>
            {prizeAmount > 0 && (
              <Text style={[styles.prizeText, { color: colors.accent }]}>₹{prizeAmount}</Text>
            )}
            {isClaimed && (
              <Text style={styles.winnerText}>{winner.playerName}</Text>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  button: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    minWidth: 100,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  buttonText: {
    fontWeight: '700',
    fontSize: 12,
  },
  claimedText: {
    color: '#fff',
    fontSize: 11,
  },
  prizeText: {
    fontSize: 11,
    fontWeight: '800',
    marginTop: 2,
  },
  winnerText: {
    color: '#fff',
    fontSize: 10,
    marginTop: 2,
    fontWeight: '600',
  },
});
