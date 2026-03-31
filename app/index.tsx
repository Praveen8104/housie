import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTheme } from '../src/store/ThemeContext';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../src/store/AuthContext';
import { getWalletBalance } from '../src/firebase/walletService';
import { getGameHistory, getActiveSession, clearActiveSession, GameHistoryEntry } from '../src/utils/storage';
import { subscribeToRoom } from '../src/firebase/roomService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function HomeScreen() {
  const [walletBalance, setWalletBalance] = useState(0);
  const [lastGame, setLastGame] = useState<GameHistoryEntry | null>(null);
  const router = useRouter();
  const { mode, colors, toggleTheme } = useTheme();
  const { user } = useAuth();

  useFocusEffect(
    useCallback(() => {
      if (user) {
        getWalletBalance(user.userId).then(setWalletBalance);
        getGameHistory().then(h => setLastGame(h.length > 0 ? h[0] : null));

        // Check for active game session
        getActiveSession().then(session => {
          if (!session) return;
          // Verify room still exists and is playing
          const unsub = subscribeToRoom(session.roomCode, (data) => {
            unsub();
            if (data && data.status === 'playing') {
              const route = session.isHost
                ? `/mp-host?roomCode=${session.roomCode}&playerName=${session.playerName}`
                : `/mp-player?roomCode=${session.roomCode}&playerName=${session.playerName}`;
              router.replace(route as any);
            } else {
              // Room ended or doesn't exist — clear stale session
              clearActiveSession();
            }
          });
        });
      }
    }, [user])
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity style={[styles.profileBtn, { backgroundColor: colors.surface }]} onPress={() => router.push('/profile')}>
            <View style={[styles.profileAvatar, { backgroundColor: colors.primary }]}>
              <Text style={styles.profileInitial}>{user?.name?.charAt(0)?.toUpperCase() || '?'}</Text>
            </View>
            <View>
              <Text style={[styles.greeting, { color: colors.textSecondary }]}>Hello,</Text>
              <Text style={[styles.profileName, { color: colors.text }]}>{user?.name || 'Player'}</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.iconBtn, { backgroundColor: colors.surface }]} onPress={toggleTheme}>
            <Ionicons name={mode === 'dark' ? 'sunny' : 'moon'} size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Wallet card */}
        <TouchableOpacity
          style={[styles.walletCard, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/wallet')}
          activeOpacity={0.85}
        >
          <View>
            <Text style={styles.walletLabel}>{walletBalance >= 0 ? 'Net Earnings' : 'Net Loss'}</Text>
            <Text style={styles.walletBalance}>{walletBalance >= 0 ? '' : '-'}₹{Math.abs(walletBalance)}</Text>
          </View>
          <View style={styles.walletIcon}>
            <Ionicons name="wallet" size={32} color="rgba(255,255,255,0.7)" />
          </View>
        </TouchableOpacity>

        {/* Play section */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>PLAY</Text>
        <View style={styles.actionCards}>
          {/* Multiplayer */}
          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: colors.surface }]}
            onPress={() => router.push('/multiplayer')}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIconCircle, { backgroundColor: `${colors.secondary}20` }]}>
              <Ionicons name="earth-outline" size={26} color={colors.secondary} />
            </View>
            <Text style={[styles.actionTitle, { color: colors.text }]}>Multiplayer</Text>
            <Text style={[styles.actionSub, { color: colors.textSecondary }]}>Own phones</Text>
          </TouchableOpacity>

          {/* Pass & Play */}
          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: colors.surface }]}
            onPress={() => router.push('/local-setup')}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIconCircle, { backgroundColor: `${colors.primary}20` }]}>
              <Ionicons name="people" size={26} color={colors.primary} />
            </View>
            <Text style={[styles.actionTitle, { color: colors.text }]}>Pass & Play</Text>
            <Text style={[styles.actionSub, { color: colors.textSecondary }]}>Same device</Text>
          </TouchableOpacity>
        </View>

        {/* Quick access */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>QUICK ACCESS</Text>
        <View style={styles.quickRow}>
          {[
            { icon: 'time-outline' as const, label: 'History', route: '/history' },
            { icon: 'podium-outline' as const, label: 'Leaderboard', route: '/leaderboard' },
          ].map(item => (
            <TouchableOpacity
              key={item.label}
              style={[styles.quickItem, { backgroundColor: colors.surface }]}
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.7}
            >
              <Ionicons name={item.icon} size={22} color={colors.accent} />
              <Text style={[styles.quickLabel, { color: colors.text }]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Last game */}
        {lastGame && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>LAST GAME</Text>
            {(() => {
              const myWins = Object.entries(lastGame.claims || {}).filter(([, w]) => w.playerName === lastGame.playerName);
              const totalWinnings = myWins.reduce((sum, [, w]) => sum + (w.prize || 0), 0);
              const ticketCost = lastGame.ticketPrice * lastGame.ticketCount;
              const netAmount = totalWinnings - ticketCost;
              const isCancelled = lastGame.status === 'cancelled';
              return (
                <TouchableOpacity
                  style={[styles.lastGameCard, { backgroundColor: colors.surface }]}
                  onPress={() => router.push(`/history-detail?data=${encodeURIComponent(JSON.stringify(lastGame))}`)}
                  activeOpacity={0.7}
                >
                  <View style={styles.lastGameRow}>
                    <View>
                      <Text style={[styles.lastGameRoom, { color: colors.text }]}>{lastGame.roomCode}</Text>
                      <Text style={[styles.lastGameDate, { color: colors.textSecondary }]}>
                        {new Date(lastGame.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      {isCancelled ? (
                        <Text style={[styles.lastGameNet, { color: colors.primary }]}>Cancelled</Text>
                      ) : netAmount > 0 ? (
                        <Text style={[styles.lastGameNet, { color: colors.success }]}>+₹{netAmount}</Text>
                      ) : ticketCost > 0 ? (
                        <Text style={[styles.lastGameNet, { color: colors.textSecondary }]}>₹{lastGame.totalPrizePool}</Text>
                      ) : null}
                      <Text style={[styles.lastGameSub, { color: colors.textSecondary }]}>{lastGame.players.length} players</Text>
                    </View>
                  </View>
                  {myWins.length > 0 && (
                    <View style={styles.lastGameWinTags}>
                      {myWins.map(([type]) => (
                        <Text key={type} style={[styles.lastGameWinTag, { backgroundColor: `${colors.success}15`, color: colors.success }]}>
                          {type === 'fullHouse' ? 'Full House' : type === 'jaldiFive' ? 'Jaldi 5' : type === 'topLine' ? 'Top' : type === 'middleLine' ? 'Middle' : 'Bottom'}
                        </Text>
                      ))}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })()}
          </>
        )}

        {/* App info */}
        <View style={styles.appInfo}>
          <Text style={[styles.appInfoText, { color: colors.textSecondary }]}>
            Made with <Text style={{ color: colors.primary }}>❤️</Text> by Praveen
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  // Top bar
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  profileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    paddingRight: 16,
    borderRadius: 24,
  },
  profileAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitial: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  greeting: {
    fontSize: 11,
    fontWeight: '500',
  },
  profileName: {
    fontSize: 15,
    fontWeight: '700',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Wallet
  walletCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 20,
    padding: 22,
    marginBottom: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  walletLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '600',
  },
  walletBalance: {
    color: '#fff',
    fontSize: 34,
    fontWeight: '900',
    marginTop: 4,
  },
  walletIcon: {
    opacity: 0.8,
  },
  // Section
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  // Action cards
  actionCards: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  actionCard: {
    flex: 1,
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  actionIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  actionSub: {
    fontSize: 12,
  },
  // Quick access
  quickRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  quickItem: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  quickLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  // Last game
  lastGameCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  lastGameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastGameRoom: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 2,
  },
  lastGameDate: {
    fontSize: 12,
    marginTop: 3,
  },
  lastGameNet: {
    fontSize: 18,
    fontWeight: '800',
  },
  lastGameSub: {
    fontSize: 12,
    marginTop: 2,
  },
  lastGameWinTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  lastGameWinTag: {
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
  },
  // App info
  appInfo: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  appInfoText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
