import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import PurchaseOrderList from '../PurchaseOrderList';
import { BrowserRouter } from 'react-router-dom';
import { getPurchaseOrders, shipPurchaseOrder } from '../../../services/purchaseOrderService';
import { getLogisticsProviders } from '../../../services/logisticsService';

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
  getPurchaseOrders: vi.fn(),
  shipPurchaseOrder: vi.fn(),
  cancelPurchaseOrder: vi.fn(), // Needed as imported
  batchAdjustCost: vi.fn(), // Needed as imported
}));

vi.mock('../../../services/logisticsService', () => ({
  getLogisticsProviders: vi.fn(),
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

describe('PurchaseOrderList Shipment Modal', () => {
  const mockOrder = {
    id: 1,
    orderNo: 'PO123',
    type: 'STANDARD',
    status: 'CONFIRMED', // ToShip
    supplierName: 'Test Supplier',
    supplierId: 99,
    items: [{ productName: 'Product A', quantity: 10, unitPrice: 100 }],
    totalAmount: 1000,
    createdAt: '2023-10-27 10:00:00',
    quantity: 10,
    shippingStatus: 'UNSHIPPED',
    logisticsFee: 0,
    payableAmount: 0,
    settledAmount: 0,
    freight: 0,
    cost: 0,
    totalCost: 0
  };

  const mockProviders = [
    { id: 1, name: 'Provider A', status: 'ACTIVE' },
    { id: 2, name: 'Provider B', status: 'ACTIVE' }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (getPurchaseOrders as any).mockResolvedValue({
      content: [mockOrder],
      totalElements: 1
    });
    (getLogisticsProviders as any).mockResolvedValue(mockProviders);
  });

  it('should open shipment modal and verify fields', async () => {
    render(<BrowserRouter><PurchaseOrderList /></BrowserRouter>);

    await waitFor(() => expect(screen.getByText('PO123')).toBeInTheDocument());

    // Click "发货" (Ship) button
    const shipBtn = screen.getByText('发货');
    fireEvent.click(shipBtn);

    // Wait for modal title
    await waitFor(() => expect(screen.getByText('采购单发货 (PO123)')).toBeInTheDocument());

    // 1. Verify Quantity is disabled
    // Antd InputNumber renders input with role spinbutton
    const qtyInput = screen.getByRole('spinbutton', { name: '发货数量' });
    expect(qtyInput).toBeDisabled();
    expect(qtyInput).toHaveValue('10');

    // 2. Verify Expected Arrival is present
    expect(screen.getByLabelText('预计到货时间')).toBeInTheDocument();

    // 3. Verify Logistics Supplier is present
    expect(screen.getByLabelText('物流供应商')).toBeInTheDocument();
  });

  it('should reset fee when supplier is DROPSHIP', async () => {
    render(<BrowserRouter><PurchaseOrderList /></BrowserRouter>);
    await waitFor(() => expect(screen.getByText('PO123')).toBeInTheDocument());
    fireEvent.click(screen.getByText('发货'));
    await waitFor(() => expect(screen.getByText('采购单发货 (PO123)')).toBeInTheDocument());

    // Set fee to 100 manually
    // Use getByRole spinbutton which is standard for InputNumber
    const feeInput = screen.getByRole('spinbutton', { name: '物流费用' });
    fireEvent.change(feeInput, { target: { value: '100' } });
    expect(feeInput).toHaveValue('100');

    // Select Provider A
    // Finding the Select trigger
    // The Select component renders a hidden input and a visible span/div.
    // The label points to the hidden input usually? No.
    // Let's use getByLabelText which finds the control associated with label.
    // For Antd Select, it might find the input inside.
    const supplierSelect = screen.getByLabelText('物流供应商');
    fireEvent.mouseDown(supplierSelect); // Open dropdown
    
    // Use findByText with longer timeout
    const providerOption = await screen.findByText('Provider A', {}, { timeout: 3000 });
    fireEvent.click(providerOption);
    
    // Fee should remain unchanged
    expect(feeInput).toHaveValue('100');

    // Select DROPSHIP
    fireEvent.mouseDown(supplierSelect);
    const dropshipOption = await screen.findByText('一件代发 (默认)', {}, { timeout: 3000 });
    fireEvent.click(dropshipOption);

    // Fee should be reset to 0
    await waitFor(() => {
        expect(feeInput).toHaveValue('0');
    }, { timeout: 3000 });
  }, 10000); // Set test timeout to 10s
});
