
/// <reference types="cypress" />

describe('Logistics Display Page', () => {
  const PO_NO = 'C202602240900001';
  const PO_ID = 1001;
  const TRACKING_NO = 'YT3761367226619';

  beforeEach(() => {
    // Mock Backend APIs
    
    // 1. Mock Purchase Order Search (for page reload logic)
    cy.intercept('GET', `/api/purchase-orders?*keyword=${PO_NO}*`, (req) => {
      req.reply({
        statusCode: 200,
        body: {
          records: [
            {
              id: PO_ID,
              orderNo: PO_NO,
              purchaseOrderId: PO_ID, // Snapshot ID field
              trackingNumber: TRACKING_NO,
              logisticsCompany: 'YTO',
              status: 'SHIPPED'
            }
          ],
          total: 1,
          size: 10,
          current: 1
        }
      });
    }).as('searchPO');

    // 2. Mock Logistics Tracking by ID (Legacy/Hybrid)
    cy.intercept('GET', `/api/logistics/track/purchase-order/${PO_ID}`, {
      statusCode: 200,
      body: {
        success: true,
        logisticCode: TRACKING_NO,
        shipperName: '圆通速递',
        traces: [
          {
            acceptTime: '2026-02-24 10:00:00',
            acceptStation: '已揽收',
            location: 'Beijing'
          }
        ]
      }
    }).as('trackByID');

    // 3. Mock Logistics Tracking by Tracking No (New)
    cy.intercept('GET', `/api/logistics/track/courier/${TRACKING_NO}`, {
      statusCode: 200,
      body: {
        success: true,
        logisticCode: TRACKING_NO,
        shipperName: '圆通速递',
        traces: [
          {
            acceptTime: '2026-02-24 10:00:00',
            acceptStation: '已揽收',
            location: 'Beijing'
          }
        ]
      }
    }).as('trackByNo');
  });

  it('should display logistics info when accessing by Order No', () => {
    // Visit the page directly (simulate reload)
    cy.visit(`/supply-chain/purchase-order/logistics/${PO_NO}`);

    // Wait for PO search
    cy.wait('@searchPO');

    // Verify page content
    cy.contains('物流详情').should('be.visible');
    
    // Verify Logistics Info
    cy.contains('圆通速递').should('be.visible');
    cy.contains(TRACKING_NO).should('be.visible');
    cy.contains('已揽收').should('be.visible');
  });

  it('should show warning if PO not found', () => {
    // Mock empty search result
    cy.intercept('GET', `/api/purchase-orders?*keyword=INVALID*`, {
      body: { records: [] }
    }).as('searchEmpty');

    cy.visit(`/supply-chain/purchase-order/logistics/INVALID`);
    cy.wait('@searchEmpty');

    cy.contains('未找到采购单信息').should('be.visible');
  });
});
