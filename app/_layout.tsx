import React from 'react';
import { ActivityIndicator, BackHandler, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as Linking from 'expo-linking';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Updates from 'expo-updates';
import { GameProvider } from '../src/store/GameContext';
import { ThemeProvider, useTheme } from '../src/store/ThemeContext';
import { AuthProvider, useAuth } from '../src/store/AuthContext';
import { joinRoom } from '../src/firebase/roomService';

type UpdateGatePhase =
  | 'checking'
  | 'downloading'
  | 'reloading'
  | 'failed'
  | 'ready';

function ForceUpdateGate({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  const { isDownloading, downloadProgress } = Updates.useUpdates();
  const [phase, setPhase] = React.useState<UpdateGatePhase>('checking');
  const [message, setMessage] = React.useState('Checking for updates...');
  const [errorMessage, setErrorMessage] = React.useState('');

  const closeApp = React.useCallback(() => {
    if (Platform.OS === 'android') {
      BackHandler.exitApp();
      return;
    }
    setMessage('Please close the app and update to continue.');
  }, []);

  const downloadAndApplyUpdate = React.useCallback(async () => {
    try {
      setPhase('downloading');
      setMessage('Downloading required update...');

      const result = await Updates.fetchUpdateAsync();
      if (!result.isNew && !result.isRollBackToEmbedded) {
        throw new Error('Update download did not complete.');
      }

      setPhase('reloading');
      setMessage('Installing update...');
      await Updates.reloadAsync();
    } catch (error) {
      const nextError = error instanceof Error ? error.message : 'Unable to update right now.';
      setErrorMessage(nextError);
      setPhase('failed');
      setMessage('Update failed. You must update to continue.');
    }
  }, []);

  React.useEffect(() => {
    let isMounted = true;

    const checkAndEnforceUpdate = async () => {
      if (__DEV__ || !Updates.isEnabled) {
        if (isMounted) {
          setPhase('ready');
        }
        return;
      }

      try {
        setPhase('checking');
        setMessage('Checking for updates...');
        const result = await Updates.checkForUpdateAsync();

        if (!isMounted) return;

        if (result.isAvailable) {
          setMessage('A required update is available.');
          await downloadAndApplyUpdate();
          return;
        }

        setPhase('ready');
      } catch (error) {
        if (!isMounted) return;
        const nextError = error instanceof Error ? error.message : 'Could not check for updates.';
        setErrorMessage(nextError);
        setPhase('failed');
        setMessage('Unable to verify updates. Please update to continue.');
      }
    };

    checkAndEnforceUpdate();

    return () => {
      isMounted = false;
    };
  }, [downloadAndApplyUpdate]);

  if (phase === 'ready') {
    return <>{children}</>;
  }

  const progress = typeof downloadProgress === 'number' ? Math.round(downloadProgress * 100) : 0;
  const showProgress = phase === 'downloading' || isDownloading;

  return (
    <View style={[styles.updateOverlay, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={[styles.updateTitle, { color: colors.text }]}>Update Required</Text>
      <Text style={[styles.updateMessage, { color: colors.text }]}>{message}</Text>

      {showProgress ? (
        <>
          <View style={[styles.progressTrack, { borderColor: colors.border }]}>
            <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: colors.primary }]} />
          </View>
          <Text style={[styles.progressText, { color: colors.text }]}>{progress}%</Text>
        </>
      ) : null}

      {errorMessage ? (
        <Text style={[styles.errorText, { color: colors.warning }]}>{errorMessage}</Text>
      ) : null}

      {phase === 'failed' ? (
        <Pressable style={[styles.singleAction, { backgroundColor: colors.primary }]} onPress={closeApp}>
          <Text style={styles.actionText}>Close App</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const lastInviteRouteRef = React.useRef<string | null>(null);

  const getInvitePayloadFromUrl = React.useCallback((url: string) => {
    try {
      const parsed = Linking.parse(url);
      const qp = (parsed.queryParams || {}) as Record<string, unknown>;
      const roomFromQuery = String(qp.room || qp.code || '').trim().toUpperCase();
      const autoRawQuery = String(qp.autoJoin || qp.autojoin || qp.auto_join || '').trim().toLowerCase();
      const autoJoinFromQuery = autoRawQuery ? (autoRawQuery === '1' || autoRawQuery === 'true' || autoRawQuery === 'yes') : true;
      const path = (parsed.path || '').replace(/^\/+/, '').toLowerCase();

      if (roomFromQuery && (path === 'multiplayer' || path.endsWith('/multiplayer') || path === '')) {
        return {
          roomCode: roomFromQuery,
          autoJoin: autoJoinFromQuery,
          route: `/multiplayer?room=${encodeURIComponent(roomFromQuery)}&autoJoin=${autoJoinFromQuery ? '1' : '0'}`,
        };
      }

      const nativeUrl = new URL(url);
      const roomFromSearch = (nativeUrl.searchParams.get('room') || nativeUrl.searchParams.get('code') || '').trim().toUpperCase();
      const autoRawSearch = (
        nativeUrl.searchParams.get('autoJoin') ||
        nativeUrl.searchParams.get('autojoin') ||
        nativeUrl.searchParams.get('auto_join') ||
        ''
      ).trim().toLowerCase();
      const autoJoinFromSearch = autoRawSearch ? (autoRawSearch === '1' || autoRawSearch === 'true' || autoRawSearch === 'yes') : true;
      const normalizedPath = nativeUrl.pathname.replace(/^\/+/, '').toLowerCase();

      if (roomFromSearch && (normalizedPath === 'multiplayer' || normalizedPath.endsWith('/multiplayer'))) {
        return {
          roomCode: roomFromSearch,
          autoJoin: autoJoinFromSearch,
          route: `/multiplayer?room=${encodeURIComponent(roomFromSearch)}&autoJoin=${autoJoinFromSearch ? '1' : '0'}`,
        };
      }
    } catch {}

    return null;
  }, []);

  React.useEffect(() => {
    if (isLoading) return;
    const onLoginPage = segments[0] === 'login';

    if (!isAuthenticated && !onLoginPage) {
      router.replace('/login');
    } else if (isAuthenticated && onLoginPage) {
      router.replace('/');
    }
  }, [isAuthenticated, isLoading, segments]);

  React.useEffect(() => {
    if (isLoading || !isAuthenticated) return;

    const maybeRouteFromUrl = async (url: string) => {
      const invitePayload = getInvitePayloadFromUrl(url);
      if (!invitePayload || lastInviteRouteRef.current === invitePayload.route) return;
      lastInviteRouteRef.current = invitePayload.route;

      if (invitePayload.autoJoin && user?.name) {
        try {
          await joinRoom(invitePayload.roomCode, user.name, 1);
          router.replace(
            `/lobby?roomCode=${encodeURIComponent(invitePayload.roomCode)}&playerName=${encodeURIComponent(user.name)}&isHost=false`
          );
          return;
        } catch {}
      }

      router.replace(invitePayload.route);
    };

    Linking.getInitialURL().then((url) => {
      if (url) void maybeRouteFromUrl(url);
    });

    const sub = Linking.addEventListener('url', ({ url }) => {
      void maybeRouteFromUrl(url);
    });

    return () => sub.remove();
  }, [isLoading, isAuthenticated, getInvitePayloadFromUrl, router, user]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <>{children}</>;
}

function AppStack() {
  const { mode, colors } = useTheme();
  return (
    <>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} translucent={false} backgroundColor={colors.background} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'slide_from_right', 
        }}
      >
        <Stack.Screen name="login" />
        <Stack.Screen name="index" />
        <Stack.Screen name="local-setup" />
        <Stack.Screen name="host" />
        <Stack.Screen name="player" />
        <Stack.Screen name="scoreboard" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="multiplayer" />
        <Stack.Screen name="lobby" />
        <Stack.Screen name="mp-host" />
        <Stack.Screen name="mp-player" />
        <Stack.Screen name="history" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="history-detail" />
        <Stack.Screen name="leaderboard" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="wallet" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="profile" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <GameProvider>
            <ForceUpdateGate>
              <AuthGate>
                <AppStack />
              </AuthGate>
            </ForceUpdateGate>
          </GameProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  updateOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  updateTitle: {
    marginTop: 16,
    fontSize: 24,
    fontWeight: '700',
  },
  updateMessage: {
    marginTop: 8,
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
  },
  progressTrack: {
    marginTop: 16,
    width: '90%',
    height: 10,
    borderWidth: 1,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  progressText: {
    marginTop: 8,
    fontWeight: '600',
  },
  errorText: {
    marginTop: 12,
    textAlign: 'center',
    fontSize: 13,
  },
  singleAction: {
    marginTop: 20,
    width: '100%',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionText: {
    color: '#fff',
    fontWeight: '700',
  },
});
