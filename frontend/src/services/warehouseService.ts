import { Warehouse, InboundOrder, OutboundOrder, InventoryBatch } from '../types/warehouse';

const STORAGE_KEYS = {
  WAREHOUSE: 'sc_warehouses_v2',
  WAREHOUSE_BACKUP: 'sc_warehouses_backup_v2',
  INBOUND: 'sc_inbound_orders_v2',
  OUTBOUND: 'sc_outbound_orders_v2',
  INVENTORY: 'sc_inventory_batches_v2',
};

// --- Mock Data Initialization ---
const initializeMockData = () => {
  // Warehouses
  const existingData = localStorage.getItem(STORAGE_KEYS.WAREHOUSE);
  if (!existingData) {
    const warehouses: Warehouse[] = [
      { id: '1', code: 'WH001', name: '杭州中心仓', province: '浙江省', city: '杭州市', district: '西湖区', address: '文一西路88号', admins: ['admin1'], status: 'enabled', createTime: '2023-10-01T10:00:00Z' },
      { id: '2', code: 'WH002', name: '上海转运仓', province: '上海市', city: '上海市', district: '浦东新区', address: '张江高科园', admins: ['user2'], status: 'enabled', createTime: '2023-10-02T11:00:00Z' },
      { id: '3', code: 'WH003', name: '北京前置仓', province: '北京市', city: '北京市', district: '朝阳区', address: '望京SOHO', admins: ['admin1'], status: 'enabled', createTime: '2023-10-03T12:00:00Z' },
      { id: '4', code: 'WH004', name: '深圳备件仓', province: '广东省', city: '深圳市', district: '南山区', address: '科技园', admins: ['user3'], status: 'enabled', createTime: '2023-10-05T09:00:00Z' },
      { id: '5', code: 'WH005', name: '广州发货仓', province: '广东省', city: '广州市', district: '天河区', address: '珠江新城', admins: ['admin2'], status: 'disabled', createTime: '2023-10-06T14:30:00Z' },
      { id: '6', code: 'WH006', name: '武汉华中仓', province: '湖北省', city: '武汉市', district: '洪山区', address: '光谷广场', admins: ['admin1'], status: 'enabled', createTime: '2023-10-08T10:00:00Z' },
      { id: '7', code: 'WH007', name: '成都西南仓', province: '四川省', city: '成都市', district: '武侯区', address: '天府三街', admins: ['user4'], status: 'enabled', createTime: '2023-10-09T11:20:00Z' },
      { id: '8', code: 'WH008', name: '西安西北仓', province: '陕西省', city: '西安市', district: '雁塔区', address: '高新路', admins: ['admin1'], status: 'enabled', createTime: '2023-10-10T09:45:00Z' },
      { id: '9', code: 'WH009', name: '沈阳东北仓', province: '辽宁省', city: '沈阳市', district: '浑南新区', address: '奥体中心', admins: ['user5'], status: 'disabled', createTime: '2023-10-12T15:00:00Z' },
      { id: '10', code: 'WH010', name: '南京分拨中心', province: '江苏省', city: '南京市', district: '江宁区', address: '百家湖', admins: ['admin2'], status: 'enabled', createTime: '2023-10-15T08:30:00Z' },
    ];
    localStorage.setItem(STORAGE_KEYS.WAREHOUSE, JSON.stringify(warehouses));
  } else {
    // Migration: Check if English data exists and translate to Chinese
    try {
      const warehouses: Warehouse[] = JSON.parse(existingData);
      let needsMigration = false;
      
      const regionMap: Record<string, string> = {
        'Zhejiang': '浙江省', 'Hangzhou': '杭州市', 'Xihu': '西湖区',
        'Shanghai': '上海市', 'Pudong': '浦东新区',
        'Beijing': '北京市', 'Chaoyang': '朝阳区',
        'Guangdong': '广东省', 'Shenzhen': '深圳市', 'Nanshan': '南山区', 'Guangzhou': '广州市', 'Tianhe': '天河区',
        'Hubei': '湖北省', 'Wuhan': '武汉市', 'Hongshan': '洪山区',
        'Sichuan': '四川省', 'Chengdu': '成都市', 'Wuhou': '武侯区',
        'Shaanxi': '陕西省', 'Xi\'an': '西安市', 'Yanta': '雁塔区',
        'Liaoning': '辽宁省', 'Shenyang': '沈阳市', 'Hunnan': '浑南区',
        'Jiangsu': '江苏省', 'Nanjing': '南京市', 'Jiangning': '江宁区'
      };

      const translated = warehouses.map(w => {
        let changed = false;
        const newW = { ...w };
        if (regionMap[w.province]) { newW.province = regionMap[w.province]; changed = true; }
        if (regionMap[w.city]) { newW.city = regionMap[w.city]; changed = true; }
        if (regionMap[w.district]) { newW.district = regionMap[w.district]; changed = true; }
        if (changed) needsMigration = true;
        return newW;
      });

      if (needsMigration) {
        console.log('Migrating warehouse data to Chinese...');
        localStorage.setItem(STORAGE_KEYS.WAREHOUSE_BACKUP, existingData); // Backup
        localStorage.setItem(STORAGE_KEYS.WAREHOUSE, JSON.stringify(translated));
      }
    } catch (e) {
      console.error('Migration failed:', e);
    }
  }

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

// --- Warehouse Operations ---

let warehouseCache: Warehouse[] | null = null;

export const getWarehouses = async (forceRefresh = false): Promise<Warehouse[]> => {
  if (warehouseCache && !forceRefresh) {
    return warehouseCache;
  }
  await delay(300);
  const data = localStorage.getItem(STORAGE_KEYS.WAREHOUSE);
  const result = data ? JSON.parse(data) : [];
  warehouseCache = result;
  return result;
};

export const getWarehouseNameMap = async (): Promise<Record<string, string>> => {
  const warehouses = await getWarehouses();
  return warehouses.reduce((acc, curr) => {
    acc[curr.code] = curr.name;
    return acc;
  }, {} as Record<string, string>);
};

export const saveWarehouse = async (warehouse: Warehouse): Promise<void> => {
  await delay(300);
  const warehouses = await getWarehouses(true); // Force refresh to get latest from storage if needed (though here we just read storage in getWarehouses implementation usually)
  // Actually getWarehouses implementation reads from storage if cache is null. 
  // But saveWarehouse reads from storage directly in original implementation. 
  // Let's keep original logic but update cache.
  const index = warehouses.findIndex(w => w.id === warehouse.id);
  if (index > -1) {
    warehouses[index] = warehouse;
  } else {
    warehouses.push(warehouse);
  }
  localStorage.setItem(STORAGE_KEYS.WAREHOUSE, JSON.stringify(warehouses));
  warehouseCache = warehouses; // Update cache
};

export const deleteWarehouse = async (id: string): Promise<void> => {
  await delay(300);
  const warehouses = await getWarehouses(true);
  const filtered = warehouses.filter(w => w.id !== id);
  localStorage.setItem(STORAGE_KEYS.WAREHOUSE, JSON.stringify(filtered));
  warehouseCache = filtered; // Update cache
};

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
