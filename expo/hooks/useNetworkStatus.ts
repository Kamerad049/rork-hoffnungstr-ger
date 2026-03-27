import { useState, useEffect } from 'react';
import { Platform } from 'react-native';

export function useOnlineManager(): boolean {
  const [isOnline, setIsOnline] = useState<boolean>(true);

  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);
      setIsOnline(navigator.onLine);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }

    let mounted = true;

    const checkConnection = async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const resp = await fetch('https://clients3.google.com/generate_204', {
          method: 'HEAD',
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (mounted) setIsOnline(resp.ok || resp.status === 204);
      } catch {
        if (mounted) setIsOnline(false);
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 15000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return isOnline;
}
