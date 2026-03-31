import React from 'react';
import { ActivityIndicator, BackHandler, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Updates from 'expo-updates';
import { GameProvider } from '../src/store/GameContext';
import { ThemeProvider, useTheme } from '../src/store/ThemeContext';
import { AuthProvider, useAuth } from '../src/store/AuthContext';

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
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  React.useEffect(() => {
    if (isLoading) return;
    const onLoginPage = segments[0] === 'login';

    if (!isAuthenticated && !onLoginPage) {
      router.replace('/login');
    } else if (isAuthenticated && onLoginPage) {
      router.replace('/');
    }
  }, [isAuthenticated, isLoading, segments]);

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
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: colors.background },
          // 1. Change to 'slide_from_right' (much smoother cross-platform) or 'default'
          animation: 'slide_from_right', 
          // 2. REMOVED animationDuration to let the native driver handle frame timing smoothly
        }}
      >
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="local-setup" options={{ title: 'Local Game' }} />
        <Stack.Screen name="host" options={{ title: 'Game Board' }} />
        <Stack.Screen name="player" options={{ title: 'My Ticket' }} />
        
        {/* 3. Changed modal animations to 'slide_from_bottom'. It pairs natively with 'modal' presentation without glitching. */}
        <Stack.Screen name="scoreboard" options={{ title: 'Scoreboard', presentation: 'modal', animation: 'slide_from_bottom' }} />
        
        <Stack.Screen name="multiplayer" options={{ title: 'Multiplayer' }} />
        <Stack.Screen name="lobby" options={{ title: 'Lobby', headerBackVisible: false }} />
        <Stack.Screen name="mp-host" options={{ title: 'Host Board', headerBackVisible: false }} />
        <Stack.Screen name="mp-player" options={{ title: 'My Ticket' }} />
        
        <Stack.Screen name="history" options={{ title: 'Game History', presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="history-detail" options={{ title: 'Game Details' }} />
        <Stack.Screen name="leaderboard" options={{ title: 'Leaderboard', presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="wallet" options={{ title: 'Wallet', presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="profile" options={{ title: 'Profile', presentation: 'modal', animation: 'slide_from_bottom' }} />
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
