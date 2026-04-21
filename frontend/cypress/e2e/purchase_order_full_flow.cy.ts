describe('Purchase Order Creation Full Flow', () => {
  beforeEach(() => {
    // Login
    cy.login('debuguser3', 'password123');
    
    // Intercepts
    cy.intercept('POST', '/api/inboundPurchaseOrder/generate').as('generateOrder');
    cy.intercept('GET', '/api/warehouses*').as('getWarehouses');
    cy.intercept('GET', '/api/suppliers*').as('getSuppliers');
    cy.intercept('GET', '/api/products*').as('getProducts');

    // Visit page
    cy.visit('/supply-chain/purchase-order/create-inbound');
    cy.wait('@getWarehouses');
  });

  it('should display "--" for missing product fields in modal', () => {
    // Mock Product Response with missing fields
    const mockProducts = {
      content: [
        {
          id: 101,
          name: 'Complete Product',
          skuCode: 'CP001',
          status: 'ON_SHELF',
          categoryName: 'Electronics',
          brandZhName: 'Xiaomi',
          defaultSupplierName: 'Supplier A',
          skus: [{ id: 1001, skuCode: 'CP001-1', name: 'Standard', costPrice: 100 }]
        },
        {
          id: 102,
          name: 'Incomplete Product',
          skuCode: 'IP001',
          status: 'ON_SHELF',
          // Missing category, brand, supplier
          skus: [{ id: 1002, skuCode: 'IP001-1', name: 'Standard', costPrice: 200 }]
        }
      ],
      totalElements: 2,
      totalPages: 1
    };

    cy.intercept('GET', '/api/products*', {
      statusCode: 200,
      body: mockProducts
    }).as('getMockProducts');

    // Open Modal
    cy.contains('button', '选择商品').click({ force: true });
    cy.wait('@getMockProducts');

    // Wait for table
    cy.get('.ant-modal-body .ant-table-row', { timeout: 10000 }).should('have.length', 2);

    // Check first row (Complete)
    cy.get('.ant-modal-body .ant-table-row').eq(0).within(() => {
      cy.contains('Electronics').should('exist');
      cy.contains('Xiaomi').should('exist');
      cy.contains('Supplier A').should('exist');
    });

    // Check second row (Incomplete) - should show "--"
    cy.get('.ant-modal-body .ant-table-row').eq(1).within(() => {
      // Columns: [Checkbox, SKU Code, Name, Spec, Category, Brand, Supplier, Price]
      // Indices: 0, 1, 2, 3, 4, 5, 6, 7
      
      // Category (Index 4)
      cy.get('td').eq(4).should('contain', '--');
      // Brand (Index 5)
      cy.get('td').eq(5).should('contain', '--'); 
      // Supplier (Index 6)
      cy.get('td').eq(6).should('contain', '--');
    });
    
    // Close modal (Click first button usually Cancel)
    cy.get('.ant-modal-footer .ant-btn').first().click({ force: true });
  });

  it('should prevent submission when no product is selected', () => {
    // Select Supplier
    cy.get('input[id="supplierId"]').parent().click({ force: true });
    cy.wait(500);
    cy.get('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').first().click();

    // Select Warehouse
    cy.get('input[id="warehouseId"]').parent().click({ force: true });
    cy.wait(500);
    cy.get('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').first().click();
    
    // Fill Contact to avoid other errors
    cy.get('input[id="contactName"]').clear().type('Test Contact');
    cy.get('input[id="contactPhone"]').clear().type('13800000000');

    // Submit button should be disabled without products
    cy.contains('button', '提交入库采购单').should('be.disabled');
    
    // Check Red Warning Text
    cy.contains('* 请至少选择一件商品').should('be.visible');
  });

  it('should successfully create a purchase order with valid product', () => {
    // 1. Select Supplier
    cy.get('input[id="supplierId"]').parent().click({ force: true });
    cy.wait(500);
    cy.get('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').first().click();

    // 2. Select Warehouse
    cy.get('input[id="warehouseId"]').parent().click({ force: true });
    cy.wait(500);
    cy.get('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').first().click();
    
    // Fill Contact
    cy.get('input[id="contactName"]').clear().type('Test Contact');
    cy.get('input[id="contactPhone"]').clear().type('13800000000');

    // 3. Add Product (Real API)
    cy.contains('button', '选择商品').click({ force: true });
    cy.wait('@getProducts');
    
    // Wait for table and select first
    cy.wait(2000); 
    cy.get('input[type="checkbox"]').first().check({ force: true });
    cy.get('.ant-btn-primary').contains(/确\s*定|OK/).click({ force: true });
    cy.get('.ant-modal-content').should('not.exist');

    // Intercept submission to verify payload
    cy.intercept('POST', '/api/inboundPurchaseOrder/generate', (req) => {
      const items = req.body.items;
      expect(items).to.have.length.greaterThan(0);
      items.forEach((item: { productId: number }) => {
        expect(item.productId).to.be.a('number').and.be.gt(0);
      });
      req.reply({ statusCode: 200, body: { id: 123, orderNo: 'PO123' } });
    }).as('submitOrder');

    // Submit form
    cy.get('button').contains('提交入库采购单').click();

    // Verify submission success
    cy.wait('@submitOrder');
    cy.get('.ant-message-success').should('contain', '入库采购单已创建');
  });
});
