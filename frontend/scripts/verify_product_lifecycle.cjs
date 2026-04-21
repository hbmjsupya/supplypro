const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:8080/api';
const USERNAME = 'admin';
const PASSWORD = '123456'; // Updated password

let TOKEN = '';
let CREATED_PRODUCT_ID = null;

// Helper: Login
async function login() {
    console.log('Logging in...');
    try {
        const response = await axios.post(`${BASE_URL}/auth/signin`, {
            username: USERNAME,
            password: PASSWORD
        });
        // Check both possible locations for token
        TOKEN = response.data.data.token || response.data.data.accessToken;
        if (!TOKEN) {
             console.error('Login successful but no token found in response:', JSON.stringify(response.data));
             process.exit(1);
        }
        console.log('Login successful. Token acquired.');
    } catch (error) {
        console.error('Login failed:', error.message);
        process.exit(1);
    }
}

// Helper: Create Product
async function createProduct() {
    console.log('\n--- Test: Create Product ---');
    // 3. Fetch valid Supplier
    let validSupplierId = null;
    try {
        const supRes = await axios.get(`${BASE_URL}/suppliers?status=ACTIVE`, {
             headers: { Authorization: `Bearer ${TOKEN}` }
        });
        const suppliers = supRes.data.data.content || supRes.data.data.records || [];
        if (suppliers.length > 0) {
            validSupplierId = suppliers[0].id;
            console.log(`Using Supplier: ${suppliers[0].name} (${validSupplierId})`);
        }
    } catch (e) {
        console.log('Failed to fetch suppliers');
    }

    const payload = {
        name: `Test Product ${Date.now()}`,
        skuCode: `SPU-${Date.now()}`,
        brandId: 1, // Will be overwritten
        categoryCode: 'C01', // Will be overwritten
        spec: 'Standard',
        costPrice: 100.00,
        status: 'ON_SHELF',
        defaultSupplierId: validSupplierId || 1, // Use fetched or fallback
        taxClass: 'Standard Rate',
        taxRate: 0.13,
        taxCode: 'T01',
        skus: [
            {
                skuCode: `SKU-${Date.now()}`,
                name: 'Standard Spec',
                costPrice: 100.00,
                quantity: 999
            }
        ]
    };

    try {
        // 1. Fetch valid Brand
        const brandRes = await axios.get(`${BASE_URL}/brands`, {
            headers: { Authorization: `Bearer ${TOKEN}` }
        });
        const brands = brandRes.data.data.content || brandRes.data.data.records || [];
        const validBrand = brands.find(b => b.status === 'ENABLED') || brands[0];
        if (!validBrand) {
             throw new Error("No enabled brand found");
        }
        console.log(`Using Brand: ${validBrand.name} (${validBrand.id})`);

        // 2. Fetch valid Category
         let categoryCode = 'C01'; // Default fallback
         try {
              const catListRes = await axios.get(`${BASE_URL}/product-categories`, {
                 headers: { Authorization: `Bearer ${TOKEN}` }
              });
              const categories = catListRes.data.data || [];
              if (categories.length > 0) {
                  categoryCode = categories[0].categoryId || categories[0].categoryCode || 'C01';
                  console.log(`Using Category: ${categories[0].categoryName} (${categoryCode})`);
              }
         } catch (e) {
             console.log('Failed to fetch categories, using default C01');
         }
 
         const response = await axios.post(`${BASE_URL}/products`, {
            ...payload,
            brandId: validBrand.id,
            categoryCode: categoryCode
         }, {
             headers: { Authorization: `Bearer ${TOKEN}` }
         });
        console.log('Product created successfully.');
        console.log('Response:', response.data.code, response.data.message);
        CREATED_PRODUCT_ID = response.data.data.id;
        const generatedSkuCode = response.data.data.skuCode;
        console.log(`Generated Product ID: ${CREATED_PRODUCT_ID}`);
        console.log(`Generated SKU Code: ${generatedSkuCode}`);
        
        if (!generatedSkuCode) {
            console.error('FAILURE: SKU Code was not generated!');
            process.exit(1);
        }
    } catch (error) {
        console.error('Create Product failed!');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data));
            console.error('Headers:', JSON.stringify(error.response.headers));
        } else {
            console.error('Message:', error.message);
        }
        process.exit(1);
    }
}

// Helper: Update Product
async function updateProduct() {
    console.log('\n--- Test: Update Product ---');
    if (!CREATED_PRODUCT_ID) {
        console.error('Skipping Update: No Product ID');
        return;
    }

    const payload = {
        id: CREATED_PRODUCT_ID,
        name: `Updated Product Name ${Date.now()}`,
        brandId: 1,
        costPrice: 150.00,
        taxRate: 0.13
    };

    try {
        const response = await axios.put(`${BASE_URL}/products/${CREATED_PRODUCT_ID}`, payload, {
            headers: { Authorization: `Bearer ${TOKEN}` }
        });
        console.log('Product updated successfully.');
        console.log('Response:', response.data.code, response.data.message);
    } catch (error) {
        console.error('Update Product failed:', error.response ? error.response.data : error.message);
        process.exit(1);
    }
}

// Helper: Delete Product
async function deleteProduct() {
    console.log('\n--- Test: Delete Product ---');
    if (!CREATED_PRODUCT_ID) {
        console.error('Skipping Delete: No Product ID');
        return;
    }

    try {
        const response = await axios.delete(`${BASE_URL}/products/${CREATED_PRODUCT_ID}`, {
            headers: { Authorization: `Bearer ${TOKEN}` }
        });
        console.log('Product deleted successfully.');
        console.log('Response:', response.status); // Usually 200 or 204
    } catch (error) {
        console.error('Delete Product failed:', error.response ? error.response.data : error.message);
        process.exit(1);
    }
}

// Main Execution Flow
async function main() {
    await login();
    await createProduct();
    await updateProduct();
    await deleteProduct();
    console.log('\n--- All Product Lifecycle Tests Passed ---');
}

main();
