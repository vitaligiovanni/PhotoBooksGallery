import { useQuery } from "@tanstack/react-query";
import type { Setting } from "@shared/schema";

export function useSettings() {
  const { data: settings = [] } = useQuery<Setting[]>({ 
    queryKey: ["/api/settings"] 
  });

  const getSetting = (key: string, defaultValue?: string): string => {
    const setting = settings.find(s => s.key === key);
    return setting?.value || defaultValue || '';
  };

  const getFreeShippingThreshold = (): number => {
    return parseInt(getSetting('free_shipping_threshold', '3000'));
  };

  return {
    settings,
    getSetting,
    getFreeShippingThreshold,
  };
}