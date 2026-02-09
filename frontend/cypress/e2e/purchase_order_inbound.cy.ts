
describe('Inbound Purchase Order Workflow', () => {
  beforeEach(() => {
    // Mock API responses
    cy.intercept('GET', '/api/suppliers?*', { fixture: 'suppliers.json' }).as('getSuppliers');
    cy.intercept('GET', '/api/warehouses*', { fixture: 'warehouses.json' }).as('getWarehouses');
    cy.intercept('GET', '/api/products?*', { fixture: 'products.json' }).as('getProducts');
    cy.intercept('POST', '/api/purchase-orders', { statusCode: 200, body: { code: 200, message: 'Created' } }).as('createOrder');
    
    // Visit page
    cy.visit('/supply-chain/purchase-order/create-inbound');
  });

  it('should create an inbound purchase order successfully', () => {
    // Verify page loaded
    cy.contains('新建入库采购单').should('be.visible');
    
    // 1. Select Supplier
    // Debug: Check if any select exists
    cy.wait(2000);
    cy.get('body').then(($body) => {
        if ($body.find('.ant-select-selector').length === 0) {
            cy.log('DEBUG: No .ant-select-selector found in body!');
            // Log form item content
            const item = $body.find('.ant-form-item:contains("供应商")');
            cy.log('DEBUG: Form Item HTML:', item.html());
        }
    });

    // Fallback: try to find by input type
    cy.get('input[id="supplierId"]').should('exist'); // This is the hidden input
    
    // Try to click the sibling wrapper of the hidden input
    cy.get('input[id="supplierId"]').parent().click({ force: true });
    
    // Type in the search box (which is inside the selector)
    cy.get('.ant-select-dropdown:not(.ant-select-dropdown-hidden)').should('be.visible');
    cy.focused().type('Test');
    
    cy.wait('@getSuppliers');
    // Select first option
    cy.get('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option-content')
      .first()
      .should('be.visible')
      .click();

    // 2. Select Warehouse
    // Use ID-based selector (Ant Design Form adds id automatically)
    cy.get('input[id="warehouseId"]').should('exist');
    cy.get('input[id="warehouseId"]').parent().click({ force: true });
    
    cy.wait('@getWarehouses');
    // Select the first warehouse option
    cy.get('.ant-select-dropdown:not(.ant-select-dropdown-hidden)').should('be.visible');
    cy.contains('.ant-select-item-option-content', 'Test Warehouse').click();
    
    // Check address auto-fill (assuming mock data has address)
    cy.get('#detailAddress').should('have.value', 'Test Address');
    
    // 3. Add Product
    cy.contains('选择商品').click();
    cy.wait('@getProducts');
    cy.get('.ant-modal-body').should('be.visible');
    // Select first row checkbox
    cy.get('.ant-modal-body .ant-table-row').first().find('.ant-checkbox-input').check();
    cy.contains('确 定').click();

    // 4. Verify Items Table
    // Wait for modal to close
    cy.get('.ant-modal-content').should('not.exist');
    // Check table in the main page container
    // Use .ant-table-row to avoid counting header/measure rows
    cy.get('.page-container .ant-table-tbody').find('tr.ant-table-row').should('have.length', 1);
    
    // 5. Submit
    cy.contains('提交入库采购单').click();
    cy.wait('@createOrder');
    cy.url().should('include', '/supply-chain/purchase-order');
  });

  it('should validate form fields', () => {
    cy.contains('提交入库采购单').click();
    cy.contains('请选择供应商').should('be.visible');
    cy.contains('请选择入库仓库').should('be.visible');
    
    // Fill required fields
    cy.get('input[id="supplierId"]').parent().click({ force: true });
    cy.wait(500);
    cy.get('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option-content')
      .first()
      .click();

    cy.get('input[id="warehouseId"]').parent().click({ force: true });
    cy.wait(500);
    cy.get('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option-content')
      .contains('Test Warehouse')
      .click();
    
    cy.contains('提交入库采购单').click();
    cy.contains('请至少选择一个商品').should('be.visible');
  });
});
