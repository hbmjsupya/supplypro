const axios = require('axios');

const BASE_URL = 'http://localhost:8080/api';
const USERNAME = 'admin';
const PASSWORD = '123456';

async function reproduce() {
    try {
        // 1. Login
        console.log('Logging in...');
        const loginRes = await axios.post(`${BASE_URL}/auth/signin`, {
            username: USERNAME,
            password: PASSWORD
        });
        const TOKEN = loginRes.data.data.token;
        console.log('Login successful');

        // 2. Get Prerequisites (Warehouse, Supplier, Product)
        console.log('Fetching prerequisites...');
        
        // Warehouse
        const whRes = await axios.get(`${BASE_URL}/warehouses`, {
            headers: { Authorization: `Bearer ${TOKEN}` }
        });
        const warehouses = whRes.data.data.records || whRes.data.data;
        const warehouse = Array.isArray(warehouses) ? warehouses[0] : null;
        
        if (!warehouse) {
            console.log('Warehouses response:', JSON.stringify(whRes.data, null, 2));
            throw new Error("No warehouse found");
        }
        console.log(`Using Warehouse: ${warehouse.name} (${warehouse.id})`);

        // Supplier
        const supRes = await axios.get(`${BASE_URL}/suppliers`, {
            headers: { Authorization: `Bearer ${TOKEN}` }
        });
        console.log('Suppliers response:', JSON.stringify(supRes.data, null, 2));
        const suppliers = supRes.data.data.records || supRes.data.data.content || supRes.data.data || [];
        let supplier = Array.isArray(suppliers) ? suppliers[0] : null;
        if (!supplier) {
              console.log("No supplier found, creating a new one...");
              try {
                  const newSup = {
                      name: `Test Supplier ${Date.now()}`,
                      contactPerson: "Test Contact",
                      contactPhone: "13800138000",
                      email: "test@example.com",
                      address: "Test Address",
                      status: "ACTIVE",
                      settlementType: "CASH",
                      purchaserId: 1 // Assuming ID 1 exists
                  };
                  const createSupRes = await axios.post(`${BASE_URL}/suppliers`, newSup, { headers: { Authorization: `Bearer ${TOKEN}` } });
                  if (createSupRes.data && createSupRes.data.data) {
                      supplier = createSupRes.data.data;
                      console.log(`Created new Supplier: ${supplier.name} (${supplier.id})`);
                  } else {
                      throw new Error("Failed to create supplier");
                  }
              } catch (createErr) {
                  if (createErr.response) {
                      console.log('Error creating supplier:', JSON.stringify(createErr.response.data, null, 2));
                  } else {
                      console.log('Error creating supplier:', createErr.message);
                  }
                  supplier = { id: 1, name: "Fallback Supplier" };
              }
         } else {
             console.log(`Using Supplier: ${supplier.name} (${supplier.id})`);
        }

        // Product
        const prodRes = await axios.get(`${BASE_URL}/products?status=ON_SHELF`, {
            headers: { Authorization: `Bearer ${TOKEN}` }
        });
        const products = prodRes.data.data.content || prodRes.data.data.records || prodRes.data.data || [];
        let product = Array.isArray(products) ? products[0] : null;
        if (!product) {
             // Try to fetch ANY product
             const allProdRes = await axios.get(`${BASE_URL}/products`, { headers: { Authorization: `Bearer ${TOKEN}` } });
             const allProducts = allProdRes.data.data.content || allProdRes.data.data.records || [];
             if (allProducts.length > 0) {
                 product = allProducts[0];
                 console.log(`Using Off-shelf Product: ${product.name} (${product.id})`);
             } else {
                 console.log("No products found, using ID 68 (from previous logs)");
                 product = { id: 68, name: "Fallback Product" };
             }
        } else {
             console.log(`Using Product: ${product.name} (${product.id})`);
        }

        // 3. Construct Payload (Mimicking InboundOrderCreate.tsx)
        const payload = {
            supplier: { id: supplier.id },
            warehouseId: warehouse.id,
            type: 'INBOUND',
            status: 'PENDING_SETTLEMENT',
            items: [
                {
                    productId: product.id, // Fixed: Use valid product ID
                    quantity: 1,
                    unitPrice: 100,
                    totalPrice: 100,
                    // Extra fields that frontend sends
                    productName: product.name,
                    spec: "Standard",
                    key: "temp-key-1"
                }
            ],
            totalAmount: 100,
            contactName: "Test Contact",
            contactPhone: "13800138000",
            province: "Test Province",
            city: "Test City",
            district: "Test District",
            detailAddress: "Test Address",
            isManualAddress: true,
            remark: "Reproduction Script Test"
        };

        console.log('--- Starting Regression Test ---');

        // 4. Negative Test: Null Product ID
        console.log('\n[Negative Test] Sending Payload with Null Product ID...');
        const negativePayload = JSON.parse(JSON.stringify(payload));
        negativePayload.items[0].productId = null;
        try {
            await axios.post(`${BASE_URL}/inboundPurchaseOrder/generate`, negativePayload, {
                headers: { Authorization: `Bearer ${TOKEN}` }
            });
            console.error('FAILURE: Negative test passed (unexpectedly succeeded)');
        } catch (error) {
            if (error.response && error.response.status === 400) {
                console.log('SUCCESS: Negative test failed as expected with 400:', error.response.data);
                if (error.response.data.message && error.response.data.message.includes('Product ID cannot be null')) {
                     console.log('SUCCESS: Error message contains expected text.');
                } else {
                     console.warn('WARNING: Error message might not be specific enough:', error.response.data);
                }
            } else {
                console.error('FAILURE: Negative test failed with unexpected error:', error.message);
            }
        }

        // 5. Regression Test: 50 Success iterations
        console.log('\n[Regression Test] Running 50 successful iterations...');
        let successCount = 0;
        const totalIterations = 50;
        
        for (let i = 0; i < totalIterations; i++) {
             // Create unique payload to avoid "Duplicate" errors if idempotency is strict or unique constraints exist
             // Although idempotency key depends on content, let's vary the remark or something
             const iterPayload = JSON.parse(JSON.stringify(payload));
             iterPayload.remark = `Regression Test Iteration ${i+1}`;
             // Wait a bit to avoid rate limiting if any
             await new Promise(resolve => setTimeout(resolve, 100));

             try {
                await axios.post(`${BASE_URL}/inboundPurchaseOrder/generate`, iterPayload, {
                    headers: { Authorization: `Bearer ${TOKEN}` }
                });
                successCount++;
                process.stdout.write('.'); // Progress indicator
             } catch (error) {
                 console.error(`\nIteration ${i+1} failed:`, error.response ? error.response.data : error.message);
             }
        }
        console.log(`\nRegression Test Completed: ${successCount}/${totalIterations} successful.`);

    } catch (error) {
        if (error.response) {
            console.error('FAILURE: Server responded with:', error.response.status, error.response.data);
        } else {
            console.error('FAILURE:', error.message);
        }
    }
}

reproduce();
