// hooks/usePremium.ts
// Hook to check and manage premium subscription status

import { useCallback, useEffect, useState } from 'react';
import { checkPremiumStatus, getCustomerInfo } from '../services/subscriptions';

interface PremiumState {
  isPremium: boolean;
  isLoading: boolean;
  expirationDate: string | null;
  refresh: () => Promise<void>;
}

export function usePremium(): PremiumState {
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [expirationDate, setExpirationDate] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const premium = await checkPremiumStatus();
      setIsPremium(premium);

      if (premium) {
        const customerInfo = await getCustomerInfo();
        if (customerInfo?.entitlements.active['premium']) {
          const expDate = customerInfo.entitlements.active['premium'].expirationDate;
          setExpirationDate(expDate || null);
        }
      }
    } catch (error) {
      console.error('Error checking premium status:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    isPremium,
    isLoading,
    expirationDate,
    refresh,
  };
}
