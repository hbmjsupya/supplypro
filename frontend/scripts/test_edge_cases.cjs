const axios = require('axios');

const BASE_URL = 'http://localhost:8080/api';
let TOKEN = '';

async function login() {
  try {
    const res = await axios.post(`${BASE_URL}/auth/signin`, {
      username: 'admin',
      password: '123456'
    });
    console.log('Login successful, response:', JSON.stringify(res.data, null, 2));
    if (res.data.accessToken) {
         TOKEN = res.data.accessToken;
     } else if (res.data.data && res.data.data.accessToken) {
         TOKEN = res.data.data.accessToken;
     } else if (res.data.data && res.data.data.token) {
         TOKEN = res.data.data.token;
     } else if (res.data.token) {
         TOKEN = res.data.token;
     }
    console.log('Token length:', TOKEN ? TOKEN.length : 0);
  } catch (e) {
    console.error('Login failed', e.message);
    process.exit(1);
  }
}

async function testCreatePO(payload, testName) {
  console.log(`\n--- Testing: ${testName} ---`);
  try {
    const res = await axios.post(`${BASE_URL}/purchase-orders`, payload, {
      headers: { Authorization: `Bearer ${TOKEN}` }
    });
    console.log('Success:', res.data);
  } catch (e) {
    console.log('Failed:', e.response ? e.response.data : e.message);
  }
}

async function run() {
  await login();

  // Test 1: Empty items
  await testCreatePO({
    supplier: { id: 32 },
    warehouseId: 27,
    type: 'INBOUND',
    items: [],
    totalAmount: 0
  }, "Empty Items");

  // Test 2: Item with missing productId (but valid quantity/price)
  await testCreatePO({
    supplier: { id: 32 },
    warehouseId: 27,
    type: 'INBOUND',
    items: [
      {
        quantity: 1,
        unitPrice: 100,
        totalPrice: 100
      }
    ],
    totalAmount: 100
  }, "Missing ProductId");

  // Test 3: Item with ID (simulating existing item?)
  await testCreatePO({
    supplier: { id: 32 },
    warehouseId: 27,
    type: 'INBOUND',
    items: [
      {
        id: 99999,
        quantity: 1,
        unitPrice: 100,
        totalPrice: 100,
        productId: 8
      }
    ],
    totalAmount: 100
  }, "Item with ID");

}

run();
