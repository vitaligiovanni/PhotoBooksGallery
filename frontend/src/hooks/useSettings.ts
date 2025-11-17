import { useQuery } from "@tanstack/react-query";

export function useSettings() {
  const { data: settings = {} } = useQuery<Record<string, any>>({ 
    queryKey: ["/api/settings"] 
  });

  const getSetting = (key: string, defaultValue?: string): string => {
    return settings[key] || defaultValue || '';
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