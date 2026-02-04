describe('Product Detail Page Data Loading', () => {
  beforeEach(() => {
    // Login first
    cy.login('admin', '123456');
    cy.visit('/product/add');
  });

  it('should load categories, brands, and tax options', () => {
    // Intercept API calls
    cy.intercept('GET', '/api/categories*', { fixture: 'categories.json' }).as('getCategories');
    cy.intercept('GET', '/api/brands*', { fixture: 'brands.json' }).as('getBrands');
    cy.intercept('GET', '/api/tax-classifications/search*', { fixture: 'tax.json' }).as('getTax');

    // Check Category Cascader
    cy.get('.ant-cascader-picker').click();
    cy.contains('Office Supplies').should('be.visible');

    // Check Brand Select
    cy.get('#brandId').click(); // Assuming id is brandId
    cy.get('.ant-select-item-option-content').contains('Brand A').should('be.visible');

    // Check Tax Select
    cy.get('#taxCode').type('Tax');
    cy.wait('@getTax');
    cy.get('.ant-select-item-option-content').contains('Tax A').should('be.visible');
  });
});
