import request from '../utils/request';

const API_BASE = '/cost-adjustments';

export interface CostAdjustmentItem {
  id: number;
  sheetId: number;
  purchaseOrderId: number;
  poNo: string;
  productId?: number;
  productName?: string;
  skuCode?: string;
  specName?: string;
  quantity?: number;
  oldCost?: number;
  newCost?: number;
  unitDiff?: number;
  totalDiff?: number;
  createdBy?: string;
  createdAt?: string;
}

export interface CostAdjustmentSheet {
  id: number;
  sheetNo: string;
  supplierId?: number;
  supplierName?: string;
  itemCount?: number;
  totalQuantity?: number;
  totalOldCost?: number;
  totalNewCost?: number;
  totalDiff?: number;
  reason?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REVOKED';
  approvedBy?: string;
  approvedAt?: string;
  rejectReason?: string;
  createdBy?: string;
  createdAt?: string;
  items?: CostAdjustmentItem[];
}

export interface BatchAdjustResult {
  success: number;
  fail: number;
  errors: Array<{
    poNo: string;
    supplierName?: string;
    msg: string;
  }>;
}

export const createSingleAdjustment = async (purchaseOrderId: number, newCost: number, reason?: string): Promise<CostAdjustmentSheet> => {
  return request.post(API_BASE + '/single', {
    purchaseOrderId,
    newCost,
    reason
  });
};

export const batchAdjust = async (adjustments: Array<Record<string, unknown>>): Promise<BatchAdjustResult> => {
  const response = await request.post(API_BASE + '/batch', adjustments);
  return response as unknown as BatchAdjustResult;
};

export const approveAdjustment = async (id: number): Promise<CostAdjustmentSheet> => {
  return request.post(`${API_BASE}/${id}/approve`);
};

export const rejectAdjustment = async (id: number, reason: string): Promise<CostAdjustmentSheet> => {
  return request.post(`${API_BASE}/${id}/reject`, { reason });
};

export const revokeAdjustment = async (id: number): Promise<CostAdjustmentSheet> => {
  return request.post(`${API_BASE}/${id}/revoke`);
};

export const getAdjustmentById = async (id: number): Promise<CostAdjustmentSheet> => {
  const response = await request.get(`${API_BASE}/${id}`);
  return response as unknown as CostAdjustmentSheet;
};

export const getAdjustmentBySheetNo = async (sheetNo: string): Promise<CostAdjustmentSheet> => {
  const response = await request.get(`${API_BASE}/sheet-no/${sheetNo}`);
  return response as unknown as CostAdjustmentSheet;
};

export const getAdjustmentItemsBySheetId = async (sheetId: number): Promise<CostAdjustmentItem[]> => {
  const response = await request.get(`${API_BASE}/${sheetId}/items`);
  return response as unknown as CostAdjustmentItem[];
};

export const getAdjustmentItemsByPurchaseOrderId = async (purchaseOrderId: number): Promise<CostAdjustmentItem[]> => {
  const response = await request.get(`${API_BASE}/purchase-order/${purchaseOrderId}`);
  return response as unknown as CostAdjustmentItem[];
};

export const listAdjustments = async (params: {
  sheetNo?: string;
  supplierName?: string;
  status?: string;
  page?: number;
  size?: number;
}): Promise<{ data: CostAdjustmentSheet[]; totalElements: number; totalPages: number; currentPage: number }> => {
  return request.get(API_BASE, { params }) as unknown as Promise<{ data: CostAdjustmentSheet[]; totalElements: number; totalPages: number; currentPage: number }>;
};

export const getPendingAdjustmentOrderIds = async (purchaseOrderIds: number[]): Promise<number[]> => {
  const response = await request.post(API_BASE + '/pending-order-ids', purchaseOrderIds);
  return response as unknown as number[];
};
