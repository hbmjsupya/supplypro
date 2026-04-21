export interface Warehouse {
  id: string;
  code: string;
  name: string;
  province: string;
  city: string;
  district: string;
  provinceCode?: string;
  cityCode?: string;
  districtCode?: string;
  address: string;
  admins: string[]; // Legacy: Usernames
  managerIds?: number[]; // For form submission
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  managers?: any[]; // For display
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING';
  createTime?: string;
  createdAt?: string; // Backend field
}

export interface InventoryBatch {
  id: number;
  batchNo: string;
  warehouseCode: string;
  warehouseId?: number;
  productId: string;
  skuId: string;
  productName: string;
  specName: string;
  initialQty: number;
  currentQty: number;
  availableQuantity?: number;
  lockedQty?: number;
  availableForShip?: number;
  unitCost: number;
  balanceCost?: number;
  inboundTime: string;
  expiryDate?: string;
  supplierId: string;
  purchaseOrderId?: string;
  purchaseOrderNo?: string;
}

export interface InboundOrderItem {
  productId: string;
  skuId: string;
  productName: string;
  specName: string;
  quantity: number;
  unitCost: number;
  totalCost?: number;
  taxRate?: number;
  taxAmount?: number;
  inboundTime?: string;
}

export interface InboundOrder {
  id: string;
  inboundNo?: string;
  poNo?: string; // Associated Purchase Order
  supplierId: string;
  supplierName: string;
  supplierContact?: string;
  warehouseCode: string;
  warehouseName?: string;
  status: 'pending' | 'partial' | 'completed' | 'cancelled' | 'PENDING' | 'RECEIVED' | 'COMPLETED' | 'CANCELLED';
  items: InboundOrderItem[];
  createTime: string;
  createdAt?: string;
  inboundDate?: string;
  confirmTime?: string;
  confirmBy?: string;
  totalQuantity?: number;
  totalAmount?: number;
  totalTax?: number;
  shippingStatus?: 'PENDING' | 'TO_SHIP' | 'SHIPPED' | 'RECEIVED';
}

export interface OutboundOrderItem {
  productId: string;
  skuId: string;
  productName: string;
  specName: string;
  quantity: number;
  batchNo?: string; // Selected batch for deduction
}

export interface OutboundOrder {
  id: string;
  bizNo: string; // Order No
  warehouseCode: string;
  status: 'pending' | 'picked' | 'shipped';
  items: OutboundOrderItem[];
  createTime: string;
  shippedTime?: string;
  logisticsCompany?: string;
  trackingNo?: string;
  logisticsFee?: number;
  contact?: string; // Receiver Name
  phone?: string; // Receiver Phone
  address?: string;
}
