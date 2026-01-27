export interface Warehouse {
  id: string;
  code: string;
  name: string;
  province: string;
  city: string;
  district: string;
  address: string;
  admins: string[]; // User IDs
  status: 'enabled' | 'disabled';
  createTime: string;
}

export interface InventoryBatch {
  batchNo: string; // YYYYMMDD+WarehouseCode+4位序列号
  warehouseCode: string;
  productId: string;
  skuId: string;
  productName: string;
  specName: string;
  initialQty: number;
  currentQty: number;
  unitCost: number;
  inboundTime: string;
  expiryDate?: string; // Validity period
  supplierId: string;
}

export interface InboundOrderItem {
  productId: string;
  skuId: string;
  productName: string;
  specName: string;
  quantity: number;
  unitCost: number;
  inboundTime?: string;
}

export interface InboundOrder {
  id: string;
  poNo?: string; // Associated Purchase Order
  supplierId: string;
  supplierName: string;
  warehouseCode: string;
  status: 'pending' | 'partial' | 'completed' | 'cancelled';
  items: InboundOrderItem[];
  createTime: string;
  confirmTime?: string;
  confirmBy?: string;
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
