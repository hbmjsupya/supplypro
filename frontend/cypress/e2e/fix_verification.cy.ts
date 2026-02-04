/// <reference types="cypress" />

describe('Product Pool Fixes Verification', () => {
  beforeEach(() => {
    // Assuming login works with admin/123456 as per other tests
    cy.visit('/login');
    cy.get('#username').type('admin');
    cy.get('#password').type('123456');
    cy.get('button[type="submit"]').click();
    
    // Wait for login to complete and redirect
    cy.url().should('not.include', '/login');
    
    // Visit the page
    cy.visit('/supply-chain/product-pool/add');
  });

  it('1. Should support 4-level category selection', () => {
    // Mock the category data to ensure we have 4 levels for testing
    // Or rely on the backend data if we trust it's there.
    // Given the requirement "ensure... loads", we should try to use real data first.
    // But to be safe and robust, I'll check if the cascader appears.
    
    cy.get('.ant-cascader-picker').should('be.visible').click();
    
    // Try to select the first option of the first level
    cy.get('.ant-cascader-menu').eq(0).find('.ant-cascader-menu-item').first().click();
    
    // Wait for second level
    cy.get('.ant-cascader-menu').eq(1).should('be.visible');
    cy.get('.ant-cascader-menu').eq(1).find('.ant-cascader-menu-item').first().click();
    
    // Wait for third level
    cy.get('.ant-cascader-menu').eq(2).should('be.visible');
    cy.get('.ant-cascader-menu').eq(2).find('.ant-cascader-menu-item').first().click();
    
    // Wait for fourth level
    cy.get('.ant-cascader-menu').eq(3).should('be.visible');
    cy.get('.ant-cascader-menu').eq(3).find('.ant-cascader-menu-item').first().click();
    
    // Verify selection is displayed in the input
    cy.get('.ant-cascader-picker-label').should('not.be.empty');
  });

  it('2. Should support brand search and filter enabled brands', () => {
    // Check Brand Select exists
    // The label is "品牌", name is "brandId"
    cy.contains('label', '品牌').parent().find('.ant-select').click();
    
    // Type to search
    cy.focused().type('Brand');
    
    // Verify options appear
    cy.get('.ant-select-item-option-content').should('have.length.gt', 0);
    
    // Select the first one
    cy.get('.ant-select-item-option-content').first().click();
    
    // Verify the display value is the name, not ID
    // We expect the selected item in the box to contain "Brand" (or whatever name)
    // and NOT just be a number like "1".
    cy.get('.ant-select-selection-item').invoke('text').should('match', /Brand/i);
  });

  it('3. Should support Tax Classification load, empty state and refresh', () => {
    // Intercept the tax search to test empty state
    cy.intercept('GET', '/api/tax-categories/search*', {
      statusCode: 200,
      body: []
    }).as('getEmptyTax');

    // Trigger search
    cy.contains('label', '税务分类').parent().find('.ant-select').click();
    cy.focused().type('NonExistentTax');
    
    // Wait for intercept
    cy.wait('@getEmptyTax');
    
    // Verify empty state content
    cy.get('.ant-select-dropdown').should('contain', '暂无数据');
    cy.get('.ant-select-dropdown').should('contain', '重新初始化');
    
    // Test Refresh Button in Label
    cy.intercept('POST', '/system/maintenance/reinit-tax', {
      statusCode: 200,
      body: { message: 'Success' }
    }).as('reinitTax');
    
    // Click the refresh button in the label area
    cy.contains('label', '税务分类').find('button').click();
    
    // Verify API call
    cy.wait('@reinitTax');
    cy.get('.ant-message').should('contain', '税务数据已刷新');
  });
});
