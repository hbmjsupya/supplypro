const axios = require('axios');

const BASE_URL = 'http://localhost:8080/api';
let TOKEN = '';

// Helper to log with timestamp
const log = (msg, data = '') => {
    console.log(`[${new Date().toISOString()}] ${msg}`, data ? JSON.stringify(data, null, 2) : '');
};

// 1. Login
async function login() {
    try {
        log('Attempting login...');
        const res = await axios.post(`${BASE_URL}/auth/signin`, {
            username: 'admin',
            password: '123456'
        });
        if (res.data.code === 200) {
            TOKEN = res.data.data.token;
            log('Login successful. Token acquired.');
            return true;
        } else {
            log('Login failed', res.data);
            return false;
        }
    } catch (e) {
        log('Login error', e.message);
        return false;
    }
}

// 2. Get Inbound Orders
async function getInboundOrders() {
    try {
        const res = await axios.get(`${BASE_URL}/inbound-orders`, {
            headers: { Authorization: `Bearer ${TOKEN}` }
        });
        // Handle wrapped response structure
        const data = res.data.data ? res.data.data : res.data;
        const records = data.records || [];
        log(`Fetched ${records.length} inbound orders.`);
        return records;
    } catch (e) {
        log('Get Inbound Orders error', e.message);
        return [];
    }
}

// 3. Create Purchase Order (Inbound)
async function createInboundPO() {
    try {
        // Need a valid supplier and warehouse first. 
        // For this script, we assume some exist or we'll fail.
        // Let's try to fetch warehouses first
        const whRes = await axios.get(`${BASE_URL}/warehouses`, {
            headers: { Authorization: `Bearer ${TOKEN}` }
        });
        log('Warehouses response:', whRes.data);
        const warehouses = whRes.data.data ? (whRes.data.data.records || whRes.data.data.content || whRes.data.data) : (whRes.data.records || whRes.data);
        
        if (!warehouses || warehouses.length === 0) {
            log('No warehouses found. Cannot create PO.');
            return null;
        }
        const warehouseId = warehouses[0].id;

        // Fetch suppliers
        const supRes = await axios.get(`${BASE_URL}/suppliers`, {
             headers: { Authorization: `Bearer ${TOKEN}` }
        });
        log('Suppliers response:', supRes.data);
        const suppliers = supRes.data.data ? (supRes.data.data.records || supRes.data.data.content || supRes.data.data) : (supRes.data.records || supRes.data);
        
        if (!suppliers || suppliers.length === 0) {
             log('No suppliers found. Cannot create PO.');
             return null;
        }
        const supplierId = suppliers[0].id;

        // Fetch products
        const prodRes = await axios.get(`${BASE_URL}/products`, {
             headers: { Authorization: `Bearer ${TOKEN}` }
        });
        log('Products response:', prodRes.data);
        const products = prodRes.data.data ? (prodRes.data.data.records || prodRes.data.data.content || prodRes.data.data) : (prodRes.data.records || prodRes.data);
        
        if (!products || products.length === 0) {
             log('No products found. Cannot create PO.');
             return null;
        }
        const productId = products[0].id;
        const productName = products[0].name;

        const payload = {
            supplier: { id: supplierId },
            warehouseId: warehouseId,
            type: 'INBOUND',
            items: [
                {
                    productId: productId,
                    productName: productName,
                    quantity: 10,
                    unitPrice: 100,
                    totalPrice: 1000
                }
            ],
            totalAmount: 1000
        };

        log('Creating Purchase Order...', payload);
        const res = await axios.post(`${BASE_URL}/purchase-orders`, payload, {
            headers: { Authorization: `Bearer ${TOKEN}` }
        });
        
        if (res.data.code === 200) {
            log('Purchase Order created successfully.', res.data.data);
            return res.data.data;
        } else {
            log('Create PO failed', res.data);
            return null;
        }
    } catch (e) {
        log('Create PO error', e.response ? e.response.data : e.message);
        return null;
    }
}

// Main Flow
async function run() {
    log('Starting Inbound Flow Verification...');
    
    if (!await login()) return;

    const initialOrders = await getInboundOrders();
    const initialCount = initialOrders.length;

    const newPO = await createInboundPO();
    if (!newPO) {
        log('Failed to create PO. Aborting.');
        return;
    }

    // Wait a bit for async processing if any (though backend seems synchronous)
    await new Promise(r => setTimeout(r, 1000));

    const updatedOrders = await getInboundOrders();
    const newCount = updatedOrders.length;

    if (newCount === initialCount + 1) {
        log('SUCCESS: Inbound Order count increased by 1.');
        const createdOrder = updatedOrders.find(o => o.poNo === newPO.orderNo || (o.purchaseOrder && o.purchaseOrder.orderNo === newPO.orderNo));
        if (createdOrder) {
            log('SUCCESS: Found the newly created Inbound Order.', createdOrder);
            
            // Verify status
            if (createdOrder.status === 'PENDING') {
                log('SUCCESS: Status is PENDING as expected.');
            } else {
                 log(`WARNING: Status is ${createdOrder.status}, expected PENDING.`);
            }

        } else {
             // Fallback check: maybe backend doesn't return nested PO object in list view?
             // Let's look at the last one
             log('Checking last order...');
             const lastOrder = updatedOrders[0]; // Assuming desc order or check sort
             log('Last order:', lastOrder);
        }
    } else {
        log(`FAILURE: Inbound Order count mismatch. Expected ${initialCount + 1}, got ${newCount}.`);
    }
}

run();
