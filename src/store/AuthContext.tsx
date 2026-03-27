import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  UserProfile,
  getStoredUser,
  registerUser,
  loginUser,
  logoutUser,
  updateUserName,
  updateUserUpiId,
  updateUserPin,
  activatePremium,
} from '../firebase/authService';

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  register: (phone: string, name: string, pin: string) => Promise<void>;
  login: (phone: string, pin: string) => Promise<void>;
  logout: () => Promise<void>;
  updateName: (name: string) => Promise<void>;
  updateUpi: (upiId: string) => Promise<void>;
  changePin: (oldPin: string, newPin: string) => Promise<void>;
  unlockPremium: (code: string) => Promise<boolean>;
  isPremium: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  register: async () => {},
  login: async () => {},
  logout: async () => {},
  updateName: async () => {},
  updateUpi: async () => {},
  changePin: async () => {},
  unlockPremium: async () => false,
  isPremium: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getStoredUser().then(stored => {
      setUser(stored);
      setIsLoading(false);
    });
  }, []);

  const register = async (phone: string, name: string, pin: string) => {
    const profile = await registerUser(phone, name, pin);
    setUser(profile);
  };

  const login = async (phone: string, pin: string) => {
    const profile = await loginUser(phone, pin);
    setUser(profile);
  };

  const logout = async () => {
    await logoutUser();
    setUser(null);
  };

  const updateName = async (name: string) => {
    if (!user) return;
    await updateUserName(user.userId, name);
    setUser(prev => prev ? { ...prev, name } : null);
  };

  const updateUpi = async (upiId: string) => {
    if (!user) return;
    await updateUserUpiId(user.userId, upiId);
    setUser(prev => prev ? { ...prev, upiId } : null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        register,
        login,
        logout,
        updateName,
        updateUpi,
        changePin: async (oldPin: string, newPin: string) => {
          if (!user) return;
          await updateUserPin(user.userId, oldPin, newPin);
        },
        unlockPremium: async (code: string) => {
          if (!user) return false;
          const success = await activatePremium(user.userId, code);
          if (success) setUser(prev => prev ? { ...prev, isPremium: true } : null);
          return success;
        },
        isPremium: !!user?.isPremium,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
