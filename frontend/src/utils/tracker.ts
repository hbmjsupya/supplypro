
interface TrackEventParams {
  category: string;
  action: string;
  label?: string;
  value?: number;
  [key: string]: any;
}

export const trackEvent = (params: TrackEventParams) => {
  const { category, action, label, value, ...others } = params;
  
  // In a real app, this would send data to GA/SensorsData/etc.
  // Here we log to console and potentially a mock backend endpoint
  console.log('[Tracker]', {
    timestamp: new Date().toISOString(),
    ...params
  });

  // Mock backend reporting
  // fetch('/api/report/event', { method: 'POST', body: JSON.stringify(params) });
};
