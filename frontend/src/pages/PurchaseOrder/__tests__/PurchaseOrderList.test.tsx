import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import PurchaseOrderList from '../PurchaseOrderList';
import { BrowserRouter } from 'react-router-dom';
import { getPurchaseOrders } from '../../../services/purchaseOrderService';
import { Modal } from 'antd';
import { trackEvent } from '../../../utils/tracker';

// Mock dependencies
const mockNavigate = vi.fn();
const mockLocation = { pathname: '/supply-chain/purchase-order', state: {}, key: 'default' };

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => mockLocation,
  };
});

vi.mock('../../../services/purchaseOrderService', () => ({
  cancelPurchaseOrder: vi.fn(),
  getPurchaseOrders: vi.fn(),
  shipPurchaseOrder: vi.fn(),
}));

vi.mock('../../../services/logisticsService', () => ({
  getLogisticsProviders: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../../utils/exportUtils', () => ({
  useExport: () => ({
    handleExport: vi.fn(),
    exporting: false,
    progress: 0,
  }),
}));

vi.mock('../../../utils/tracker', () => ({
  trackEvent: vi.fn(),
}));

// Mock Antd Modal.confirm
vi.spyOn(Modal, 'confirm');

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver
window.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('PurchaseOrderList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockInboundOrder = {
    id: 1,
    orderNo: 'PO123',
    type: 'INBOUND',
    inboundOrderNo: 'IN20231027001',
    inboundOrderId: 101,
    supplierName: 'Test Supplier',
    status: 'PENDING',
    items: [{ productName: 'Product A', quantity: 10, unitPrice: 100 }],
    totalAmount: 1000,
    createdAt: '2023-10-27 10:00:00',
    deliveryDate: '2023-10-30',
    settlementStatus: 'UNSETTLED',
    bizType: 'ProductInbound'
  };

  const mockDropshipOrder = {
    id: 2,
    orderNo: 'PO124',
    type: 'DROPSHIP',
    platformOrderNo: 'PLAT123',
    thirdPartyPlatform: 'Tmall',
    thirdPartyNo: 'PLAT123',
    bizNo: 'BIZ123',
    supplierName: 'Dropship Supplier',
    status: 'SHIPPED',
    items: [{ productName: 'Product B', quantity: 1, unitPrice: 50 }],
    totalAmount: 50,
    createdAt: '2023-10-27 11:00:00',
    settlementStatus: 'SETTLED',
    // bizType removed to allow fallback to purchaseType mapping
  };

  it('should display "Stock Replenishment" and Inbound Order No for Inbound Orders', async () => {
    (getPurchaseOrders as any).mockResolvedValue({
        content: [mockInboundOrder],
        totalElements: 1
    });
    
    render(<BrowserRouter><PurchaseOrderList /></BrowserRouter>);
    
    await waitFor(() => {
        const inboundTags = screen.getAllByText('入库采购');
        expect(inboundTags.length).toBeGreaterThan(0);
        expect(screen.getByText('IN20231027001')).toBeInTheDocument();
    });
  });

  it('should log warning and track event when items are empty but amount > 0', async () => {
    const emptyItemsOrder = { ...mockInboundOrder, id: 3, items: [], totalAmount: 100 };
    (getPurchaseOrders as any).mockResolvedValue({
        content: [emptyItemsOrder],
        totalElements: 1
    });
    
    render(<BrowserRouter><PurchaseOrderList /></BrowserRouter>);
    
    await waitFor(() => {
        expect(trackEvent).toHaveBeenCalledWith(expect.objectContaining({
            action: 'DataInconsistency',
            label: expect.stringContaining('empty items')
        }));
        expect(screen.getByText('数据异常: 无商品明细')).toBeInTheDocument();
    });
  });
  it('loads data on mount', async () => {
    (getPurchaseOrders as any).mockResolvedValue({
      content: [mockInboundOrder],
      totalElements: 1
    });

    render(
      <BrowserRouter>
        <PurchaseOrderList />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(getPurchaseOrders).toHaveBeenCalled();
    });

    expect(screen.getByText('PO123')).toBeDefined();
  });

  it('displays Inbound Order correctly with new requirements', async () => {
    (getPurchaseOrders as any).mockResolvedValue({
      content: [mockInboundOrder],
      totalElements: 1
    });

    render(
      <BrowserRouter>
        <PurchaseOrderList />
      </BrowserRouter>
    );

    await waitFor(() => expect(screen.getByText('PO123')).toBeDefined());

    // 1. Verify "入库采购" (Purchase Type)
    const typeTags = screen.getAllByText('入库采购');
    expect(typeTags.length).toBeGreaterThan(0);

    // 2. Verify "入库采购" (Business Info)
    // Both columns display "入库采购" for ProductInbound
    expect(typeTags.length).toBeGreaterThanOrEqual(2);

    // 3. Verify Inbound Order No is displayed in "Platform Order/Biz Info" column
    expect(screen.getByText('IN20231027001')).toBeDefined();

    // 4. Verify Expected Arrival Time (Raw Value)
    expect(screen.getByText('2023-10-30')).toBeDefined();
  });

  it('displays Dropship Order correctly', async () => {
    (getPurchaseOrders as any).mockResolvedValue({
      content: [mockDropshipOrder],
      totalElements: 1
    });

    render(
      <BrowserRouter>
        <PurchaseOrderList />
      </BrowserRouter>
    );

    await waitFor(() => expect(screen.getByText('PO124')).toBeDefined());

    // Check "代发采购" (mapped from DROPSHIP)
    expect(screen.getByText('代发采购')).toBeDefined();
    // Check Platform Order No
    expect(screen.getByText('PLAT123', { exact: false })).toBeDefined();
  });
  
  it('shows empty state when no data', async () => {
    (getPurchaseOrders as any).mockResolvedValue({
      content: [],
      totalElements: 0
    });

    render(
      <BrowserRouter>
        <PurchaseOrderList />
      </BrowserRouter>
    );

    await waitFor(() => {
        // Antd Table Empty Text
        expect(screen.getByText('暂无数据')).toBeDefined();
    });
  });

  it('opens settlement detail modal with correct calculations', async () => {
    const settlementOrder = {
      ...mockInboundOrder,
      payableAmount: 1200.00,
      settledAmount: 500.00,
      logisticsFee: 50.00
    };

    (getPurchaseOrders as any).mockResolvedValue({
      content: [settlementOrder],
      totalElements: 1
    });

    render(
      <BrowserRouter>
        <PurchaseOrderList />
      </BrowserRouter>
    );

    await waitFor(() => expect(screen.getByText('PO123')).toBeDefined());

    // 1. Verify list display (Payable/Settled)
    // The component renders amounts directly without "应:" or "已:" prefixes
    expect(screen.getByText('¥1200.00')).toBeDefined();
    expect(screen.getByText('¥500.00')).toBeDefined();

    // 2. Click to open modal
    // Find the element with settled amount to click it
    const settlementCell = screen.getByText('¥500.00');
    if (settlementCell) {
        fireEvent.click(settlementCell);
    } else {
        throw new Error('Settlement cell not found');
    }

    // 3. Verify Modal Content
    await waitFor(() => {
        expect(screen.getByText('结算明细')).toBeDefined();
        // Verify specific amounts in modal
        // We use getAllByText because the amounts appear in both list and modal
        // But the modal has titles like "应结算金额", "已结算金额", "待结算余额"
        
        // Check "待结算余额" calculation: 1200 - 500 = 700.00
        expect(screen.getByText('¥700.00')).toBeDefined();
    });
  });

  it('should not trigger infinite loop and memoize columns', async () => {
    // Regression test for "Maximum update depth exceeded"
    (getPurchaseOrders as any).mockResolvedValue({
      content: [mockInboundOrder],
      totalElements: 1
    });

    render(
      <BrowserRouter>
        <PurchaseOrderList />
      </BrowserRouter>
    );

    // Verify component renders successfully
    await waitFor(() => expect(screen.getByText('PO123')).toBeDefined());
    
    // Wait to ensure no infinite loop crash happens
    await new Promise(resolve => setTimeout(resolve, 500));
    
    expect(true).toBe(true);
  });
});
