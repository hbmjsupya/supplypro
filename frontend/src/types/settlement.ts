export interface PendingDeliverySettlement {
  id: string;
  deliveryNo: string;
  trackingNo?: string;
  type: 'Logistics' | 'SelfDelivery';
  details: string;
  supplierId: string;
  supplierName: string;
  settlementType: string;
  settlementCycle: string;
  relatedBizNo: string;
  relatedOrderNo?: string;
  relatedOrderId?: string;
  specs: string;
  fee: number;
  bizType?: string;
  status: 'pending' | 'settled' | '已发货' | '已收货' | 'SHIPPED' | 'RECEIVED' | 'PARTIAL_RECEIVED';
  createTime: string;
}

export interface SupplierSettlement {
  id: string;
  supplierId: string;
  supplierName: string;
  source: 'Purchase' | 'Delivery';
  amount: number;
  status: 'Pending' | 'Approved' | 'Paid' | 'Rejected';
  createTime: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  items: any[]; // Linked items
}
