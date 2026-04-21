const axios = require('axios');

const BASE_URL = 'http://localhost:8080/api';
const USERNAME = 'admin';
const PASSWORD = '123456';

async function verify() {
    try {
        // 1. Login
        console.log('Logging in...');
        const loginRes = await axios.post(`${BASE_URL}/auth/signin`, {
            username: USERNAME,
            password: PASSWORD
        });
        const TOKEN = loginRes.data.data.token;
        console.log('Login successful');

        // 2. Verify Bank Data
        console.log('Fetching Banks...');
        try {
            const bankRes = await axios.get(`${BASE_URL}/banks`, {
                headers: { Authorization: `Bearer ${TOKEN}` }
            });
            const data = bankRes.data.data;
            const banks = Array.isArray(data) ? data : (data.content || data.records || []);
            console.log(`Found ${banks.length} banks.`);
            if (banks.length > 0) {
                 console.log('First 3 banks:', banks.slice(0, 3).map(b => b.name).join(', '));
            }

            if (banks.length <= 1) {
                console.error('FAIL: Bank data still missing (count <= 1)');
            } else {
                console.log('PASS: Bank data restored.');
            }
        } catch (e) {
            console.error('Error fetching banks:', e.message);
        }

        // 3. Verify Supplier Creation (Fix for GYS Duplicate)
        console.log('Creating new Supplier...');
        const uniqueSuffix = Date.now();
        const payload = {
            name: `Fix Test Supplier ${uniqueSuffix}`,
            contactPerson: "Fix Tester",
            contactPhone: `139${uniqueSuffix.toString().slice(-8)}`, // Ensure unique phone
            email: `fix${uniqueSuffix}@example.com`,
            status: "ACTIVE",
            settlementType: "CASH",
            settlementPeriod: 0
        };

        try {
            const createRes = await axios.post(`${BASE_URL}/suppliers`, payload, {
                headers: { Authorization: `Bearer ${TOKEN}` }
            });
            const newSupplier = createRes.data.data;
            console.log('Supplier created successfully!');
            console.log(`Supplier No: ${newSupplier.supplierNo}`);
            
            if (newSupplier.supplierNo && newSupplier.supplierNo.startsWith('GYS')) {
                console.log('PASS: Supplier No format correct.');
            } else {
                console.warn('WARNING: Supplier No format unexpected:', newSupplier.supplierNo);
            }
        } catch (e) {
            console.error('FAIL: Create Supplier failed:', e.response?.data || e.message);
        }

    } catch (error) {
        console.error('Verification failed:', error.message);
        process.exit(1);
    }
}

verify();
