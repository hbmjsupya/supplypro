import request from '../utils/request';

export interface Product {
  id?: number;
  skuCode?: string;
  name: string;
  brand?: string;
  category?: string;
  spec?: string;
  costPrice: number;
  taxClass?: string;
  taxRate?: number;
  taxCode?: string;
  logisticsTemplate?: string;
  promoFile?: string;
  status: 'PENDING_SELECTION' | 'SELECTED' | 'ON_SHELF' | 'OFF_SHELF';
  defaultSupplierId?: number;
  defaultSupplierName?: string; // Optional for display
  isBundle?: boolean;
}

export interface ProductBundleItem {
  id?: number;
  childProductId: number;
  childProductName?: string; // For display
  quantity: number;
}

export const productService = {
  getAll: (params: { page: number; size: number; name?: string }) => {
    return request.get('/products', { params });
  },

  getById: (id: number) => {
    return request.get(`/products/${id}`);
  },

  create: (data: Product) => {
    return request.post('/products', data);
  },

  update: (id: number, data: Product) => {
    return request.put(`/products/${id}`, data);
  },

  delete: (id: number) => {
    return request.delete(`/products/${id}`);
  },

  getBundleItems: (id: number) => {
    return request.get(`/products/${id}/bundle`);
  },

  updateBundleItems: (id: number, items: ProductBundleItem[]) => {
    return request.post(`/products/${id}/bundle`, items);
  }
};
