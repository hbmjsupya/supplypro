const axios = require('axios');

const BASE_URL = 'http://localhost:8080/api';

async function verifyOrders() {
    try {
        // Login
        const loginRes = await axios.post(`${BASE_URL}/auth/signin`, {
            username: 'admin',
            password: '123456'
        });
        const token = loginRes.data.data.token;
        const headers = { Authorization: `Bearer ${token}` };

        // Get Purchase Orders
        console.log('Fetching Purchase Orders...');
        const res = await axios.get(`${BASE_URL}/purchase-orders?page=0&size=5`, { headers });
        
        const orders = res.data.data.content || res.data.data.records;
        console.log(`Total Orders: ${res.data.data.totalElements || res.data.data.total}`);
        
        if (orders.length > 0) {
            console.log('Top Order:', JSON.stringify(orders[0], null, 2));
            
            // Check Sort Order (assuming ID is sequential)
            const ids = orders.map(o => o.id);
            console.log('IDs in page 0:', ids);
            const isSorted = ids.every((val, i, arr) => !i || (arr[i-1] >= val));
            console.log('Is Sorted Descending:', isSorted);
            
            // Check Spec Field
            const firstItem = orders[0].items[0];
            console.log('First Item Spec:', firstItem.spec);
            console.log('First Item SpecName:', firstItem.specName);
        } else {
            console.log('No orders found.');
        }

    } catch (e) {
        console.error('Error:', e.message);
        if (e.response) console.error(e.response.data);
    }
}

verifyOrders();
