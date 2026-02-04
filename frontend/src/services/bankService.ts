import request from '../utils/request';

export interface BankDTO {
  id: number;
  bankCode: string;
  name: string;
  shortName?: string;
  type?: string;
  level?: string;
  province?: string;
  city?: string;
  district?: string;
  address?: string;
  phone?: string;
  swiftCode?: string;
  status: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BankSearchCriteria {
  keyword?: string;
  status?: boolean;
}

export interface PageResult<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export const getBanks = (params: { page?: number; size?: number } & BankSearchCriteria) => {
  return request.get<any, PageResult<BankDTO>>('/banks', { params });
};

export const getBankById = (id: number) => {
  return request.get<any, BankDTO>(`/banks/${id}`);
};

export const createBank = (data: Partial<BankDTO>) => {
  return request.post<any, BankDTO>('/banks', data);
};

export const updateBank = (id: number, data: Partial<BankDTO>) => {
  return request.put<any, BankDTO>(`/banks/${id}`, data);
};

export const deleteBank = (id: number) => {
  return request.delete(`/banks/${id}`);
};
