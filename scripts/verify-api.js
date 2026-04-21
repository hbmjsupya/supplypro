const http = require('http');

const API_HOST = 'localhost';
const API_PORT = 8080;

function request(options, postData) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        resolve(data);
                    }
                } else {
                    console.error(`Request Failed: Status ${res.statusCode}, Body: ${data}`);
                    reject(new Error(`Status: ${res.statusCode}, Body: ${data}`));
                }
            });
        });

        req.on('error', (e) => {
            reject(e);
        });

        if (postData) {
            req.write(postData);
        }
        req.end();
    });
}

async function verify() {
    console.log('--- Starting API Contract Verification ---');

    try {
        // 1. Login
        console.log('1. Logging in...');
        const loginData = JSON.stringify({ username: 'admin', password: '123456' });
        const loginRes = await request({
            hostname: API_HOST,
            port: API_PORT,
            path: '/api/auth/signin',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': loginData.length
            }
        }, loginData);

        console.log('   Login response:', loginRes);
        const token = (loginRes.data && loginRes.data.token) || loginRes.accessToken || loginRes.token;
        if (!token) throw new Error('Login failed: No token received');
        console.log('   Login successful.');

        // 2. Get Purchase Orders
        console.log('2. Fetching Purchase Orders...');
        const poRes = await request({
            hostname: API_HOST,
            port: API_PORT,
            path: '/api/purchase-orders?page=0&size=10',
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const records = poRes.data && poRes.data.records ? poRes.data.records : [];
        if (records.length === 0) {
            console.warn('   No Purchase Orders found. Skipping Logistics Detail check.');
            return;
        }

        // 3. Find a PO with tracking number
        const poWithTracking = records.find(p => p.trackingNumber);
        if (!poWithTracking) {
             console.warn('   No PO with tracking number found in first page. Skipping Logistics Detail check.');
             return;
        }

        console.log(`3. Verifying Logistics Detail for Tracking No: ${poWithTracking.trackingNumber}`);
        const logisticsRes = await request({
            hostname: API_HOST,
            port: API_PORT,
            path: `/api/purchase-orders/logistics-detail/${poWithTracking.trackingNumber}`,
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = logisticsRes.data;
        if (!data || !data.orders || !Array.isArray(data.orders)) {
             throw new Error('Invalid Logistics Response: Missing orders array');
        }

        const firstOrder = data.orders[0];
        if (!firstOrder) {
            console.warn('   Logistics details returned empty orders list.');
            return;
        }

        // 4. Contract Check
        console.log('4. Checking Required Fields...');
        const requiredFields = ['deliverer', 'delivererPhone', 'plateNumber', 'deliveryMethod'];
        const missing = requiredFields.filter(f => !Object.prototype.hasOwnProperty.call(firstOrder, f));

        if (missing.length > 0) {
             console.error(`   [FAILURE] Missing fields in response: ${missing.join(', ')}`);
             console.error(`   Received keys: ${Object.keys(firstOrder).join(', ')}`);
             process.exit(1);
        }

        console.log('   [SUCCESS] All required fields present.');
        
        // Value check for SelfDelivery
        if (firstOrder.deliveryMethod === 'SelfDelivery') {
             console.log('   Type is SelfDelivery. Checking values...');
             if (!firstOrder.deliverer) console.warn('   [WARNING] Deliverer name is empty/null');
             if (!firstOrder.delivererPhone) console.warn('   [WARNING] Deliverer phone is empty/null');
        }

    } catch (err) {
        console.error('Verification Failed:', err.message);
        process.exit(1);
    }
}

verify();
