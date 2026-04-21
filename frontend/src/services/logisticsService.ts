import { LogisticsProvider, LogisticsTrack } from '../types/logistics';
import request from '../utils/request';

export interface LogisticsCompany {
  code: string;
  name: string;
  kdnCode?: string;
  shortName?: string;
  logoUrl?: string;
  website?: string;
  customerService?: string;
  isDomestic?: boolean;
  isActive?: boolean;
  sortOrder?: number;
  description?: string;
}

export const getLogisticsCompanies = async (params?: { 
  isDomestic?: boolean; 
  keyword?: string;
  activeOnly?: boolean;
}): Promise<LogisticsCompany[]> => {
  try {
    const res: any = await request.get('/logistics-companies', { params });
    return Array.isArray(res) ? res : (res?.data || []);
  } catch (error) {
    console.error('Failed to fetch logistics companies', error);
    return [];
  }
};

export const searchLogisticsCompanies = async (keyword: string): Promise<LogisticsCompany[]> => {
  try {
    const res: any = await request.get('/logistics-companies/search', { params: { keyword } });
    return res || [];
  } catch (error) {
    console.error('Failed to search logistics companies', error);
    return [];
  }
};

export const getLogisticsProviders = async (params?: any, activeOnly: boolean = true): Promise<LogisticsProvider[]> => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const defaultParams = activeOnly ? { status: 'ACTIVE', ...params } : params;
    const res: any = await request.get('/logistics', { params: defaultParams });
    return res.records || [];
  } catch (error) {
    console.error('Failed to fetch logistics providers', error);
    return [];
  }
};

export const getLogisticsProviderById = async (id: string): Promise<LogisticsProvider | undefined> => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const res: any = await request.get(`/logistics/track/${bizNo}`);
        return res.data || [];
    } catch (error) {
        console.error('Failed to fetch tracks', error);
        return [];
    }
};

// --- New Logistics Tracking Integration ---

export interface LogisticsTrace {
  acceptTime: string;
  acceptStation: string;
  remark?: string;
}

export interface LogisticsResponse {
  success: boolean;
  reason?: string;
  state: string; // 0-无轨迹 1-已揽收 2-在途中 3-签收 4-问题件
  eBusinessID?: string;
  logisticCode?: string;
  shipperCode?: string;
  shipperName?: string;
  traces: LogisticsTrace[];
  relatedOrders?: Array<{
      id: number;
      orderNo: string;
      status: string;
      supplierName: string;
      totalAmount: number;
  }>;
}

// Cache configuration
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const logisticsCache = new Map<number, { data: LogisticsResponse; timestamp: number }>();

export async function getLogisticsTrackByOrderId(orderId: number, forceRefresh = false): Promise<LogisticsResponse> {
  const now = Date.now();
  const cached = logisticsCache.get(orderId);

  if (!forceRefresh && cached && (now - cached.timestamp < CACHE_DURATION)) {
    // console.log(`[Logistics Cache] Hit for order ${orderId}`);
    return cached.data;
  }

  // request interceptor unwraps the response if code===200, returning res.data
  try {
      const response = await request.get(`/logistics/track/purchase-order/${orderId}`, { timeout: 30000 }) as unknown as LogisticsResponse;
      
      // Cache the successful response
      if (response.success) {
        logisticsCache.set(orderId, { data: response, timestamp: now });
      }
      return response;
  } catch (error: any) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const err = error as any;
      if (err.response?.data?.errorCode === 'LOGISTICS_TRACK_NON_UNIQUE') {
          // Special handling for duplicate tracking records
          throw {
              code: 500,
              errorCode: 'LOGISTICS_TRACK_NON_UNIQUE',
              message: '物流数据异常：存在重复运单号，请联系管理员处理。'
          };
      }
      throw error;
  }
}

const trackingCache = new Map<string, { data: LogisticsResponse; timestamp: number }>();

/**
 * Fetches logistics tracking information by Courier Tracking Number.
 * 
 * @param trackingNo The courier's tracking number (e.g., SF123456)
 * @param forceRefresh If true, bypasses the local cache
 * @returns LogisticsResponse with trace details
 * @since 2026-02-24
 */
export async function getLogisticsTrackByTrackingNo(trackingNo: string, forceRefresh = false): Promise<LogisticsResponse> {
  const now = Date.now();
  const cached = trackingCache.get(trackingNo);

  if (!forceRefresh && cached && (now - cached.timestamp < CACHE_DURATION)) {
    return cached.data;
  }

  // request interceptor unwraps the response if code===200, returning res.data
  try {
      const response = await request.get(`/logistics/track/courier/${trackingNo}`, { timeout: 30000 }) as unknown as LogisticsResponse;
      
      // Cache the successful response
      if (response.success) {
        trackingCache.set(trackingNo, { data: response, timestamp: now });
      }

      return response;
  } catch (error: any) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const err = error as any;
      if (err.response?.data?.errorCode === 'LOGISTICS_TRACK_NON_UNIQUE') {
          // Special handling for duplicate tracking records
          throw {
              code: 500,
              errorCode: 'LOGISTICS_TRACK_NON_UNIQUE',
              message: '物流数据异常：存在重复运单号，请联系管理员处理。'
          };
      }
      throw error;
  }
}

/**
 * Fetches logistics tracking information by Outbound Order ID.
 * 
 * @param outboundOrderId The outbound order ID
 * @param forceRefresh If true, bypasses the local cache
 * @returns LogisticsResponse with trace details
 */
export async function getLogisticsTrackByOutboundOrderId(outboundOrderId: number, forceRefresh = false): Promise<LogisticsResponse> {
  const now = Date.now();
  const cacheKey = `outbound_${outboundOrderId}`;
  const cached = trackingCache.get(cacheKey);

  if (!forceRefresh && cached && (now - cached.timestamp < CACHE_DURATION)) {
    return cached.data;
  }

  try {
      const response = await request.get(`/logistics/track/outbound-order/${outboundOrderId}`, { 
        timeout: 30000,
        params: forceRefresh ? { forceRefresh: true } : undefined
      }) as unknown as LogisticsResponse;
      
      // Cache the successful response
      if (response.success) {
        trackingCache.set(cacheKey, { data: response, timestamp: now });
      }

      return response;
  } catch (error: any) {
      const err = error as any;
      if (err.response?.data?.errorCode === 'LOGISTICS_TRACK_NON_UNIQUE') {
          throw {
              code: 500,
              errorCode: 'LOGISTICS_TRACK_NON_UNIQUE',
              message: '物流数据异常：存在重复运单号，请联系管理员处理。'
          };
      }
      throw error;
  }
}
