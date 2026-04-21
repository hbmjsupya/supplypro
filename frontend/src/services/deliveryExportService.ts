import request from '../utils/request';

export interface DeliveryExportRequest {
  poIds?: number[];
  startDate?: string;
  endDate?: string;
  supplierName?: string;
  keyword?: string;
  status?: string;
  supplierId?: number;
  product?: string;
}

export interface DeliveryExportRecord {
  id: number;
  fileName: string;
  fileUrl: string;
  totalCount: number;
  successCount: number;
  failCount: number;
  createdAt: string;
  createdBy: string;
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
}

export interface DeliveryExportResponse {
  fileName: string;
  fileUrl: string;
  totalCount: number;
  successCount: number;
  failCount: number;
}

export interface DeliveryImportResponse {
  totalCount: number;
  successCount: number;
  failCount: number;
  errorFileUrl?: string;
  errors?: Array<{
    row: number;
    poNo: string;
    message: string;
  }>;
}

export const exportDeliveryOrders = async (data: DeliveryExportRequest): Promise<DeliveryExportResponse> => {
  try {
    const response = await request.post<any, any>('/purchase-orders/export-delivery', data, {
      responseType: 'blob'
    });
    
    if (response instanceof Blob) {
      // 检查是否是错误响应（JSON格式）
      if (response.type === 'application/json') {
        const text = await response.text();
        const errorData = JSON.parse(text);
        throw new Error(errorData.message || '导出失败');
      }
      
      const url = window.URL.createObjectURL(response);
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const fileName = `发货单-${year}${month}${day}${hours}${minutes}.zip`;
      
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      return {
        fileName,
        fileUrl: url,
        totalCount: 0,
        successCount: 0,
        failCount: 0
      };
    }
    
    return response;
  } catch (error: any) {
    // 处理axios错误
    if (error.response?.data instanceof Blob) {
      const text = await error.response.data.text();
      try {
        const errorData = JSON.parse(text);
        throw new Error(errorData.message || '导出失败');
      } catch {
        throw new Error('导出失败，请重试');
      }
    }
    throw error;
  }
};

export const getDeliveryExportRecords = (params?: { page?: number; size?: number }) => {
  return request.get<any, { 
    content: DeliveryExportRecord[]; 
    totalElements: number;
    total: number;
  }>('/delivery-export-records', { params });
};

export const downloadDeliveryExportRecord = async (id: number): Promise<void> => {
  const response = await request.get<any, Blob>(`/delivery-export-records/${id}/download`, {
    responseType: 'blob'
  });
  
  const url = window.URL.createObjectURL(response);
  const link = document.createElement('a');
  link.href = url;
  link.download = `delivery_export_${id}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

export const importDeliveryOrders = async (file: File): Promise<DeliveryImportResponse> => {
  const formData = new FormData();
  formData.append('file', file);
  
  // 使用fetch API来获取响应头
  const response = await fetch('/api/purchase-orders/import-delivery', {
    method: 'POST',
    body: formData,
    credentials: 'include'
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: '导入失败' }));
    throw new Error(errorData.message || '导入失败');
  }
  
  // 从响应头中获取统计数据
  const totalCount = parseInt(response.headers.get('x-total-count') || '0', 10);
  const successCount = parseInt(response.headers.get('x-success-count') || '0', 10);
  const failCount = parseInt(response.headers.get('x-fail-count') || '0', 10);
  
  // 获取响应数据（Blob）
  const blob = await response.blob();
  
  // 创建结果文件的下载URL
  const url = window.URL.createObjectURL(blob);
  
  return {
    totalCount,
    successCount,
    failCount,
    errorFileUrl: url,
    errors: []
  };
};

export const getExportDeliveryCount = async (params: Record<string, any>): Promise<{ count: number }> => {
  const response = await request.post('/purchase-orders/export-delivery-count', params);
  // request拦截器已经解包了response.data.data，所以这里直接返回response即可
  return response as unknown as { count: number };
};
