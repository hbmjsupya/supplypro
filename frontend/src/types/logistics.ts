export interface LogisticsAccount {
  key: number;
  type: 'Company' | 'Personal';
  name: string;
  bank: string;
  account: string;
  isDefault: boolean;
  status: boolean;
}

export interface LogisticsProvider {
  id: string;
  name: string;
  contactName: string;
  contactPhone: string;
  status: 'enabled' | 'disabled';
  settlementType: 'Cash' | 'Period';
  settlementCycle?: 'Daily' | 'Weekly' | 'Monthly';
  accounts: LogisticsAccount[];
  createTime: string;
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
