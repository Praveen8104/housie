import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GameProvider } from '../src/store/GameContext';
import { ThemeProvider, useTheme } from '../src/store/ThemeContext';
import { AuthProvider, useAuth } from '../src/store/AuthContext';

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
            <AuthGate>
              <AppStack />
            </AuthGate>
          </GameProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
