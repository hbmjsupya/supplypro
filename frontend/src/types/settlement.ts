export interface PendingDeliverySettlement {
  id: string;
  deliveryNo: string;
  type: 'Logistics' | 'SelfDelivery';
  details: string;
  supplierId: string;
  supplierName: string;
  settlementCycle: string;
  relatedBizNo: string;
  specs: string;
  fee: number;
  status: 'pending' | 'settled';
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
  items: any[]; // Linked items
}
