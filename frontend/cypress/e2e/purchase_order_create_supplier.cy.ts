/// <reference types="cypress" />

describe('Purchase Order Create - Supplier Auto-fill', () => {
  beforeEach(() => {
    // Mock Login
    cy.intercept('POST', '/api/auth/login', {
      statusCode: 200,
      body: { token: 'mock-token', user: { id: 1, username: 'testuser' } }
    }).as('login');

    // Mock Products List with 5 items
    // 3 with default supplier, 2 without
    const mockProducts = [
      { id: 1, name: 'Product 1', skuCode: 'SKU001', defaultSupplierId: 101, defaultSupplierName: 'Supplier A' },
      { id: 2, name: 'Product 2', skuCode: 'SKU002', defaultSupplierId: 102, defaultSupplierName: 'Supplier B' },
      { id: 3, name: 'Product 3', skuCode: 'SKU003', defaultSupplierId: null, defaultSupplierName: null },
      { id: 4, name: 'Product 4', skuCode: 'SKU004', defaultSupplierId: 103, defaultSupplierName: 'Supplier C' },
      { id: 5, name: 'Product 5', skuCode: 'SKU005', defaultSupplierId: null, defaultSupplierName: null },
    ];

    cy.intercept('GET', '/api/products*', {
      statusCode: 200,
      body: {
        code: 200,
        data: {
            records: mockProducts,
            total: 5
        }
      }
    }).as('getProducts');

    // Mock Suppliers for selection (if needed)
    cy.intercept('GET', '/api/suppliers*', {
        statusCode: 200,
        body: {
            code: 200,
            data: {
                records: [
                    { id: 101, name: 'Supplier A' },
                    { id: 102, name: 'Supplier B' },
                    { id: 103, name: 'Supplier C' }
                ]
            }
        }
    }).as('getSuppliers');

    // Mock User Info
    cy.intercept('GET', '/api/users/me', {
        statusCode: 200,
        body: { id: 1, username: 'testuser' }
    });

    // Visit Create Page
    // Assuming we have a way to bypass login or we just simulate the component
    // But for e2e, we need to visit the page.
    // Let's assume we are logged in.
    cy.visit('/supply-chain/purchase-order/create');
  });

  it('should auto-fill default supplier for products that have one', () => {
    // 1. Click "Add Product" button
    cy.contains('添加商品').click();

    // 2. Select all 5 products in the modal
    // Assuming the modal lists products and has checkboxes
    // We might need to adjust selectors based on actual UI
    cy.wait('@getProducts');
    
    // Select products (mocking selection behavior)
    // This part depends heavily on the ProductSelector component implementation
    // Assuming it's a Table with rowSelection
    cy.get('.ant-modal-body .ant-table-row').should('have.length', 5);
    
    // Select all rows
    cy.get('.ant-modal-body .ant-table-header .ant-checkbox').click(); 
    
    // Click OK to confirm selection
    cy.contains('确 定').click();

    // 3. Verify the "Items" table in the main form
    // The table should have 5 rows
    cy.get('.ant-form-item-control-input-content .ant-table-tbody .ant-table-row').should('have.length', 5);

    // 4. Check Supplier column for each row
    // We need to know the column index or class for Supplier
    // Let's assume it's a Select component inside the cell
    
    // Row 1: Product 1 (Supplier A)
    cy.get('.ant-table-row').eq(0).find('.ant-select-selection-item').should('contain', 'Supplier A');
    
    // Row 2: Product 2 (Supplier B)
    cy.get('.ant-table-row').eq(1).find('.ant-select-selection-item').should('contain', 'Supplier B');
    
    // Row 3: Product 3 (No Supplier) - Should be empty
    cy.get('.ant-table-row').eq(2).find('.ant-select-selector').should('be.empty'); // Or check for placeholder
    
    // Row 4: Product 4 (Supplier C)
    cy.get('.ant-table-row').eq(3).find('.ant-select-selection-item').should('contain', 'Supplier C');
    
    // Row 5: Product 5 (No Supplier)
    cy.get('.ant-table-row').eq(4).find('.ant-select-selector').should('be.empty');

    // 5. Verify no errors
    cy.get('.ant-alert-error').should('not.exist');
  });
});
