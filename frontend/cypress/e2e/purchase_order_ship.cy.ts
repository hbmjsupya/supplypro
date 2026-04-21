
describe('Purchase Order Ship Functionality', () => {
  const mockPO = {
    id: 123,
    orderNo: 'PO1234567890',
    status: 'CONFIRMED',
    items: [
      { skuId: 1, productId: 1, productName: 'Test Product', quantity: 10, unitPrice: 100, specName: 'Standard' }
    ],
    supplierId: 1,
    supplierName: 'Test Supplier',
    warehouseId: 1,
    warehouseName: 'Test Warehouse',
    totalAmount: 1000,
    createTime: '2023-10-27 10:00:00',
    receiver: 'Test Receiver',
    phone: '13800138000',
    address: 'Test Address'
  };

  beforeEach(() => {
    // Mock the purchase order data with proper wrapper
    const mockPO = {
        code: 200,
        message: 'Success',
        data: {
            id: 2,
            orderNo: 'PO1234567890',
            supplierName: 'Test Supplier',
            warehouseId: 1,
            warehouseName: 'Test Warehouse',
            status: 'CONFIRMED',
            createTime: '2023-10-27 10:00:00',
            purchaser: 'Test User',
            receiver: 'Test Receiver',
            phone: '13800138000',
            address: 'Test Address',
            expectTime: '2023-10-30',
            remarks: 'Test Remark',
            items: [
                {
                    id: 1,
                    skuId: 101,
                    productName: 'Test Product',
                    skuCode: 'SKU001',
                    spec: 'Spec A',
                    quantity: 100,
                    unitPrice: 10.00,
                    totalPrice: 1000.00
                }
            ],
            totalAmount: 1000.00
        }
    };

    // Intercept API calls
    cy.intercept('GET', '/api/purchase-orders/*', {
      statusCode: 200,
      body: mockPO
    }).as('getPO');

    cy.intercept('POST', '/api/purchase-orders/*/ship', {
      statusCode: 200,
      body: { code: 200, message: 'Success', data: true }
    }).as('shipPO');

    // Mock logistics tracks to prevent 404s
    cy.intercept('GET', '/api/logistics/tracks/*', {
        statusCode: 200,
        body: { code: 200, message: 'Success', data: [] }
    }).as('getTracks');

    // Visit the page with mocked auth
    cy.visit('/supply-chain/purchase-order/detail/2', {
        onBeforeLoad: (win) => {
            win.localStorage.setItem('token', 'mock-jwt-token');
            win.localStorage.setItem('user', JSON.stringify({ username: 'admin', role: 'ADMIN' }));
        }
    });
    
    // Wait for data to load
    cy.wait('@getPO');
  });

  it('should allow shipping an order', () => {
    // Wait for page load
    cy.wait('@getPO');
    
    // Verify page title to ensure app loaded
    cy.contains('采购单详情').should('be.visible');

    // Verify basic info is rendered
    cy.contains('PO1234567890').should('be.visible');
    
    // Verify item is rendered
    // Use a longer timeout or check for table row existence first
    cy.get('.ant-table-row').should('exist');
    cy.contains('Test Product').should('be.visible');

    // Wait for any loading spinners to disappear
    cy.get('.ant-spin-spinning').should('not.exist');
    
    // Ensure the row is stable by checking for text that shouldn't change
    cy.contains('Test Product').should('be.visible');
    
    // Wait for button to be available and UI to settle
    cy.wait(1000);
    cy.get('[data-testid="ship-button"]').should('be.visible').click();
    
    // Verify modal opens
    cy.get('.ant-modal-title').contains('订单发货').should('be.visible');

    // Click Ship button with retry/stability check
    cy.contains('订单发货').should('be.visible').click({ force: true });

    // Check modal and wait for animation
    cy.get('.ant-modal-content', { timeout: 10000 }).should('be.visible');
    cy.get('.ant-modal-title').contains('订单发货').should('be.visible');
    
    // Fill form
    // Default is Logistics
    // Use hidden input parent click for Select
    cy.get('input[id="shipCompany"]').parent().should('be.visible').click();
    // Wait for dropdown
    cy.get('.ant-select-dropdown').should('be.visible');
    cy.contains('.ant-select-item-option-content', '顺丰速运').should('be.visible').click();
    
    cy.get('input[id="shipNo"]').should('be.visible').type('SF1234567890');
    
    // Submit
    cy.contains('button', '确 定').should('be.visible').click();

    // Verify API call
    cy.wait('@shipPO').then((interception) => {
      expect(interception.request.body).to.have.property('shipCompany', 'SF'); // SF is the value for 顺丰速运
      expect(interception.request.body).to.have.property('shipNo', 'SF1234567890');
    });

    // Verify success message
    cy.contains('订单发货成功').should('be.visible');

    // Verify Inbound Order creation in localStorage
    cy.window().then((win) => {
      const inboundOrders = JSON.parse(win.localStorage.getItem('sc_inbound_orders_v2') || '[]');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const createdOrder = inboundOrders.find((o: any) => o.poNo === mockPO.orderNo);
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      expect(createdOrder).to.not.be.undefined;
      expect(createdOrder.status).to.equal('pending');
      expect(createdOrder.items).to.have.length(1);
    });
  });
});
