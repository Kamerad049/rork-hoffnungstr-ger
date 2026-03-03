import { useState, useCallback } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import type { AlertConfig, AlertButton } from '@/components/CustomAlert';

export const [AlertProvider, useAlert] = createContextHook(() => {
  const [visible, setVisible] = useState<boolean>(false);
  const [config, setConfig] = useState<AlertConfig | null>(null);

  const showAlert = useCallback((
    title: string,
    message?: string,
    buttons?: AlertButton[],
    type?: AlertConfig['type'],
  ) => {
    setConfig({ title, message, buttons, type });
    setVisible(true);
  }, []);

  const dismissAlert = useCallback(() => {
    setVisible(false);
    setTimeout(() => setConfig(null), 200);
  }, []);

  return { visible, config, showAlert, dismissAlert };
});
