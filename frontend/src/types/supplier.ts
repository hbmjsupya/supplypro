export interface SupplierDataType {
  key: string;
  id?: string; // For backend compatibility
  supplierName: string;
  supplierId: string;
  contact: string;
  brands: string[];
  contactInfo: string;
  purchaserInfo: string;
  status: 'Enabled' | 'Disabled';
  createTime: string;
  coopEndTime: string;
  settlementType?: 'Cash' | 'Prepayment';
  settlementCycle?: string;
}

export interface PrepaymentApplyItem {
  key: string;
  id: string; // YF+...
  appliedAmount: number;
  paidAmount: number;
  lastPaymentTime: string;
  applyTime: string;
  applicant: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Paid';
}

export interface PaymentVoucher {
  name: string;
  url: string;
}

export interface PaymentRecord {
  slipNo: string;
  amount: number;
  paymentTime: string;
  vouchers: PaymentVoucher[];
}

export interface DetailData {
  id: string;
  status: 'Pending' | 'Approved' | 'Paid' | 'Rejected' | 'PartiallyPaid';
  businessType: string;
  payer: { name: string; bank: string; account: string };
  payee: { name: string; bank: string; account: string };
  contact: { name: string; phone: string };
  amount: { applied: number; actual: number; unpaid: number };
  attachments: { name: string; url: string }[];
  logs: { time: string; user: string; action: string; comment: string }[];
  paymentRecords: PaymentRecord[];
}

export interface PrepaymentLogItem {
  key: string;
  id: string;
  type: 'Income' | 'Expense';
  approvedAmount: number;
  actualAmount: number;
  date: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  note?: string;
}
