import request from '../utils/request';

export interface DeliveryOrderData {
  deliveryNo: string;
  settlementNo: string;
  relatedOrderNo: string;
  deliveryMethod: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  trackingNumber: string;
  logisticsCompany: string;
  shippedAt: string;
  deliverer: string;
  delivererPhone: string;
  plateNumber: string;
  currentLocation: string;
  receiverAddress: string;
  receiverProvince: string;
  receiverCity: string;
  receiverDistrict: string;
  logisticsSupplierName: string;
  supplierName: string;
  purchaseOrderStatus: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getSupplierSettlements = (params: any = {}) => {
    return request.get('/settlements', { params });
};

export const paySettlement = (id: number, data: { paymentMethod: string; paymentProof?: string }) => {
    return request.post(`/settlements/${id}/pay`, data);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const createPendingDeliverySettlement = (data: any) => request.post('/settlements/pending-delivery', data);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getPendingDeliverySettlements = (params: any = {}) => request.get('/settlements/pending-delivery', { params });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getPendingPurchaseSettlements = (params: any = {}) => request.get('/settlements/pending-purchase', { params });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const updatePendingDeliverySettlementStatus = (ids: any, status: string) => request.put(`/settlements/pending-delivery/status`, { ids, status });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const createSupplierSettlement = (data: any) => request.post('/settlements/supplier', data);

export interface BizItemRecord {
  id: string;
  bizType: string;
  rawId: number;
  purchaseOrderId: number;
  purchaseOrderNo: string;
  bizNo: string;
  supplierId: number | string;
  supplierName: string;
  amount: number;
}

export interface PurchaseSettlementParams {
  items: BizItemRecord[];
  createdBy?: string;
  payeeAccountType?: string;
  payeeAccountName?: string;
  payeeBank?: string;
  payeeAccount?: string;
}

export const createPurchaseSettlementsFromPending = async (params: PurchaseSettlementParams) => {
  return request.post('/settlements/purchase-settlements-from-pending', {
    items: params.items,
    createdBy: params.createdBy || 'admin',
    payeeAccountType: params.payeeAccountType,
    payeeAccountName: params.payeeAccountName,
    payeeBank: params.payeeBank,
    payeeAccount: params.payeeAccount
  });
};

export interface BankAccount {
  id: number;
  type?: string;
  name: string;
  bank: string;
  account: string;
  isDefault: boolean;
}

export interface PayeeAccountsResponse {
  payeeType: string;
  payeeId: number;
  payeeName: string;
  accounts: BankAccount[];
}

export const getPayeeAccounts = (settlementOrderIds: number[]) => {
  return request.get<PayeeAccountsResponse>('/settlements/payee-accounts', { 
    params: { settlementOrderIds: settlementOrderIds.join(',') } 
  });
};

export const getSupplierAccounts = (supplierId: number | string) => {
  return request.get<BankAccount[]>(`/suppliers/${supplierId}/accounts`);
};

export const getDeliveryOrderDetail = (deliveryNo: string): Promise<DeliveryOrderData> => request.get(`/settlements/delivery/${deliveryNo}`);

export const generateSettlementId = (prefix: string = 'SET') => prefix + '-' + new Date().getTime();

export interface SettlementDetailData {
  id: number;
  settlementNo: string;
  deliveryNo: string;
  relatedOrderNo: string;
  totalAmount: number;
  netAmount: number;
  taxAmount: number;
  createdAt: string;
  deliveryMethod: string;
  logisticsCompany: string;
  remark: string;
  revokeRemark?: string;
  sourceType: string;
  settlementType: string;
  supplierSettlementType?: string;
  status: string;
  statusEnum: string;
  payee: string;
  payeeBank: string;
  payeeAccount: string;
  payeeAccountName: string;
  payeeAccountType?: string;
  payer: string;
  payeeId: number;
  payeeType: string;
  deliveryList: DeliveryItem[];
  approvalRecords: ApprovalRecord[];
  operationLogs?: OperationLog[];
  costInvoiceAmount?: number;
  costInvoiceReceived?: number;
  costInvoiceStatus?: string;
  costInvoiceFiles?: string;
}

export interface OperationLog {
  id: number;
  operator: string;
  operationType: string;
  oldStatus?: string;
  newStatus?: string;
  remark?: string;
  createdAt: string;
}

export interface DeliveryItem {
  deliveryNo: string;
  relatedOrderNo: string;
  relatedOrderId?: number;
  deliveryMethod: string;
  shippedAt: string;
  amount: number;
  bizType?: string;
  bizNo?: string;
  platformOrderNo?: string;
  bizTypeLabel?: string;
}

export interface ApprovalRecord {
  step: number;
  title: string;
  description: string;
  status: string;
  operator: string;
  time: string;
}

export const getSettlementDetail = (id: number): Promise<SettlementDetailData> => 
  request.get(`/settlements/${id}`);

export const getSettlementDetailByNo = (settlementNo: string): Promise<SettlementDetailData> => 
  request.get(`/settlements/no/${settlementNo}`);

export const revokeSettlement = (id: number, remark?: string): Promise<{ code: number; message: string; data: { id: number; status: string; statusCn: string } }> => 
  request.post(`/settlements/${id}/revoke`, { remark });

export const rejectSettlement = (id: number, remark?: string): Promise<{ code: number; message: string; data: { id: number; status: string; statusCn: string } }> => 
  request.post(`/settlements/${id}/reject`, { remark });

export const confirmSettlement = (id: number): Promise<{ code: number; message: string; data: { id: number; status: string; statusCn: string } }> =>
  request.post(`/settlements/${id}/confirm`);

export const uploadCostInvoice = (id: number, amount: number, proof?: string, invoiceType?: string, invoiceCode?: string): Promise<{ code: number; message: string; data: { id: number; costInvoiceReceived: number; costInvoiceStatus: string } }> => 
  request.post(`/settlements/${id}/upload-cost-invoice`, { amount, proof, invoiceType, invoiceCode });

export interface CostInvoiceFile {
  url: string;
  type: string;
  amount: number;
  invoiceCode?: string;
  uploadTime: string;
}

export interface BatchReleaseResult {
  totalProcessed: number;
  totalSuccess: number;
  totalError: number;
  successRecords: Array<{
    deliveryNo: string;
    settlementNo: string;
    status: string;
  }>;
  errorRecords: Array<{
    settlementNo: string;
    error: string;
  }>;
  message: string;
  timestamp: string;
}

export const batchReleaseRevokedSettlements = (): Promise<BatchReleaseResult> => 
  request.post('/settlements/batch-release-revoked');

export const fixRevokedSettlements = (): Promise<BatchReleaseResult> => 
  request.post('/settlements/fix-revoked-settlements');

