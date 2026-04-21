const axios = require('axios');

const BASE_URL = 'http://localhost:8080/api';
const USERNAME = 'admin';
const PASSWORD = 'password'; // or '123456'

async function checkData() {
    try {
        // Login
        let token;
        try {
            const res = await axios.post(`${BASE_URL}/auth/signin`, { username: USERNAME, password: 'password' });
            token = res.data.data.token || res.data.data.accessToken;
        } catch (e) {
             const res = await axios.post(`${BASE_URL}/auth/signin`, { username: USERNAME, password: '123456' });
             token = res.data.data.token || res.data.data.accessToken;
        }

        const headers = { Authorization: `Bearer ${token}` };

        // Check Warehouses
        const whRes = await axios.get(`${BASE_URL}/warehouses`, { headers });
        const whs = whRes.data.data.content || whRes.data.data.records || [];
        console.log(`Warehouses: ${whs.length}`);

        // Check Suppliers
        const supRes = await axios.get(`${BASE_URL}/suppliers`, { headers });
        const sups = supRes.data.data.content || supRes.data.data.records || [];
        console.log(`Suppliers: ${sups.length}`);

        // Check Products
        const prodRes = await axios.get(`${BASE_URL}/products`, { headers });
        const prods = prodRes.data.data.content || prodRes.data.data.records || [];
        console.log(`Products: ${prods.length}`);
        
        if (prods.length > 0) {
            console.log('Sample Product:', JSON.stringify(prods[0], null, 2));
        }
    } catch (error) {
        console.error('Error:', error.message);
        if (error.response) console.error(error.response.data);
    }
}

checkData();
