import request from '../utils/request';

export interface PurchaseOrderItem {
  id?: number;
  productId: number;
  productName: string;
  skuCode?: string;
  spec?: string;
  quantity: number;
  unitPrice: number;
  totalPrice?: number;
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
  settlementStatus?: 'UNSETTLED' | 'PARTIALLY_SETTLED' | 'SETTLED';
  deliveryDate?: string;
  warehouseId?: number;
  warehouseName?: string; // For display
  bizType?: string;
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
  
  // Shipment Info
  logisticsCompany?: string;
  trackingNumber?: string;
  shippedAt?: string;

  createdAt?: string;
  createdBy?: string;
}

export interface PurchaseOrderSearchCriteria {
  keyword?: string;
  supplierName?: string;
  project?: string; // Maybe not needed if removed from backend? Keep for safety
  status?: string;
  settlementStatus?: string;
  bizType?: string;
}

export interface PageResult<T> {
  records: T[]; // Backend returns 'records' in the map
  total: number;
  pageNum: number;
  pageSize: number;
  pages: number;
}

export const getPurchaseOrders = (params: { page?: number; size?: number } & PurchaseOrderSearchCriteria) => {
  return request.get<any, PageResult<PurchaseOrder>>('/purchase-orders', { params });
};

export const getPurchaseOrderById = (id: number) => {
  return request.get<any, PurchaseOrder>(`/purchase-orders/${id}`);
};

export const createPurchaseOrder = (data: Partial<PurchaseOrder>) => {
  return request.post<any, PurchaseOrder>('/purchase-orders', data);
};

export const updatePurchaseOrder = (id: number, data: Partial<PurchaseOrder>) => {
  return request.put<any, PurchaseOrder>(`/purchase-orders/${id}`, data);
};

export const cancelPurchaseOrder = (id: number) => {
  return request.put<any, any>(`/purchase-orders/${id}/cancel`);
};

export const shipPurchaseOrder = (id: number, data: any) => {
  return request.put<any, any>(`/purchase-orders/${id}/ship`, data);
};

export const deletePurchaseOrder = (id: number) => {
  return request.delete(`/purchase-orders/${id}`);
};

export const generateInboundPurchaseOrder = (data: Partial<PurchaseOrder>) => {
  return request.post<any, PurchaseOrder>('/inboundPurchaseOrder/generate', data);
};
