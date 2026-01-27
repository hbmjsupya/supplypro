import request from '../utils/request';

export interface SupplierDTO {
  id: number;
  supplierNo: string;
  name: string;
  contactPerson: string;
  contactPhone: string;
  email: string;
  address: string;
  settlementType: string;
  settlementPeriod: number;
  prepaymentBalance: number;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
}

export interface PageResult<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export const getSuppliers = (params: { page?: number; size?: number; name?: string }) => {
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
