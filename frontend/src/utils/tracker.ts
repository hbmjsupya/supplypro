
interface TrackEventParams {
  category: string;
  action: string;
  label?: string;
  value?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export const trackEvent = (params: TrackEventParams) => {
  // In a real app, this would send data to GA/SensorsData/etc.
  // Here we log to console and potentially a mock backend endpoint
  console.log('[Tracker]', {
    timestamp: new Date().toISOString(),
    ...params
  });

  // Mock backend reporting - in a real scenario, this would POST to /api/logs/operation
  // if (process.env.NODE_ENV === 'production') {
  //   try {
  //     fetch('/api/logs/operation', {
  //       method: 'POST',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify({ ...params, timestamp: new Date().toISOString() })
  //     });
  //   } catch (e) {
  //     // silent fail
  //   }
  // }
};
