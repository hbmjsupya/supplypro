import request from '../utils/request';
import { Warehouse, InboundOrder, OutboundOrder, InventoryBatch } from '../types/warehouse';

export type { Warehouse };

const STORAGE_KEYS = {
  INBOUND: 'sc_inbound_orders_v2',
  OUTBOUND: 'sc_outbound_orders_v2',
  INVENTORY: 'sc_inventory_batches_v2',
};

// --- Warehouse Operations (Real API) ---

export const getWarehouses = async (params?: any): Promise<Warehouse[]> => {
  try {
      const res: any = await request.get('/warehouses', { params });
      // Backend returns { records: [], total: ... } inside data
      return res.records || [];
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
  const warehouses = await getWarehouses({ size: 1000 }); // Fetch all for map
  return warehouses.reduce((acc, curr) => {
    acc[curr.code] = curr.name;
    return acc;
  }, {} as Record<string, string>);
};

export const saveWarehouse = async (warehouse: Warehouse): Promise<void> => {
  if (warehouse.id && !warehouse.id.toString().startsWith('new')) { // Check if it's a real ID
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

// --- Mock Data Initialization (Inventory/Orders only) ---
const initializeMockData = () => {
  // Inventory Batches (Mock existing stock)
  if (!localStorage.getItem(STORAGE_KEYS.INVENTORY)) {
    const batches: InventoryBatch[] = [];
    const products = [
      { pid: 'P001', sku: 'SKU001', name: '无线鼠标', spec: '黑色', cost: 45.00 },
      { pid: 'P002', sku: 'SKU003', name: '机械键盘', spec: '青轴', cost: 280.00 },
      { pid: 'P003', sku: 'SKU004', name: '显示器', spec: '27寸 4K', cost: 1200.00 },
      { pid: 'P004', sku: 'SKU005', name: '办公椅', spec: '人体工学', cost: 850.00 },
      { pid: 'P005', sku: 'SKU006', name: 'A4打印纸', spec: '70g/500张', cost: 18.50 },
    ];

    // Generate 20 batches across warehouses
    for (let i = 1; i <= 20; i++) {
      const whIdx = Math.floor(Math.random() * 3); // Top 3 warehouses
      const prodIdx = Math.floor(Math.random() * products.length);
      const wh = ['WH001', 'WH002', 'WH003'][whIdx];
      const prod = products[prodIdx];
      const qty = Math.floor(Math.random() * 100) + 10;
      const inboundDate = new Date(2023, 9, 10 + i);
      const expiryDate = new Date(inboundDate);
      expiryDate.setFullYear(expiryDate.getFullYear() + 1); // 1 year validity
      
      batches.push({
        batchNo: `202310${(10+i).toString()}B${Math.floor(Math.random()*1000)}`,
        warehouseCode: wh,
        productId: prod.pid,
        skuId: prod.sku,
        productName: prod.name,
        specName: prod.spec,
        initialQty: qty,
        currentQty: qty, // Assume full for now
        unitCost: prod.cost,
        inboundTime: inboundDate.toISOString(),
        expiryDate: expiryDate.toISOString().split('T')[0],
        supplierId: 'SUP001'
      });
    }
    localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(batches));
  }

  // Inbound Orders
  if (!localStorage.getItem(STORAGE_KEYS.INBOUND)) {
    const inboundOrders: InboundOrder[] = [];
    // 1-2: Pending, 3-5: Partial, 6-8: Completed, 9-10: Cancelled
    const statuses = ['pending', 'pending', 'partial', 'partial', 'partial', 'completed', 'completed', 'completed', 'cancelled', 'cancelled'];
    
    for (let i = 1; i <= 10; i++) {
      const status = statuses[i-1];
      const isCompleted = status === 'completed';
      
      inboundOrders.push({
        id: `IN202310${(20+i).toString()}`,
        poNo: `PO202310${(20+i).toString()}`, // Matches POs in purchaseOrderService
        supplierId: 'SUP001',
        supplierName: '联想（北京）有限公司',
        warehouseCode: i > 5 ? 'WH001' : 'WH002',
        status: status as any,
        createTime: new Date(2023, 9, 20 + i).toISOString(),
        confirmTime: isCompleted ? new Date(2023, 9, 21 + i).toISOString() : undefined,
        confirmBy: isCompleted ? 'admin1' : undefined,
        items: [
          { productId: 'P001', skuId: 'SKU001', productName: '无线鼠标', specName: '黑色', quantity: 50, unitCost: 45.00 }
        ]
      });
    }
    localStorage.setItem(STORAGE_KEYS.INBOUND, JSON.stringify(inboundOrders));
  }

  // Outbound Orders
  if (!localStorage.getItem(STORAGE_KEYS.OUTBOUND)) {
    const outboundOrders: OutboundOrder[] = [];
    // 5 Pending, 5 Shipped
    for (let i = 1; i <= 10; i++) {
      const isShipped = i > 5;
      outboundOrders.push({
        id: `OUT202311${(10+i).toString()}`,
        bizNo: `SO202311${(10+i).toString()}`,
        warehouseCode: 'WH001',
        status: isShipped ? 'shipped' : 'pending',
        contact: '张三',
        phone: '13800138000',
        address: '浙江省杭州市西湖区文一西路88号',
        createTime: new Date(2023, 10, i).toISOString(),
        shippedTime: isShipped ? new Date(2023, 10, i + 1).toISOString() : undefined,
        items: [
           { productId: 'P001', skuId: 'SKU001', productName: '无线鼠标', specName: '黑色', quantity: 5, batchNo: 'MOCK_BATCH_01' }
        ]
      });
    }
    localStorage.setItem(STORAGE_KEYS.OUTBOUND, JSON.stringify(outboundOrders));
  }
};

// Initialize immediately
initializeMockData();

// Helper to simulate delay
export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- Inbound Operations ---

export const getInboundOrders = async (): Promise<InboundOrder[]> => {
  await delay(300);
  const data = localStorage.getItem(STORAGE_KEYS.INBOUND);
  return data ? JSON.parse(data) : [];
};

export const createInboundOrder = async (order: InboundOrder): Promise<void> => {
  await delay(300);
  const orders = await getInboundOrders();
  orders.unshift(order);
  localStorage.setItem(STORAGE_KEYS.INBOUND, JSON.stringify(orders));
};

export const confirmInboundOrder = async (id: string, confirmBy: string): Promise<void> => {
  await delay(300);
  const orders = await getInboundOrders();
  const order = orders.find(o => o.id === id);
  if (order && order.status === 'pending') {
    order.status = 'completed';
    order.confirmTime = new Date().toISOString();
    order.confirmBy = confirmBy;
    
    // Generate Inventory Batches
    const batches = await getInventoryBatches();
    order.items.forEach((item, index) => {
      const expiryDate = new Date();
      expiryDate.setFullYear(expiryDate.getFullYear() + 1); // Default 1 year validity

      const batch: InventoryBatch = {
        batchNo: `${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${order.warehouseCode}${(index + 1).toString().padStart(4, '0')}`,
        warehouseCode: order.warehouseCode,
        productId: item.productId,
        skuId: item.skuId,
        productName: item.productName,
        specName: item.specName,
        initialQty: item.quantity,
        currentQty: item.quantity,
        unitCost: item.unitCost,
        inboundTime: new Date().toISOString(),
        expiryDate: expiryDate.toISOString().split('T')[0],
        supplierId: order.supplierId
      };
      batches.push(batch);
    });
    localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(batches));
    localStorage.setItem(STORAGE_KEYS.INBOUND, JSON.stringify(orders));
  }
};

// --- Inventory Operations ---

export const getInventoryBatches = async (): Promise<InventoryBatch[]> => {
  await delay(300);
  const data = localStorage.getItem(STORAGE_KEYS.INVENTORY);
  return data ? JSON.parse(data) : [];
};

// --- Outbound Operations ---

export const getOutboundOrders = async (): Promise<OutboundOrder[]> => {
  await delay(300);
  const data = localStorage.getItem(STORAGE_KEYS.OUTBOUND);
  return data ? JSON.parse(data) : [];
};

export const createOutboundOrder = async (order: OutboundOrder): Promise<void> => {
  await delay(300);
  const orders = await getOutboundOrders();
  orders.unshift(order);
  localStorage.setItem(STORAGE_KEYS.OUTBOUND, JSON.stringify(orders));
};

export const shipOutboundOrder = async (id: string, logisticsInfo?: { logisticsCompany: string; trackingNo: string; logisticsFee: number }): Promise<void> => {
  await delay(300);
  const orders = await getOutboundOrders();
  const order = orders.find(o => o.id === id);
  if (order && order.status === 'pending') {
    // Deduct inventory
    const batches = await getInventoryBatches();
    
    // Simple FIFO or specified batch logic would go here
    // For now, we assume batchNo is specified in items or we auto-deduct
    // This is a prototype simplification
    
    order.items.forEach(item => {
        if(item.batchNo) {
            const batch = batches.find(b => b.batchNo === item.batchNo);
            if(batch) {
                batch.currentQty -= item.quantity;
            }
        }
    });

    order.status = 'shipped';
    order.shippedTime = new Date().toISOString();
    if (logisticsInfo) {
        order.logisticsCompany = logisticsInfo.logisticsCompany;
        order.trackingNo = logisticsInfo.trackingNo;
        order.logisticsFee = logisticsInfo.logisticsFee;
    }
    
    localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(batches));
    localStorage.setItem(STORAGE_KEYS.OUTBOUND, JSON.stringify(orders));
  }
};
