import request from '../utils/request';
import { Warehouse, InboundOrder, OutboundOrder, InventoryBatch } from '../types/warehouse';

export type { Warehouse };

// --- Warehouse Operations (Real API) ---

export const getWarehouses = async (params?: any): Promise<Warehouse[]> => {
  try {
      const res: any = await request.get('/warehouses', { params });
      const records = res?.data?.records || res?.records || [];
      return records.map((w: any) => ({
          ...w,
          id: String(w.id)
      }));
  } catch (e) {
      console.error("Failed to fetch warehouses", e);
      return [];
  }
};

export const getNextWarehouseCode = async (): Promise<string> => {
    try {
        const res: any = await request.get('/warehouses/next-code');
        return res as string;
    } catch (e) {
        console.error("Failed to fetch next code", e);
        return "";
    }
};

export const getWarehouseNameMap = async (): Promise<Record<string, string>> => {
  const warehouses = await getWarehouses({ size: 1000 });
  return warehouses.reduce((acc, curr) => {
    acc[curr.code] = curr.name;
    return acc;
  }, {} as Record<string, string>);
};

export const saveWarehouse = async (warehouse: Warehouse): Promise<void> => {
  if (warehouse.id && !warehouse.id.toString().startsWith('new')) {
      await request.put(`/warehouses/${warehouse.id}`, warehouse);
  } else {
      await request.post('/warehouses', warehouse);
  }
};

export const updateWarehouseStatus = async (id: string, status: 'ACTIVE' | 'INACTIVE'): Promise<void> => {
  await request.put(`/warehouses/${id}/status`, { status });
};

export const deleteWarehouse = async (id: string): Promise<void> => {
  await request.delete(`/warehouses/${id}`);
};

// --- Inbound Operations (Real API) ---

export const getInboundOrders = async (filters?: Record<string, any>): Promise<{ records: InboundOrder[], total: number }> => {
  try {
    const params: Record<string, unknown> = { size: 10, page: 1 };
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params[key] = value;
        }
      });
    }
    
    const res: any = await request.get('/inbound-orders', { params });
    const responseData = res.data || res;
    const records = responseData.records || [];
    const total = responseData.total || 0;
    
    const mapInboundOrder = (item: any): InboundOrder & { shippingStatus?: string } => ({
      ...item,
      id: String(item.id),
      inboundNo: item.inboundNo,
      poNo: item.purchaseOrderNo || item.purchaseOrder?.orderNo,
      supplierId: String(item.supplierId || item.purchaseOrder?.supplier?.id || ''),
      supplierName: item.supplierName || item.purchaseOrder?.supplier?.name,
      warehouseCode: item.warehouseCode || item.warehouse?.code,
      warehouseName: item.warehouseName || item.warehouse?.name,
      status: item.status,
      shippingStatus: item.shippingStatus || item.purchaseOrder?.shippingStatus,
      createdAt: item.createdAt,
      createTime: item.createdAt || item.inboundDate,
      inboundDate: item.inboundDate,
      confirmTime: item.inboundDate,
      totalQuantity: item.totalQuantity,
      totalAmount: item.totalAmount,
      items: item.items?.map((i: any) => ({
        productId: String(i.productId || i.product?.id || ''),
        skuId: String(i.sku || i.product?.sku || ''),
        productName: i.productName || i.product?.name,
        specName: i.specName || i.spec || i.product?.specification || i.product?.spec,
        quantity: i.quantity,
        unitCost: i.unitCost,
        inboundTime: item.inboundDate
      })) || []
    });

    return {
        records: records.map(mapInboundOrder),
        total
    };
  } catch (e) {
    console.error("Failed to fetch inbound orders", e);
    return { records: [], total: 0 };
  }
};

export const getInboundOrderStatusSummary = async (params?: Record<string, any>) => {
    return request.get('/inbound-orders/status-summary', { params });
};

export const getInboundOrder = async (id: string): Promise<any> => {
    try {
        const res: any = await request.get(`/inbound-orders/${id}`);
        const item = res.data || res;
        
        return {
            ...item,
            id: String(item.id),
            poNo: item.purchaseOrder?.orderNo,
            supplierId: String(item.supplier?.id || item.purchaseOrder?.supplier?.id || ''),
            supplierName: item.supplierName || item.supplier?.name || item.purchaseOrder?.supplier?.name,
            supplierContact: item.supplierContact || item.supplier?.contact,
            warehouseCode: String(item.warehouse?.id || item.warehouse?.code || ''),
            warehouseName: item.warehouse?.name,
            createTime: item.createdAt || item.inboundDate,
            confirmTime: item.inboundDate,
            confirmBy: item.confirmedBy,
            items: item.items?.map((i: any) => ({
                ...i,
                productId: String(i.productId || i.product?.id || ''),
                skuId: String(i.sku || i.product?.sku || ''),
                productName: i.productName || i.product?.name,
                specName: i.spec || i.specName || i.product?.specification,
                inboundTime: item.inboundDate
            })) || []
        };
    } catch (e: any) {
        if (e.response && e.response.status === 404) {
             console.warn(`Inbound order ${id} not found (404)`);
             return null;
        }
        if (e.response && e.response.status === 403) {
             console.warn(`Permission denied for inbound order ${id} (403)`);
             throw new Error('PERMISSION_DENIED');
        }
        console.error(`Failed to fetch inbound order ${id}`, e);
        throw e;
    }
};

export const createInboundOrder = async (payload: { purchaseOrderId: number, warehouseId: number }): Promise<void> => {
  await request.post('/inbound-orders', payload);
};

