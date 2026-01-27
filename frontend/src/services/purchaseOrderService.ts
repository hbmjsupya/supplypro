// Mock service for Purchase Orders
import { delay } from './warehouseService';

export interface PurchaseOrderItem {
  productId: string;
  skuId: string;
  productName: string;
  specName: string;
  quantity: number;
  unitCost: number;
}

export interface PurchaseOrder {
  id: string;
  poNo: string;
  supplierId: string;
  supplierName: string;
  expectedArrivalDate: string;
  projectId?: string;
  warehouseCode?: string; // Target Warehouse
  warehouseRegion?: string; // Target Warehouse Region (Chinese)
  items: PurchaseOrderItem[];
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'shipped';
  createTime: string;
  totalAmount: number;
  attachments?: string[]; // file names
  // Logistics Info
  logisticsCompany?: string;
  trackingNo?: string;
  logisticsFee?: number;
  shippedTime?: string;
}

export interface LogisticsTrack {
  time: string;
  status: string;
  statusType?: string;
  location: string;
  description: string;
  operator?: string;
}

export const getLogisticsTracks = async (trackingNo: string): Promise<LogisticsTrack[]> => {
    await delay(500);
    return [
        {
            time: '2023-10-27 14:30',
            status: '运输中',
            location: '杭州转运中心',
            description: '快件已到达 杭州转运中心',
            operator: '王五'
        },
        {
            time: '2023-10-27 09:15',
            status: '已发出',
            location: '上海集散中心',
            description: '快件已从 上海集散中心 发出',
            operator: '李四'
        },
        {
            time: '2023-10-26 18:20',
            status: '已揽收',
            location: '上海市',
            description: '顺丰速运 已收取快件',
            operator: '张三'
        }
    ];
};

const STORAGE_KEY = 'sc_purchase_orders';

export const savePurchaseOrder = async (po: PurchaseOrder): Promise<void> => {
  await delay(500);
  const data = localStorage.getItem(STORAGE_KEY);
  const orders: PurchaseOrder[] = data ? JSON.parse(data) : [];
  orders.unshift(po);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
};

export const updatePurchaseOrder = async (po: PurchaseOrder): Promise<void> => {
    await delay(300);
    const data = localStorage.getItem(STORAGE_KEY);
    let orders: PurchaseOrder[] = data ? JSON.parse(data) : [];
    orders = orders.map(o => o.id === po.id ? po : o);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
};

export const shipPurchaseOrder = async (id: string, logisticsInfo: any): Promise<void> => {
    await delay(300);
    const data = localStorage.getItem(STORAGE_KEY);
    const orders: PurchaseOrder[] = data ? JSON.parse(data) : [];
    const order = orders.find(o => o.id === id);
    if (order) {
        order.status = 'shipped';
        order.logisticsCompany = logisticsInfo.shipCompany;
        order.trackingNo = logisticsInfo.shipNo;
        order.logisticsFee = logisticsInfo.freight;
        order.shippedTime = new Date().toISOString();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
    }
};

export const getPurchaseOrders = async (): Promise<PurchaseOrder[]> => {
    await delay(300);
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
}
