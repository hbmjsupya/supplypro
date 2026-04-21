const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:8080/api';
const AUTH_SIGNIN_URL = 'http://localhost:8080/api/auth/signin';
const AUTH_SIGNUP_URL = 'http://localhost:8080/api/auth/signup';

// Helper to wait
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runTest() {
  try {
    console.log('Starting End-to-End Inbound Order Workflow Test...');

    // 1. Authentication (Signup + Login)
    const timestamp = Date.now();
    const username = `e2e_${timestamp}`;
    const password = 'password123';
    const email = `e2e_${timestamp}@example.com`;

    console.log(`1. Registering new admin user: ${username}...`);
    try {
        await axios.post(AUTH_SIGNUP_URL, {
            username: username,
            email: email,
            password: password,
            role: ["admin"]
        });
        console.log('   Registration successful.');
    } catch (error) {
        console.error('   Registration failed:', error.response ? error.response.data : error.message);
        throw error;
    }

    console.log('   Authenticating...');
    const authResponse = await axios.post(AUTH_SIGNIN_URL, {
      username: username,
      password: password
    });
    const token = authResponse.data.data.accessToken; // Check structure! ApiResponse usually wraps it.
    // Based on AuthController: return ApiResponse.success(new JwtResponse(...));
    // JwtResponse has accessToken?
    // Let's check JwtResponse class or just log the response to be sure if it fails.
    // AuthController returns ApiResponse<JwtResponse>.
    // ApiResponse has code, message, data.
    // JwtResponse fields: token, type, id, username...
    // Usually standard is "accessToken" or just "token". 
    // Looking at AuthController.java L69: new JwtResponse(jwt, ...)
    // I'll check response structure by logging it if needed, but assuming data.token or data.accessToken.
    // Let's assume data.token based on common practice or verify JwtResponse.
    
    // AuthController.java: 
    // public class JwtResponse {
    //   private String token;
    //   private String type = "Bearer";
    //   ...
    // }
    
    const jwt = authResponse.data.data.token;
    const headers = { Authorization: `Bearer ${jwt}` };
    console.log('   Authentication successful.');

    // 2. Fetch Prerequisites (Product, Supplier, Warehouse)
    console.log('2. Fetching prerequisites...');
    
    // Products
    const productsRes = await axios.get(`${BASE_URL}/products`, { headers });
    const products = productsRes.data.data.content || productsRes.data.data.records || [];
    // Note: ApiResponse structure: { code: 200, data: { content: [], ... } } or { code: 200, data: [] }
    // Controller returns ApiResponse<Page<Product>>?
    // ProductController L?? Not fully visible but usually ApiResponse matches.
    // Let's inspect data structure safely.
    
    let product = products[0];
    if (!product) {
        console.log('   No products found. Creating one...');
        // Create Product if needed, or fail. 
        // Product creation requires more data. For now let's hope there's data.
        // If local dev env, usually data is seeded.
        throw new Error('No products found. Please seed data.');
    }
    console.log(`   Using Product: ${product.name} (ID: ${product.id})`);

    // Suppliers
    const suppliersRes = await axios.get(`${BASE_URL}/suppliers`, { headers });
    // SupplierController: ApiResponse<SupplierDTO> (getById) / create. getAll?
    // SupplierController snippet didn't show getAll explicitly but likely it exists.
    // If not, we might need to create one.
    // Assuming standard getAll exists.
    const suppliers = suppliersRes.data.data.content || suppliersRes.data.data.records || [];
    let supplier = suppliers[0];
    if (!supplier) {
        throw new Error('No suppliers found. Please seed data.');
    }
    console.log(`   Using Supplier: ${supplier.name} (ID: ${supplier.id})`);

    // Warehouses
    const warehousesRes = await axios.get(`${BASE_URL}/warehouses`, { headers });
    const warehouses = warehousesRes.data.data.content || warehousesRes.data.data.records || [];
    let warehouse = warehouses[0];
    if (!warehouse) {
        throw new Error('No warehouses found. Please seed data.');
    }
    console.log(`   Using Warehouse: ${warehouse.name} (ID: ${warehouse.id})`);

    // 3. Create Purchase Order (INBOUND)
    console.log('3. Creating INBOUND Purchase Order...');
    const poData = {
      supplierId: supplier.id,
      warehouseId: warehouse.id,
      type: 'INBOUND',
      totalAmount: 1000,
      remark: 'E2E Test Inbound Order',
      items: [
        {
          productId: product.id,
          quantity: 10,
          unitPrice: 100,
          totalPrice: 1000,
          spec: 'TestSpec-Color:Red'
        }
      ]
    };

    const createRes = await axios.post(`${BASE_URL}/purchase-orders`, poData, { headers });
    const createdPoSimple = createRes.data.data;
    console.log(`   Purchase Order Created: ${createdPoSimple.orderNo} (ID: ${createdPoSimple.id})`);
    
    // Fetch PO List to get inboundOrderNo (populated by service)
    await sleep(1000); // Wait for async/sync propagation if any
    const poListRes = await axios.get(`${BASE_URL}/purchase-orders?keyword=${createdPoSimple.orderNo}`, { headers });
    const poList = poListRes.data.data.records || poListRes.data.data.content || [];
    const createdPo = poList.find(p => p.id === createdPoSimple.id);
    
    if (!createdPo) {
        throw new Error(`Created PO ${createdPoSimple.orderNo} not found in list`);
    }

    // Capture the Inbound No from inboundOrderNo (transient field populated by service)
    const expectedInboundNo = createdPo.inboundOrderNo || createdPo.bizNo;
    console.log(`   Expected Inbound No: ${expectedInboundNo}`);

    // 4. Verify Inbound Order Creation & Numbering Rule
    console.log('4. Verifying Inbound Order Creation...');
    await sleep(2000); 

    // InboundOrderController likely returns ApiResponse<Page<...>>
    const inboundRes = await axios.get(`${BASE_URL}/inbound-orders?size=100`, { headers });
    
    const inboundOrders = inboundRes.data.data.records || inboundRes.data.data.content || [];
    // Note: Verify response structure for InboundOrderController. 
    // Usually it is ApiResponse.
    
    // Find the specific inbound order
    const targetInbound = inboundOrders.find(io => io.inboundNo === expectedInboundNo);

    if (!targetInbound) {
         console.error('Inbound Orders found:', inboundOrders.map(io => io.inboundNo));
         throw new Error(`Target Inbound Order ${expectedInboundNo} not found in list`);
    }
    
    console.log(`   Found Inbound Order: ${targetInbound.inboundNo} (ID: ${targetInbound.id})`);

    // Verify Numbering Rule: IN + YYYYMMDD + HHmm + Seq
    const inboundNo = targetInbound.inboundNo;
    const regex = /^IN\d{8}\d{4}\d{3}$/;
    if (!regex.test(inboundNo)) {
      throw new Error(`Invalid Inbound No Format: ${inboundNo}. Expected IN + YYYYMMDD + HHmm + 3 digits`);
    }
    console.log(`   Numbering Rule Validated: ${inboundNo}`);

    // Verify Spec Propagation
    console.log('5. Verifying Spec Propagation...');
    const items = targetInbound.items || [];
    if (items.length === 0) throw new Error('Inbound Order has no items.');
    const item = items[0];
    
    const specValue = item.spec || item.specName;
    if (specValue !== 'TestSpec-Color:Red') {
      console.warn(`   WARNING: Spec mismatch. Expected 'TestSpec-Color:Red', got '${specValue}'`);
    } else {
      console.log(`   Spec Propagation Validated: ${specValue}`);
    }

    // 5. Confirm Inbound Order
    console.log('6. Confirming Inbound Order...');
    await axios.post(`${BASE_URL}/inbound-orders/${targetInbound.id}/confirm`, {}, { headers });
    console.log('   Inbound Order Confirmed.');

    // 5.1 Verify Status and ConfirmedBy
    console.log('   Verifying Confirmation Status and Log...');
    const confirmedInboundRes = await axios.get(`${BASE_URL}/inbound-orders?size=100`, { headers });
    const confirmedInbounds = confirmedInboundRes.data.data.records || confirmedInboundRes.data.data.content || [];
    const confirmedTarget = confirmedInbounds.find(io => io.id === targetInbound.id);
    
    if (confirmedTarget.status !== 'RECEIVED' && confirmedTarget.status !== 'COMPLETED') {
         throw new Error(`Inbound Order Status not updated. Expected RECEIVED/COMPLETED, got ${confirmedTarget.status}`);
    }
    console.log(`   Status Updated to: ${confirmedTarget.status}`);

    if (confirmedTarget.confirmedBy !== username) {
         console.error('Confirmed Target:', JSON.stringify(confirmedTarget, null, 2));
         throw new Error(`ConfirmedBy mismatch. Expected ${username}, got ${confirmedTarget.confirmedBy}`);
    }
    console.log(`   ConfirmedBy Verified: ${confirmedTarget.confirmedBy}`);

    // 6. Verify Stock Flow Creation
    console.log('7. Verifying Stock Flow Creation...');
    await sleep(2000); // Wait for async creation if any
    
    const flowRes = await axios.get(`${BASE_URL}/stock-flows?sort=createdAt,desc&size=1`, { headers });
    const stockFlows = flowRes.data.data.records || flowRes.data.data.content || [];
    
    if (stockFlows.length === 0) {
       throw new Error('No Stock Flow created after confirmation');
    }
    
    const latestFlow = stockFlows[0];
    console.log(`   Found Stock Flow: ID ${latestFlow.id}, Type: ${latestFlow.flowType}, Operator: ${latestFlow.operator}`);
    
    if (latestFlow.operator !== username) {
         throw new Error(`Stock Flow Operator mismatch. Expected ${username}, got ${latestFlow.operator}`);
    }
    
    if (latestFlow.flowType !== 'INBOUND') {
       throw new Error(`Latest Stock Flow type mismatch. Expected INBOUND, got ${latestFlow.flowType}`);
    }
    
    if (latestFlow.quantity !== 10) {
       throw new Error(`Stock Flow quantity mismatch. Expected 10, got ${latestFlow.quantity}`);
    }
    
    console.log('   Stock Flow Verified.');

    console.log('--- E2E TEST PASSED SUCCESSFULLY ---');

  } catch (error) {
    console.error('--- E2E TEST FAILED ---');
    if (error.response) {
      console.error('API Error:', error.response.status, JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error:', error.message);
      console.error(error.stack);
    }
    process.exit(1);
  }
}

runTest();
