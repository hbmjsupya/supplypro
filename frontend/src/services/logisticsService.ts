import { LogisticsProvider, LogisticsTrack } from '../types/logistics';
import { delay } from './warehouseService';
import request from '../utils/request';

const STORAGE_KEY = 'sc_logistics_providers';

const initializeMockData = () => {
  if (!localStorage.getItem(STORAGE_KEY)) {
    const providers: LogisticsProvider[] = [
      {
        id: 'LP001',
        name: '顺丰速运',
        contactName: '王卫',
        contactPhone: '13800138000',
        status: 'enabled',
        settlementType: 'Period',
        createTime: '2023-01-01T00:00:00Z',
        accounts: [
          {
            key: 1,
            type: 'Company',
            name: '顺丰速运有限公司',
            bank: '招商银行',
            account: '6222021234567890',
            isDefault: true,
            status: true
          }
        ]
      },
      {
        id: 'LP002',
        name: '圆通速递',
        contactName: '喻渭蛟',
        contactPhone: '13900139000',
        status: 'enabled',
        settlementType: 'Cash',
        createTime: '2023-01-02T00:00:00Z',
        accounts: [
          {
            key: 1,
            type: 'Company',
            name: '圆通速递有限公司',
            bank: '中国工商银行',
            account: '6222020987654321',
            isDefault: true,
            status: true
          }
        ]
      }
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(providers));
  }
};

initializeMockData();

export const getLogisticsProviders = async (): Promise<LogisticsProvider[]> => {
  await delay(300);
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

export const getLogisticsProviderById = async (id: string): Promise<LogisticsProvider | undefined> => {
  await delay(300);
  const providers = await getLogisticsProviders();
  return providers.find(p => p.id === id);
};

export const saveLogisticsProvider = async (provider: LogisticsProvider): Promise<void> => {
  await delay(500);
  const providers = await getLogisticsProviders();
  const index = providers.findIndex(p => p.id === provider.id);
  if (index > -1) {
    providers[index] = provider;
  } else {
    providers.unshift(provider);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(providers));
};

export const deleteLogisticsProvider = async (id: string): Promise<void> => {
  await delay(300);
  const providers = await getLogisticsProviders();
  const filtered = providers.filter(p => p.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
};

export const toggleLogisticsProviderStatus = async (id: string, status: 'enabled' | 'disabled'): Promise<void> => {
    await delay(300);
    const providers = await getLogisticsProviders();
    const provider = providers.find(p => p.id === id);
    if (provider) {
        provider.status = status;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(providers));
    }
};

export const getLogisticsTracks = async (bizNo: string): Promise<LogisticsTrack[]> => {
    try {
        const res = await request.get(`/logistics/track/${bizNo}`);
        return res.data || [];
    } catch (error) {
        console.error('Failed to fetch tracks', error);
        return [];
    }
};
