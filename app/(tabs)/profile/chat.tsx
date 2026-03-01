import { useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';

export default function ChatRedirect() {
  const { partnerId } = useLocalSearchParams<{ partnerId: string }>();
  const router = useRouter();

  useEffect(() => {
    if (partnerId) {
      router.replace({ pathname: '/direct-chat', params: { partnerId } } as any);
    } else {
      router.back();
    }
  }, [partnerId, router]);

  return null;
}
