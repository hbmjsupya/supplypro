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

async function verifyValidOrders() {
    if (!await login()) return;

    try {
        // --- 1. Prepare Data ---
        log('Fetching warehouses...');
        const whRes = await axios.get(`${BASE_URL}/warehouses`, { headers: { Authorization: `Bearer ${TOKEN}` } });
        const warehouses = whRes.data.data.content || whRes.data.data.records || whRes.data.data;
        if (!warehouses || warehouses.length === 0) throw new Error('No warehouses found');
        const warehouseId = warehouses[0].id;

        log('Fetching suppliers...');
        const supRes = await axios.get(`${BASE_URL}/suppliers`, { headers: { Authorization: `Bearer ${TOKEN}` } });
        const suppliers = supRes.data.data.content || supRes.data.data.records || supRes.data.data;
        if (!suppliers || suppliers.length === 0) throw new Error('No suppliers found');
        const supplierId = suppliers[0].id;

        log('Fetching products...');
        const prodRes = await axios.get(`${BASE_URL}/products?status=ON_SHELF`, { headers: { Authorization: `Bearer ${TOKEN}` } });
        const products = prodRes.data.data.content || prodRes.data.data.records || prodRes.data.data;
        if (!products || products.length === 0) throw new Error('No ON_SHELF products found');
        const product = products[0];
        const productId = product.id;
        log(`Using Product ID: ${productId} (${product.name})`);

        // --- 2. Test Purchase Order Creation (Valid) ---
        log('--- Testing Valid Purchase Order Creation ---');
        const poPayload = {
            supplierId: supplierId,
            warehouseId: warehouseId,
            type: 'INBOUND',
            items: [{
                productId: productId,
                productName: product.name,
                quantity: 10,
                unitPrice: 100,
                totalPrice: 1000,
                spec: 'Standard'
            }],
            status: 'PENDING',
            totalAmount: 1000,
            deliveryDate: new Date().toISOString().split('T')[0],
            contactName: 'Test User',
            contactPhone: '13800138000'
        };

        try {
            const poRes = await axios.post(`${BASE_URL}/inboundPurchaseOrder/generate`, poPayload, {
                headers: { Authorization: `Bearer ${TOKEN}` }
            });
            if (poRes.data.code === 200) {
                log('SUCCESS: Purchase Order created successfully', poRes.data.data.id);
            } else {
                log('FAILURE: Failed to create valid Purchase Order', poRes.data);
                process.exit(1);
            }
        } catch (e) {
            log('FAILURE: Error creating Purchase Order', e.response ? e.response.data : e.message);
            process.exit(1);
        }

        // --- 3. Test Sales Order Creation (Valid) ---
        log('--- Testing Valid Sales Order Creation ---');
        
        // Fetch Customer
        log('Fetching customers...');
        let customerId;
        try {
            const custRes = await axios.get(`${BASE_URL}/customers`, { headers: { Authorization: `Bearer ${TOKEN}` } });
            const customers = custRes.data.data.content || custRes.data.data.records || custRes.data.data;
            if (customers && customers.length > 0) {
                customerId = customers[0].id;
                log(`Using Customer ID: ${customerId}`);
            } else {
                // Create a customer if none exist
                log('No customers found, creating a new one...');
                try {
                    const newCustomer = {
                        name: `Test Customer ${Date.now()}`,
                        contactPerson: "Test Contact",
                        contactPhone: "13800138000",
                        status: "ACTIVE"
                    };
                    const createRes = await axios.post(`${BASE_URL}/customers`, newCustomer, { headers: { Authorization: `Bearer ${TOKEN}` } });
                    if (createRes.data && createRes.data.data) {
                        customerId = createRes.data.data.id;
                        log(`Created new Customer ID: ${customerId}`);
                    } else {
                        throw new Error("Failed to create customer");
                    }
                } catch (createErr) {
                    log('Error creating customer, using fallback ID 1', createErr.message);
                    customerId = 1;
                }
            }
        } catch (e) {
            log('Error fetching customers, assuming ID 1', e.message);
            customerId = 1;
        }

        const soPayload = {
            customer: { id: customerId }, // Changed from customerName to object with ID
            customerName: "Test Customer",
            warehouseId: warehouseId, // Corrected from warehouse object to ID field
            items: [
                {
                    productId: productId,
                    quantity: 1,
                    unitPrice: 150
                }
            ]
        };

        try {
            const soRes = await axios.post(`${BASE_URL}/sales-orders`, soPayload, {
                headers: { Authorization: `Bearer ${TOKEN}` }
            });
            if (soRes.data.code === 200) {
                log('SUCCESS: Sales Order created successfully', soRes.data.data.id);
            } else {
                log('FAILURE: Failed to create valid Sales Order', soRes.data);
                process.exit(1);
            }
        } catch (e) {
             // Note: If Sales Order API is not fully implemented or mock-based, this might fail differently. 
             // Adjusting expectation based on previous "400" success in negative test.
             // If this fails with 400/500 for other reasons, we need to know.
            log('FAILURE: Error creating Sales Order', e.response ? e.response.data : e.message);
            process.exit(1);
        }

        log('ALL REGRESSION TESTS PASSED');

    } catch (e) {
        log('Unexpected error', e.message);
        process.exit(1);
    }
}

verifyValidOrders();
