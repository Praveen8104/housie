import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../store/ThemeContext';
import { CLAIM_LABELS, ClaimType } from '../utils/gameLogic';

const CLAIM_ORDER: ClaimType[] = ['fullHouse', 'jaldiFive', 'topLine', 'middleLine', 'bottomLine'];

interface GameOverSummaryProps {
  visible: boolean;
  onClose: () => void;
  onPlayAgain?: () => void;
  onGoHome?: () => void;
  claims: Record<string, any>;
  players: { name: string; markedCount: number; ticketCount: number }[];
  calledCount: number;
  totalPool: number;
  myName?: string;
}

export default function GameOverSummary({
  visible,
  onClose,
  onPlayAgain,
  onGoHome,
  claims,
  players,
  calledCount,
  totalPool,
  myName,
}: GameOverSummaryProps) {
  const { colors } = useTheme();

  if (!visible) return null;

  const myWins = CLAIM_ORDER.filter(t => {
    const w = claims[t];
    return w?.playerName && (w.playerName === myName || w.winners?.some((x: any) => x.name === myName));
  });

  const myPrize = myWins.reduce((sum, t) => {
    const w = claims[t];
    if (w?.winners) {
      const me = w.winners.find((x: any) => x.name === myName);
      return sum + (me?.amount || 0);
    }
    return sum + (w?.prizeAmount || 0);
  }, 0);

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background, zIndex: 100 }]}>
      <ScrollView contentContainerStyle={s.scroll}>
        {/* Header */}
        <View style={[s.header, { backgroundColor: colors.primary }]}>
          <Ionicons name="flag" size={32} color="#fff" />
          <Text style={s.title}>Game Over</Text>
          <Text style={s.statsLine}>{calledCount} numbers called</Text>
        </View>

        <View style={s.body}>
          {/* My result */}
          {myName && (
            <View style={[s.resultCard, { backgroundColor: colors.surface, borderColor: myWins.length > 0 ? colors.success : colors.border }]}>
              <Text style={[s.resultLabel, { color: colors.text }]}>
                {myWins.length > 0 ? 'You won!' : 'Better luck next time!'}
              </Text>
              {myWins.length > 0 && (
                <View style={s.winTags}>
                  {myWins.map(t => (
                    <View key={t} style={[s.winTag, { backgroundColor: colors.success }]}>
                      <Ionicons name="trophy" size={11} color="#fff" />
                      <Text style={s.winTagText}>{CLAIM_LABELS[t]}</Text>
                    </View>
                  ))}
                </View>
              )}
              {totalPool > 0 && myPrize > 0 && (
                <Text style={[s.myPrize, { color: colors.success }]}>+₹{myPrize}</Text>
              )}
            </View>
          )}

          {/* Prizes */}
          <Text style={[s.sectionTitle, { color: colors.textSecondary }]}>PRIZES</Text>
          <View style={[s.card, { backgroundColor: colors.surface }]}>
            {CLAIM_ORDER.map(type => {
              const winner = claims[type];
              const hasWinner = winner?.playerName;
              return (
                <View key={type} style={[s.prizeRow, { borderColor: colors.border }]}>
                  <View>
                    <Text style={[s.prizeName, { color: colors.text }]}>{CLAIM_LABELS[type]}</Text>
                    {winner?.prizeAmount > 0 && <Text style={[s.prizeAmt, { color: colors.accent }]}>₹{winner.prizeAmount}</Text>}
                  </View>
                  {hasWinner ? (
                    <View style={[s.winnerBadge, { backgroundColor: colors.success }]}>
                      <Ionicons name="trophy" size={11} color="#fff" />
                      <Text style={s.winnerName}>{winner.playerName}</Text>
                    </View>
                  ) : (
                    <Text style={{ color: colors.textSecondary, fontStyle: 'italic', fontSize: 13 }}>Unclaimed</Text>
                  )}
                </View>
              );
            })}
          </View>

          {/* Players */}
          <Text style={[s.sectionTitle, { color: colors.textSecondary }]}>PLAYERS</Text>
          <View style={[s.card, { backgroundColor: colors.surface }]}>
            {players.sort((a, b) => b.markedCount - a.markedCount).map((p, i) => (
              <View key={p.name} style={[s.playerRow, { borderColor: colors.border }]}>
                <View style={[s.playerAvatar, { backgroundColor: colors.card }]}>
                  <Text style={[s.playerInitial, { color: colors.text }]}>{p.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.playerName, { color: p.name === myName ? colors.primary : colors.text }]}>
                    {p.name}{p.name === myName ? ' (You)' : ''}
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
                    {p.markedCount}/{p.ticketCount * 15} marked
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* Actions */}
          <View style={s.actions}>
            {onPlayAgain && (
              <TouchableOpacity style={[s.actionBtn, { backgroundColor: colors.success }]} onPress={onPlayAgain}>
                <Ionicons name="refresh" size={18} color="#fff" />
                <Text style={s.actionBtnText}>Play Again</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[s.actionBtn, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]} onPress={onClose}>
              <Ionicons name="ticket-outline" size={18} color={colors.text} />
              <Text style={[s.actionBtnText, { color: colors.text }]}>View Tickets</Text>
            </TouchableOpacity>
            {onGoHome && (
              <TouchableOpacity style={[s.actionBtn, { backgroundColor: colors.primary }]} onPress={onGoHome}>
                <Ionicons name="home" size={18} color="#fff" />
                <Text style={s.actionBtnText}>Home</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  scroll: { paddingBottom: 40 },
  header: { alignItems: 'center', paddingVertical: 32, gap: 6 },
  title: { color: '#fff', fontSize: 30, fontWeight: '900', letterSpacing: 2 },
  statsLine: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
  body: { padding: 16 },
  resultCard: { borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 20, borderWidth: 1.5 },
  resultLabel: { fontSize: 20, fontWeight: '800' },
  winTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12, justifyContent: 'center' },
  winTag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  winTagText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  myPrize: { fontSize: 32, fontWeight: '900', marginTop: 10 },
  sectionTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 8, marginTop: 4 },
  card: { borderRadius: 14, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(128,128,128,0.1)' },
  prizeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 0.5 },
  prizeName: { fontSize: 14, fontWeight: '600' },
  prizeAmt: { fontSize: 12, fontWeight: '700', marginTop: 1 },
  winnerBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  winnerName: { color: '#fff', fontSize: 12, fontWeight: '700' },
  playerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 0.5 },
  playerAvatar: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  playerInitial: { fontSize: 14, fontWeight: '700' },
  playerName: { fontSize: 14, fontWeight: '600' },
  actions: { gap: 10, marginTop: 8 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14 },
  actionBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
