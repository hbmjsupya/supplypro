const axios = require('axios');

const BASE_URL = 'http://localhost:8080/api';
let TOKEN = '';

const log = (msg, data = '') => {
    console.log(`[${new Date().toISOString()}] ${msg}`, data ? JSON.stringify(data, null, 2) : '');
};

async function login() {
    try {
        const res = await axios.post(`${BASE_URL}/auth/signin`, {
            username: 'admin',
            password: '123456'
        });
        if (res.data.code === 200) {
            TOKEN = res.data.data.token;
            log('Login successful');
            return true;
        }
        return false;
    } catch (e) {
        log('Login error', e.message);
        return false;
    }
}

async function verifyGeneration() {
    if (!await login()) return;

    try {
        // Fetch dependencies
            log('Fetching warehouses...');
            const whRes = await axios.get(`${BASE_URL}/warehouses`, { headers: { Authorization: `Bearer ${TOKEN}` } });
            const warehouses = whRes.data.data.content || whRes.data.data.records || whRes.data.data;
            if (!warehouses || warehouses.length === 0) {
                throw new Error('No warehouses found. Please create a warehouse first.');
            }
            const warehouseId = warehouses[0].id;
            log(`Using Warehouse ID: ${warehouseId}`);

            log('Fetching suppliers...');
            const supRes = await axios.get(`${BASE_URL}/suppliers`, { headers: { Authorization: `Bearer ${TOKEN}` } });
            const suppliers = supRes.data.data.content || supRes.data.data.records || supRes.data.data;
            if (!suppliers || suppliers.length === 0) {
                throw new Error('No suppliers found. Please create a supplier first.');
            }
            const supplierId = suppliers[0].id;
            log(`Using Supplier ID: ${supplierId}`);

            log('Fetching products...');
            const prodRes = await axios.get(`${BASE_URL}/products`, { headers: { Authorization: `Bearer ${TOKEN}` } });
            const products = prodRes.data.data.content || prodRes.data.data.records || prodRes.data.data;
            if (!products || products.length === 0) {
                throw new Error('No products found. Please create a product first.');
            }
            const productId = products[0].id;
            log(`Using Product ID: ${productId}`);

        const payload = {
            supplierId: supplierId,
            warehouseId: warehouseId,
            type: 'INBOUND',
            items: [{
                productId: productId,
                productName: 'Test Product',
                quantity: 10,
                unitPrice: 100,
                totalPrice: 1000,
                spec: 'Test Spec'
            }],
            status: 'PENDING',
            totalAmount: 1000,
            deliveryDate: '2024-12-31'
        };

        log('Sending payload to /api/inboundPurchaseOrder/generate', payload);

        const res = await axios.post(`${BASE_URL}/inboundPurchaseOrder/generate`, payload, {
            headers: { Authorization: `Bearer ${TOKEN}` }
        });

        if (res.data.code === 200) {
            log('SUCCESS: Inbound Order Generated', res.data.data);
        } else {
            log('FAILURE: Backend returned error', res.data);
        }

    } catch (e) {
        log('FAILURE: Request error', e.response ? e.response.data : e.message);
    }
}

verifyGeneration();
