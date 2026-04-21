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

async function testSalesOrderNullId() {
  if (!await login()) return;

  try {
    log('Testing Sales Order creation with null Product ID...');
    
    const payload = {
      customerName: "Test Customer",
      items: [
        {
          productId: null,
          quantity: 1,
          unitPrice: 100
        }
      ]
    };

    try {
      await axios.post(`${BASE_URL}/sales-orders`, payload, {
          headers: { Authorization: `Bearer ${TOKEN}` }
      });
      log('FAILED: Request should have failed but succeeded!');
    } catch (error) {
      if (error.response) {
        if (error.response.status === 400) {
          log('SUCCESS: Server returned 400 Bad Request as expected.');
          log('Error message:', error.response.data);
        } else {
          log(`FAILED: Server returned status ${error.response.status} instead of 400.`);
          log('Response data:', error.response.data);
        }
      } else {
        log('FAILED: Network error or no response.', error.message);
      }
    }

  } catch (err) {
    log('Unexpected error:', err);
  }
}

testSalesOrderNullId();
