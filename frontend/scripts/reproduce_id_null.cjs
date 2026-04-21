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

async function verifyNullIdError() {
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

        // Construct Payload with NULL productId
        const payload = {
            supplierId: supplierId,
            warehouseId: warehouseId,
            type: 'INBOUND',
            items: [{
                productId: null, // THIS IS THE TEST CASE
                productName: 'Null Product',
                quantity: 10,
                unitPrice: 100,
                totalPrice: 1000,
                spec: 'Test Spec'
            }],
            status: 'PENDING',
            totalAmount: 1000,
            deliveryDate: '2024-12-31'
        };

        log('Sending payload with null productId...', payload);

        const res = await axios.post(`${BASE_URL}/inboundPurchaseOrder/generate`, payload, {
            headers: { Authorization: `Bearer ${TOKEN}` }
        });

        // Should NOT reach here with 200
        if (res.data.code === 200) {
            log('FAILURE: Backend accepted null productId!', res.data);
            process.exit(1);
        } else {
            log('SUCCESS: Backend returned error as expected', res.data);
        }

    } catch (e) {
        if (e.response) {
            if (e.response.status === 400 || e.response.data.code === 400) {
                log('SUCCESS: Backend returned 400 Bad Request as expected', e.response.data);
            } else {
                log(`FAILURE: Backend returned ${e.response.status}`, e.response.data);
                process.exit(1);
            }
        } else {
            log('FAILURE: Request error', e.message);
            process.exit(1);
        }
    }
}

verifyNullIdError();
