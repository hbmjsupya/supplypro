const axios = require('axios');

const BASE_URL = 'http://localhost:8080/api';
const USERNAME = 'admin';
const PASSWORD = 'password';

async function verifyInboundOrder() {
    console.log('\n--- Verifying Inbound Order Creation ---');

    let token;
    try {
        // 1. Login
        try {
            const res = await axios.post(`${BASE_URL}/auth/signin`, { username: USERNAME, password: 'password' });
            token = res.data.data.token || res.data.data.accessToken;
        } catch (e) {
             const res = await axios.post(`${BASE_URL}/auth/signin`, { username: USERNAME, password: '123456' });
             token = res.data.data.token || res.data.data.accessToken;
        }
        console.log('Login successful.');

        const headers = { Authorization: `Bearer ${token}` };

        // 2. Fetch Warehouse
        const whRes = await axios.get(`${BASE_URL}/warehouses`, { headers });
        const whs = whRes.data.data.content || whRes.data.data.records || [];
        if (whs.length === 0) throw new Error('No warehouses found');
        const warehouseId = whs[0].id;
        console.log(`Using Warehouse: ${whs[0].name} (${warehouseId})`);

        // 3. Fetch Supplier
        const supRes = await axios.get(`${BASE_URL}/suppliers`, { headers });
        const sups = supRes.data.data.content || supRes.data.data.records || [];
        if (sups.length === 0) throw new Error('No suppliers found');
        const supplierId = sups[0].id;
        console.log(`Using Supplier: ${sups[0].name} (${supplierId})`);

        // 4. Fetch Product
        const prodRes = await axios.get(`${BASE_URL}/products`, { headers });
        const prods = prodRes.data.data.content || prodRes.data.data.records || [];
        if (prods.length === 0) throw new Error('No products found');
        const product = prods[0];
        console.log(`Using Product: ${product.name} (ID: ${product.id})`);

        // 5. Create Inbound Order
        const payload = {
            warehouseId: Number(warehouseId),
            supplier: { id: Number(supplierId) },
            type: 'INBOUND',
            status: 'PENDING_SETTLEMENT',
            items: [
                {
                    productId: Number(product.id),
                    productName: product.name,
                    skuCode: product.skuCode || 'TEST-SKU',
                    quantity: 10,
                    unitPrice: 100,
                    totalPrice: 1000
                }
            ],
            totalAmount: 1000,
            remark: `Verification Test ${Date.now()}`
        };

        console.log('Sending payload:', JSON.stringify(payload, null, 2));

        const res = await axios.post(`${BASE_URL}/inboundPurchaseOrder/generate`, payload, { headers });
        console.log('Success! Order created:', res.data.data ? res.data.data.orderNo : 'OK');

    } catch (error) {
        console.error('Test Failed!');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data));
        } else {
            console.error(error.message);
        }
        process.exit(1);
    }
}

verifyInboundOrder();
