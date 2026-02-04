export interface LogisticsAccount {
  key: number;
  id?: number;
  type: 'Company' | 'Personal' | 'COMPANY' | 'PERSONAL';
  name: string;
  bank: string;
  account: string;
  isDefault: boolean;
  status: boolean;
}

export interface LogisticsProvider {
  id: string;
  name: string;
  contactPerson: string;
  contactPhone: string;
  status: string;
  settlementType: string;
  settlementPeriod?: number;
  settlementCycle?: string;
  purchaserId?: number;
  purchaserName?: string;
  procurementOwner?: string;
  accounts: LogisticsAccount[];
  createdAt?: string;
  updatedAt?: string;
  prepaymentWarning?: number;
  prepaymentBalance?: number;
}

export interface LogisticsTrack {
  id: number;
  bizType: string;
  bizNo: string;
  logisticsProvider: string;
  trackingNo: string;
  status: string;
  location: string;
  description: string;
  eventTime: string;
}
