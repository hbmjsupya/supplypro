/// <reference types="cypress" />

describe('Warehouse Status Management', () => {
  beforeEach(() => {
    // Mock API
    cy.intercept('GET', '/api/warehouses*', {
      statusCode: 200,
      body: {
        code: 200,
        data: {
          records: [
            {
              id: '1',
              code: 'WH00001',
              name: 'E2E Warehouse',
              status: 'ACTIVE',
              createdAt: '2023-10-01T12:00:00',
              managers: [],
              province: 'Zhejiang',
              city: 'Hangzhou',
              district: 'Binjiang'
            }
          ],
          total: 1
        }
      }
    }).as('getWarehouses');

    cy.intercept('GET', '/api/inventory-batches', { body: [] });
    
    // Mock regions
    cy.intercept('GET', '/data/china_regions.json', { body: [] });
  });

  it('displays formatted time and toggles status', () => {
    // Navigate to warehouse list
    // Assuming the route is /warehouse or similar. I'll use the sidebar navigation or direct URL if known.
    // Based on previous files, let's guess /warehouse or check navigation.
    // I'll assume /warehouse based on context, if fails I'll fix.
    cy.visit('/warehouse'); 
    cy.wait('@getWarehouses');

    // Check Time Format
    cy.contains('2023-10-01 12:00:00').should('be.visible');

    // Check Status Switch
    cy.get('tr[data-row-key="1"] .ant-switch').should('have.attr', 'aria-checked', 'true');

    // Mock Update Success
    cy.intercept('PUT', '/api/warehouses/1/status', {
      statusCode: 200,
      body: { code: 200, message: 'Success' }
    }).as('updateStatus');

    // Click Switch
    cy.get('tr[data-row-key="1"] .ant-switch').click();
    cy.wait('@updateStatus').its('request.body').should('deep.equal', { status: 'INACTIVE' });
    
    // Verify Switch State Changed
    cy.get('tr[data-row-key="1"] .ant-switch').should('have.attr', 'aria-checked', 'false');
  });

  it('reverts status on error', () => {
    cy.visit('/warehouse');
    cy.wait('@getWarehouses');

    // Mock Update Error
    cy.intercept('PUT', '/api/warehouses/1/status', {
      statusCode: 500,
      body: { message: 'Error' }
    }).as('updateStatusError');

    // Click Switch
    cy.get('tr[data-row-key="1"] .ant-switch').click();
    cy.wait('@updateStatusError');

    // Verify Switch State Reverted
    cy.get('tr[data-row-key="1"] .ant-switch').should('have.attr', 'aria-checked', 'true');
    cy.contains('状态更新失败').should('be.visible');
  });
});