export const checkInboundAdjustment = async (id: string): Promise<{ adjustments: any[]; purchaseOrderShippingStatus?: string; purchaseOrderStatus?: string }> => {
    const res: any = await request.get(`/inbound-orders/${id}/check-adjustment`);
    return {
        adjustments: res.data || res || [],
        purchaseOrderShippingStatus: res.purchaseOrderShippingStatus,
        purchaseOrderStatus: res.purchaseOrderStatus
    };
};

export const confirmInboundOrder = async (id: string, _confirmBy: string): Promise<void> => {
    await request.post(`/inbound-orders/${id}/confirm`);
};

export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- Inventory Operations ---

export const getInventoryBatches = async (params?: any): Promise<InventoryBatch[]> => {
  try {
    let res: any = await request.get('/inventory', { params: { ...params, size: 1000 } });
    if (typeof res === 'string') {
      res = JSON.parse(res);
    }
    const records = res?.data?.records || res?.records || [];
    return records.map((item: any) => ({
      id: item.id,
      batchNo: item.batchNo,
      warehouseCode: item.warehouse?.code || String(item.warehouse?.id || ''),
      warehouseId: item.warehouse?.id || '',
      productId: String(item.product?.id || ''),
      skuId: String(item.sku?.id || item.product?.sku || ''),
      productName: item.product?.name || '',
      specName: item.sku?.specification || item.sku?.name || item.product?.specification || '-',
      initialQty: item.quantity || 0,
      currentQty: item.availableQuantity || item.quantity || 0,
      lockedQty: item.lockedQuantity || 0,
      availableForShip: item.availableForShip || 0,
      unitCost: item.unitCost || 0,
      balanceCost: item.balanceCost || 0,
      inboundTime: item.createdAt || '',
      expiryDate: item.expiryDate || '',
      supplierId: '',
      purchaseOrderId: item.purchaseOrderId ? String(item.purchaseOrderId) : undefined,
      purchaseOrderNo: item.purchaseOrderNo || undefined
    }));
  } catch (e) {
    console.error("Failed to fetch inventory batches", e);
    return [];
  }
};

export const getInventoryBatchesPaged = async (params?: any): Promise<{ records: InventoryBatch[], total: number }> => {
  const res: any = await request.get('/inventory', { params });
  const records = res?.data?.records || res?.records || [];
  return {
    records: records.map((item: any) => ({
      batchNo: item.batchNo,
      warehouseCode: item.warehouse?.code || String(item.warehouse?.id || ''),
      productId: String(item.product?.id || ''),
      skuId: String(item.sku?.id || item.product?.sku || ''),
      productName: item.product?.name || '',
      specName: item.sku?.specification || item.sku?.name || item.product?.specification || '-',
      initialQty: item.quantity || 0,
      currentQty: item.availableQuantity || item.quantity || 0,
      unitCost: item.unitCost || 0,
      inboundTime: item.createdAt || '',
      expiryDate: item.expiryDate || '',
      supplierId: ''
    })),
    total: res?.data?.total || res?.total || 0
  };
};

export const getStockFlows = async (params?: any): Promise<{ records: any[], total: number }> => {
  const res: any = await request.get('/stock-flows', { params });
  const data = res.data || res;
  return {
    records: data.records || [],
    total: data.total || 0
  };
};

// --- Outbound Operations ---

export const getOutboundOrders = async (params?: any): Promise<any> => {
  const res: any = await request.get('/outbound-orders', { params });
  return res?.data || res;
};

export const createOutboundOrder = async (order: any): Promise<any> => {
  const res: any = await request.post('/outbound-orders', order);
  return res?.data || res;
};

export const shipOutboundOrder = async (id: string | number, logisticsInfo: any): Promise<any> => {
  console.log('=== shipOutboundOrder called ===');
  console.log('logisticsInfo:', logisticsInfo);
  
  const payload = {
    ...logisticsInfo,
    logisticsProviderId: logisticsInfo.logisticsSupplier,
    logisticsCompany: logisticsInfo.logisticsCompanyName || logisticsInfo.shipCompany,
    trackingNo: logisticsInfo.shipNo,
    deliveryMethod: logisticsInfo.shipType,
    logisticsFee: logisticsInfo.logisticsFee,
  };
  
  console.log('payload to send:', payload);
  
  const res: any = await request.post(`/outbound-orders/${id}/ship`, payload);
  return res?.data || res;
};

export const updateOutboundOrderLogistics = async (id: string | number, logisticsInfo: any): Promise<any> => {
  const payload = {
    ...logisticsInfo,
    logisticsProviderId: logisticsInfo.logisticsSupplier,
    logisticsCompany: logisticsInfo.logisticsCompanyName || logisticsInfo.shipCompany,
    trackingNo: logisticsInfo.shipNo,
    deliveryMethod: logisticsInfo.shipType,
    logisticsFee: logisticsInfo.logisticsFee,
  };
  
  const res: any = await request.put(`/outbound-orders/${id}/logistics`, payload);
  return res?.data || res;
};

export const cancelOutboundOrder = async (id: string | number): Promise<any> => {
  const res: any = await request.post(`/outbound-orders/${id}/cancel`);
  return res?.data || res;
};

export const getOutboundOrderById = async (id: string | number): Promise<any> => {
  const res: any = await request.get(`/outbound-orders/${id}`);
  return res?.data || res;
};

export const receiveOutboundOrder = async (id: number): Promise<any> => {
  const res: any = await request.put(`/outbound-orders/${id}/receive`);
  return res?.data || res;
};
