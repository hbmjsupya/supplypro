// const fetch = require('node-fetch'); // Native fetch used

const BASE_URL = 'http://localhost:8080/api';
const USERNAME = 'admin';
const PASSWORD = 'password123'; // Try 'password123' or '123456'

async function login() {
    const candidates = ['123456', 'password', 'admin', 'admin123', 'supplypro'];
    for (const pwd of candidates) {
        try {
            const res = await fetch(`${BASE_URL}/auth/signin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: USERNAME, password: pwd })
            });
            if (res.ok) {
                const responseBody = await res.json();
                console.log(`Logged in with password: ${pwd}`);
                // console.log('Login response:', responseBody);
                return responseBody.data?.accessToken || responseBody.data?.token || responseBody.accessToken || responseBody.token;
            }
        } catch (e) {
            console.error('Connection failed', e.message);
            process.exit(1);
        }
    }
    console.error('Failed to login with any common password');
    process.exit(1);
}

async function createSupplier(token) {
    const uniqueId = Date.now();
    const payload = {
        name: `Pressure Supplier ${uniqueId}`,
        supplierNo: `SUP-${uniqueId}`,
        settlementType: 'PERIOD',
        settlementPeriod: 30,
        contactName: 'Test Contact',
        contactPhone: '13800138000',
        status: 'ACTIVE'
    };

    try {
        console.log('Creating new supplier...');
        const res = await fetch(`${BASE_URL}/suppliers`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            const data = await res.json();
            const supplier = data.data || data;
            console.log(`Created supplier: ${supplier.name} (ID: ${supplier.id})`);
            return supplier;
        } else {
            console.error('Failed to create supplier:', await res.text());
        }
    } catch (e) {
        console.error('Error creating supplier:', e.message);
    }
    return null;
}

async function getSupplier(token) {
    try {
        // Try getting ACTIVE suppliers first
        let res = await fetch(`${BASE_URL}/suppliers?status=ACTIVE&page=0&size=1`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.ok) {
            let data = await res.json();
            let records = data.data?.records || data.data?.content || data.records || data.content || [];
            if (records.length > 0) {
                console.log(`Using supplier: ${records[0].name} (ID: ${records[0].id})`);
                return records[0];
            }
        }
        
        // Fallback: Try getting ANY supplier
        res = await fetch(`${BASE_URL}/suppliers?page=0&size=1`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.ok) {
            let data = await res.json();
            let records = data.data?.records || data.data?.content || data.records || data.content || [];
            if (records.length > 0) {
                console.log(`Using fallback supplier: ${records[0].name} (ID: ${records[0].id})`);
                return records[0];
            }
        }
    } catch (e) {
        console.error('Failed to fetch supplier:', e.message);
    }

    // If fetch failed, try to create one
    return await createSupplier(token);
}

async function createWarehouse(token) {
    const uniqueId = Date.now();
    const payload = {
        name: `Pressure Warehouse ${uniqueId}`,
        code: `WH-${uniqueId}`,
        status: 'ACTIVE',
        province: 'TestProv',
        city: 'TestCity',
        district: 'TestDist',
        detailAddress: 'Test Addr'
    };

    try {
        console.log('Creating new warehouse...');
        const res = await fetch(`${BASE_URL}/warehouses`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            const data = await res.json();
            const warehouse = data.data || data;
            console.log(`Created warehouse: ${warehouse.name} (ID: ${warehouse.id})`);
            return warehouse;
        } else {
            console.error('Failed to create warehouse:', await res.text());
        }
    } catch (e) {
        console.error('Error creating warehouse:', e.message);
    }
    return null;
}

async function getWarehouse(token) {
    try {
        const res = await fetch(`${BASE_URL}/warehouses?status=ACTIVE&page=0&size=1`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            let data = await res.json();
            let records = data.data?.records || data.data?.content || data.records || data.content || [];
            if (records.length > 0) {
                console.log(`Using warehouse: ${records[0].name} (ID: ${records[0].id})`);
                return records[0];
            }
        }
    } catch (e) {
        console.error('Failed to fetch warehouse:', e.message);
    }
    
    return await createWarehouse(token);
}

async function createProduct(token) {
    const uniqueId = Date.now();
    const payload = {
        name: `Pressure Product ${uniqueId}`,
        skuCode: `SKU-${uniqueId}`,
        status: 'ON_SHELF', // Use valid status
        type: 'Product', // Assuming standard product
        costPrice: 50.00
    };

    try {
        console.log('Creating new product...');
        const res = await fetch(`${BASE_URL}/products`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            const data = await res.json();
            const product = data.data || data;
            console.log(`Created product: ${product.name} (ID: ${product.id})`);
            return product;
        } else {
            console.error('Failed to create product:', await res.text());
        }
    } catch (e) {
        console.error('Error creating product:', e.message);
    }
    return null;
}

async function getProduct(token) {
    try {
        const res = await fetch(`${BASE_URL}/products?status=ON_SHELF&page=0&size=1`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            let data = await res.json();
            let records = data.data?.records || data.data?.content || data.records || data.content || [];
            if (records.length > 0) {
                console.log(`Using product: ${records[0].name} (ID: ${records[0].id})`);
                return records[0];
            }
        }
    } catch (e) {
        console.error('Failed to fetch product:', e.message);
    }
    
    return await createProduct(token);
}

async function createOrder(token, supplier, warehouse, product, index) {
    const uniqueId = Date.now() + Math.floor(Math.random() * 10000);
    const payload = {
        orderNo: `PO-${uniqueId}-${index}`,
        supplier: { 
            id: supplier.id,
            name: supplier.name,
            supplierNo: supplier.supplierNo // Add supplierNo as it might be required by backend DTO or Entity validation
        },
        warehouseId: warehouse.id,
        type: 'INBOUND',
        status: 'PENDING_SETTLEMENT',
        items: [
            { 
                productId: product.id, 
                quantity: 1, 
                unitPrice: 50.00, 
                totalPrice: 50.00,
                productName: product.name,
                skuCode: product.skuCode || 'SKU-001'
            }
        ],
        totalAmount: 50.00,
        contactName: 'PressureTest',
        contactPhone: '13800138000',
        province: 'TestProv',
        city: 'TestCity',
        district: 'TestDist',
        detailAddress: 'Test Addr',
        isManualAddress: false,
        attachments: '[]',
        remark: `Pressure Test Order ${index}`
    };

    const start = Date.now();
    try {
        const res = await fetch(`${BASE_URL}/purchase-orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        const duration = Date.now() - start;
                if (res.ok) {
                    return { success: true, status: res.status, duration };
                } else {
                    const text = await res.text();
                    console.error(`Request ${index} failed: ${res.status} ${text}`);
                    return { success: false, status: res.status, duration, error: text };
                }
    } catch (e) {
        return { success: false, status: 'error', duration: Date.now() - start, error: e.message };
    }
}

async function run() {
    console.log('Starting Pressure Test...');
    const token = await login();
    if (!token) {
        console.error('Could not get token. Exiting.');
        process.exit(1);
    }
    
    const supplier = await getSupplier(token);
    const warehouse = await getWarehouse(token);
    const product = await getProduct(token);
    
    const TOTAL_REQUESTS = 50;
    const CONCURRENCY = 10;
    
    const results = [];
    
    for (let i = 0; i < TOTAL_REQUESTS; i += CONCURRENCY) {
        const batch = [];
        for (let j = 0; j < CONCURRENCY && (i + j) < TOTAL_REQUESTS; j++) {
            batch.push(createOrder(token, supplier, warehouse, product, i + j));
        }
        const batchResults = await Promise.all(batch);
        results.push(...batchResults);
        console.log(`Processed ${Math.min(i + CONCURRENCY, TOTAL_REQUESTS)}/${TOTAL_REQUESTS} requests`);
    }

    const successCount = results.filter(r => r.success).length;
    const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
    
    console.log('--- Results ---');
    console.log(`Total Requests: ${TOTAL_REQUESTS}`);
    console.log(`Success: ${successCount}`);
    console.log(`Failed: ${TOTAL_REQUESTS - successCount}`);
    console.log(`Avg Duration: ${avgDuration.toFixed(2)} ms`);
    
    if (results.some(r => !r.success)) {
        console.log('Sample Error:', results.find(r => !r.success));
    }
}

run();
