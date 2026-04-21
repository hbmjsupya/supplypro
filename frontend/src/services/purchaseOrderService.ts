import request from '../utils/request';

export interface PurchaseOrderItem {
  id?: number;
  productId: number;
  productName: string;
  skuCode?: string;
  spec?: string;
  specName?: string;
  quantity: number;
  unitPrice: number;
  totalPrice?: number;
  productImage?: string;
  defaultSupplierId?: number;
  defaultSupplierName?: string;
}

export interface PurchaseOrder {
  id?: number;
  orderNo?: string;
  supplierId?: number; // Keep for backward compatibility if needed, but prefer supplier object
  supplier?: { id: number; name?: string };
  supplierName?: string; // For display
  type: 'STANDARD' | 'DROPSHIP' | 'JIT' | 'INBOUND';
  totalAmount: number;
  status: 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'RECEIVED' | 'COMPLETED' | 'CANCELLED' | 'PENDING_SETTLEMENT';
  shippingStatus?: 'PENDING' | 'TO_SHIP' | 'SHIPPED' | 'RECEIVED';
  settlementStatus?: 'UNSETTLED' | 'PARTIALLY_SETTLED' | 'SETTLED';
  deliveryDate?: string;
  warehouseId?: number;
  warehouseName?: string; // For display
  bizType?: string;
  bizNo?: string;
  remark?: string;
  items: PurchaseOrderItem[];
  
  // New fields
  contactName?: string;
  contactPhone?: string;
  province?: string;
  city?: string;
  district?: string;
  detailAddress?: string;
  isManualAddress?: boolean;
  attachments?: string; // JSON string of file URLs
  platformOrderNo?: string;
  thirdPartyPlatform?: string;
  thirdPartyNo?: string;
  inboundOrderNo?: string; // Transient field from backend
  stockInNo?: string; // Transient field from backend
  inboundOrderId?: number; // Transient field from backend
  
  // Shipment Info
  logisticsCompany?: string;
  trackingNumber?: string;
  shippedAt?: string;
  logisticsFee?: number;
  expectedArrival?: string; // 预计到货日期
  
  // Self Delivery Info / Legacy
  deliverer?: string;
  delivererPhone?: string;
  freightCompany?: string;
    shipNo?: string;
    adjustStatus?: string;

    // Settlement Info
  payableAmount?: number;
  settledAmount?: number;

  createdAt?: string;
  createdBy?: string;
}

export interface PurchaseOrderSearchCriteria {
  keyword?: string;
  poNos?: string[];
  supplierName?: string;
  project?: string;
  status?: string;
  settlementStatus?: string;
  bizType?: string;
  product?: string;
  platformOrderNo?: string;
  bizNo?: string;
  costType?: string;
  platformName?: string;
  thirdPartyNo?: string;
}

export interface PageResult<T> {
  records?: T[]; // MyBatis-Plus
  content?: T[]; // Spring Data JPA
  total?: number; // MyBatis-Plus
  totalElements?: number; // Spring Data JPA
  pageNum?: number;
  pageSize?: number;
  pages?: number;
}

export const getPurchaseOrders = (params: { page?: number; size?: number } & PurchaseOrderSearchCriteria) => {
  // Frontend already sends 0-based page, no conversion needed
  // Increase timeout to 60s for list loading to handle potential cold start or large data processing
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return request.get<any, PageResult<PurchaseOrder>>('/purchase-orders', { params, timeout: 60000 });
};

export const searchOrderNos = (keyword: string) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return request.get<any, any>('/purchase-orders/search-order-nos', { params: { keyword } });
};

export const batchAdjustCost = (adjustments: { poNo: string, newCost: number }[]) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return request.post<any, any>('/purchase-orders/batch-adjust-cost', adjustments);
};

export const syncLogisticsStatus = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return request.post<any, any>('/purchase-orders/sync-logistics-status', {}, { timeout: 120000 });
};

export const getPurchaseOrderById = (id: number) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return request.get<any, PurchaseOrder>(`/purchase-orders/${id}`);
};

export const createPurchaseOrder = (data: Partial<PurchaseOrder>) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return request.post<any, PurchaseOrder>('/purchase-orders', data);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const confirmPlatformOrder = (data: any) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return request.post<any, any>('/purchase-orders/from-platform-confirm', data);
};

export const updatePurchaseOrder = (id: number, data: Partial<PurchaseOrder>) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return request.put<any, PurchaseOrder>(`/purchase-orders/${id}`, data);
};

export const cancelPurchaseOrder = (id: number) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return request.put<any, any>(`/purchase-orders/${id}/cancel`);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const shipPurchaseOrder = (id: number, data: any) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return request.put<any, any>(`/purchase-orders/${id}/ship`, data);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const updateLogistics = (id: number, data: any) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return request.put<any, any>(`/purchase-orders/${id}/logistics`, data);
};

export const deletePurchaseOrder = (id: number) => {
  return request.delete(`/purchase-orders/${id}`);
};

export const generateInboundPurchaseOrder = (data: Partial<PurchaseOrder>) => {
  // Client-side validation
  if (!data.items || data.items.length === 0) {
    throw new Error('请先选择商品');
  }
  if (data.items && data.items.length > 0) {
    data.items.forEach((item, index) => {
      if (!item.productId || item.productId <= 0) {
         throw new Error(`第 ${index + 1} 行商品数据异常(ID无效)，请求被拦截`);
      }
    });
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return request.post<any, PurchaseOrder>('/inboundPurchaseOrder/generate', data);
};

export const receivePurchaseOrder = (id: number) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return request.post<any, any>(`/purchase-orders/${id}/receive`);
};

export const checkWaybill = (waybillNo: string, deliveryType: string, excludePurchaseNo?: string) => {
  return request.get<any, { 
    hasDuplicate: boolean; 
    duplicatePurchaseNo?: string; 
    duplicateAmount?: number;
    deliverer?: string;
    contact?: string;
    plateNo?: string;
    logisticsProviderId?: number | string;
    logisticsCompany?: string;
  }>('/purchase-orders/delivery/checkWaybill', {
    params: {
      waybillNo,
      deliveryType,
      excludePurchaseNo
    }
  });
};

export const getLogisticsDetail = (trackingNumber: string) => {
  return request.get<any, any>(`/purchase-orders/logistics-detail/${trackingNumber}`);
};

export const getStatusSummary = (params?: Record<string, any>) => {
  return request.get<any, { 
    code: number; 
    total: number; 
    statusList: Array<{
      status: string;
      label: string;
      count: number;
      color: string;
    }>;
  }>('/purchase-orders/status-summary', { params });
};
