import request from '../utils/request';
import { SupplierDTO } from './supplierService';

export interface Brand {
  id: number;
  name: string;
  trademarkNo: string;
  icon: string;
  status: 'ENABLED' | 'DISABLED';
  productCount?: number;
  suppliers?: SupplierDTO[];
  createdAt?: string;
  updatedAt?: string;
}

export interface BrandListResponse {
  records: Brand[];
  total: number;
}

// BrandController returns { code: 200, data: { records: [], total: 0 } }
// request interceptor usually returns 'response.data' or 'response'.
// Assuming request.ts returns response.data directly if configured that way, 
// or we need to handle the structure.
// Let's check request.ts first to be sure.

export const getBrands = (params: { page?: number; size?: number; name?: string }) => {
  return request.get<any, any>('/brands', { params });
};

export const getBrandById = (id: number) => {
  return request.get<any, any>(`/brands/${id}`);
};

export const createBrand = (data: Partial<Brand>) => {
  return request.post<any, any>('/brands', data);
};

export const updateBrand = (id: number, data: Partial<Brand>) => {
  return request.put<any, any>(`/brands/${id}`, data);
};

export const addBrandSupplier = (brandId: number, supplierId: number) => {
  return request.post<any, any>(`/brands/${brandId}/suppliers/${supplierId}`);
};

export const removeBrandSupplier = (brandId: number, supplierId: number) => {
  return request.delete<any, any>(`/brands/${brandId}/suppliers/${supplierId}`);
};
