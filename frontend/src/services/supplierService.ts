import request from '../utils/request';

export interface SupplierDTO {
  id: number;
  supplierNo: string;
  name: string;
  contactPerson: string;
  contactPhone: string;
  email: string;
  address: string;
  orgCode?: string;
  qualificationFile?: string;
  contractFile?: string;
  purchaserId?: number;
  purchaserName?: string;
  brandNames?: string[];
  coopEndTime?: string;
  settlementType: string;
  settlementPeriod: number;
  prepaymentBalance: number;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
}

export interface SupplierSearchCriteria {
  name?: string;
  settlementType?: string;
  settlementPeriod?: number;
  purchaserId?: number;
  contactInfo?: string;
  expiringSoon?: boolean;
  status?: 'ACTIVE' | 'INACTIVE';
}

export interface PageResult<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export const getSuppliers = (params: { page?: number; size?: number } & SupplierSearchCriteria) => {
  return request.get<any, PageResult<SupplierDTO>>('/suppliers', { params });
};

export const getSupplierById = (id: number) => {
  return request.get<any, SupplierDTO>(`/suppliers/${id}`);
};

export const createSupplier = (data: Partial<SupplierDTO>) => {
  return request.post<any, SupplierDTO>('/suppliers', data);
};

export const updateSupplier = (id: number, data: Partial<SupplierDTO>) => {
  return request.put<any, SupplierDTO>(`/suppliers/${id}`, data);
};

export const deleteSupplier = (id: number) => {
  return request.delete(`/suppliers/${id}`);
};

export const deleteAllSuppliers = () => {
  return request.delete('/suppliers/all');
};
