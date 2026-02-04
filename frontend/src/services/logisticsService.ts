import { LogisticsProvider, LogisticsTrack } from '../types/logistics';
import request from '../utils/request';

export const getLogisticsProviders = async (params?: any): Promise<LogisticsProvider[]> => {
  try {
    const res: any = await request.get('/logistics', { params });
    return res.records || [];
  } catch (error) {
    console.error('Failed to fetch logistics providers', error);
    return [];
  }
};

export const getLogisticsProviderById = async (id: string): Promise<LogisticsProvider | undefined> => {
  try {
    const res: any = await request.get(`/logistics/${id}`);
    return res;
  } catch (error) {
    console.error('Failed to fetch logistics provider', error);
    return undefined;
  }
};

export const saveLogisticsProvider = async (provider: LogisticsProvider): Promise<void> => {
  if (provider.id) {
    await request.put(`/logistics/${provider.id}`, provider);
  } else {
    await request.post('/logistics', provider);
  }
};

export const deleteLogisticsProvider = async (id: string): Promise<void> => {
  await request.delete(`/logistics/${id}`);
};

export const toggleLogisticsProviderStatus = async (id: string, status: 'enabled' | 'disabled'): Promise<void> => {
  // Map frontend status to backend status
  // enabled -> ACTIVE, disabled -> INACTIVE
  // But wait, the list page passes 'enabled'/'disabled'.
  // Backend expects 'ACTIVE'/'INACTIVE' usually.
  // Let's fetch current provider to preserve other fields
  const provider = await getLogisticsProviderById(id);
  if (provider) {
      const backendStatus = status === 'enabled' ? 'ACTIVE' : 'INACTIVE';
      await request.put(`/logistics/${id}`, { 
          ...provider, 
          status: backendStatus 
      });
  }
};

export const getLogisticsTracks = async (bizNo: string): Promise<LogisticsTrack[]> => {
    try {
        const res: any = await request.get(`/logistics/track/${bizNo}`);
        return res.data || [];
    } catch (error) {
        console.error('Failed to fetch tracks', error);
        return [];
    }
};
