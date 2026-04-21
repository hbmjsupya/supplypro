describe('Product ID Null Validation Fix', () => {
  beforeEach(() => {
    // 1. Login with valid credentials (using the debuguser created earlier)
    cy.login('debuguser3', 'password123');
    
    // 2. Intercept the Inbound Order Generation API to verify payload
    // We use a regex to match the endpoint
    cy.intercept('POST', '/api/inboundPurchaseOrder/generate').as('generateOrder');
    
    // 3. Intercept data loading APIs to ensure page is ready
    cy.intercept('GET', '/api/warehouses*').as('getWarehouses');
    cy.intercept('GET', '/api/suppliers*').as('getSuppliers');
    cy.intercept('GET', '/api/products*').as('getProducts');
    
    // 4. Visit the Inbound Order Creation Page
    cy.visit('/supply-chain/purchase-order/create-inbound');
  });

  it('should send a valid productId in the payload and receive 200 OK', () => {
    // Wait for initial data to load
    cy.wait('@getWarehouses');
    
    // --- Step 1: Select Supplier ---
    // Click the Supplier Select
    cy.get('input[id="supplierId"]').parent().click({ force: true });
    // Wait for dropdown animation
    cy.wait(500);
    // Select the first available supplier
    cy.get('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option')
      .first()
      .click();

    // --- Step 2: Select Warehouse ---
    cy.get('input[id="warehouseId"]').parent().click({ force: true });
    cy.wait(500);
    // Select the first available warehouse (should be ID 27 or similar)
    cy.get('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option')
      .first()
      .click();

    // --- Step 3: Add Product ---
    cy.log('Attempting to open Product Modal');
    cy.contains('button', '选择商品').should('be.visible').and('not.be.disabled').click({ force: true });
    
    // Wait for API call
    cy.wait('@getProducts').then((interception) => {
        cy.log('Products API Status:', interception.response?.statusCode);
        expect(interception.response?.statusCode).to.eq(200);
    });

    // Wait for table data to load (blindly wait for checkbox)
    cy.wait(2000); 
    cy.get('input[type="checkbox"]').first().check({ force: true });
      
    // Confirm selection (find the primary button in a modal-like container or just globally if unique)
    // The modal footer button usually has '确 定' or 'OK'
    cy.get('.ant-btn-primary').contains(/确\s*定|OK/).click({ force: true });
    
    // Verify modal is closed
    cy.wait(1000);
    cy.get('.ant-modal-content').should('not.exist');
    
    // Verify item is added to the table
    cy.get('.page-container .ant-table-tbody tr.ant-table-row').should('have.length.at.least', 1);

    // --- Step 4.1: Fill Required Fields (Contact) ---
    // Warehouse might not have manager, so fill manually to pass validation
    cy.get('input[id="contactName"]').clear().type('Test Contact');
    cy.get('input[id="contactPhone"]').clear().type('13800000000');

    // --- Step 4: Submit Order ---
    cy.contains('button', '提交入库采购单').click();

    // --- Step 5: Verify Request Payload & Response ---
    cy.wait('@generateOrder').then((interception) => {
      // 5.1 Verify Request Payload
      const requestBody = interception.request.body;
      cy.log('Request Payload:', JSON.stringify(requestBody));
      
      expect(requestBody).to.have.property('items');
      expect(requestBody.items).to.be.an('array');
      expect(requestBody.items.length).to.be.greaterThan(0);
      
      const firstItem = requestBody.items[0];
      // CRITICAL ASSERTION: productId must not be null/undefined
      expect(firstItem).to.have.property('productId');
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      expect(firstItem.productId).to.not.be.null;
      expect(firstItem.productId).to.be.a('number');
      
      // 5.2 Verify Response Status (Proves Backend Fix)
      // If the backend fix works, this should be 200 or 201.
      // If the backend fix fails, this would be 400 or 500.
      expect(interception.response?.statusCode).to.eq(200);
    });

    // Verify success message and redirection
    cy.contains('入库采购单已创建').should('be.visible');
    cy.url().should('include', '/supply-chain/purchase-order');
  });
});
