import { useState, useCallback, useRef } from 'react';

export interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

export interface AlertState {
  visible: boolean;
  title: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  buttons?: AlertButton[];
}

const INITIAL: AlertState = { visible: false, title: '', message: '', type: 'info' };

export function useGameAlert() {
  const [alertState, setAlertState] = useState<AlertState>(INITIAL);
  const queueRef = useRef<AlertState[]>([]);

  const showNext = useCallback(() => {
    if (queueRef.current.length > 0) {
      const next = queueRef.current.shift()!;
      setAlertState(next);
    }
  }, []);

  const showAlert = useCallback((
    title: string,
    message: string,
    type: 'success' | 'error' | 'info' | 'warning' = 'info',
    buttons?: AlertButton[],
  ) => {
    const newAlert: AlertState = { visible: true, title, message, type, buttons };
    setAlertState(prev => {
      if (prev.visible) {
        // Queue it if one is already showing
        queueRef.current.push(newAlert);
        return prev;
      }
      return newAlert;
    });
  }, []);

  const hideAlert = useCallback(() => {
    setAlertState(prev => ({ ...prev, visible: false }));
    // Show next queued alert after a short delay
    setTimeout(() => {
      showNext();
    }, 300);
  }, [showNext]);

  return { alertState, showAlert, hideAlert };
}
