import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import PurchaseOrderList from '../PurchaseOrderList';
import { BrowserRouter } from 'react-router-dom';
import { Modal } from 'antd';

// Mock dependencies
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockCancelPurchaseOrder = vi.fn();
vi.mock('../../../services/purchaseOrderService', () => ({
  cancelPurchaseOrder: (id: number) => mockCancelPurchaseOrder(id),
  getPurchaseOrders: vi.fn(),
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

// Mock Antd Modal.confirm
vi.spyOn(Modal, 'confirm');

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

describe('PurchaseOrderList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <PurchaseOrderList />
      </BrowserRouter>
    );
  };

  it('renders list header', () => {
    renderComponent();
    // Check for "新增入库采购单" button which indicates the list controls are rendered
    expect(screen.getByText('新增入库采购单')).toBeDefined();
  });

  it('shows cancel button for Inbound unsettled orders', async () => {
    renderComponent();
    // Based on mockOrders in PurchaseOrderList.tsx:
    // Key '2' is Inbound, Unsettled.
    // It should have a '取消' button.
    
    const cancelButtons = screen.getAllByText('取消');
    expect(cancelButtons.length).toBeGreaterThan(0);
  });

  it('does not show cancel button for Dropship orders', () => {
    renderComponent();
    // Key '1' is Dropship.
    // We can't easily check "does not exist" for a specific row without complex selectors,
    // but we can check the total number of cancel buttons matches expectations.
    // In mockOrders:
    // 1: Dropship (No)
    // 2: Inbound, Unsettled, Shipped (Wait, status Shipped? Button logic checks status != Completed. So it appears.)
    // 3: SelfDistribute (No)
    // 4: Dropship (No)
    
    // Wait, let's re-read the condition:
    // record.purchaseType === 'Inbound' && record.settlementStatus === 'Unsettled' && record.status !== 'Completed' && record.status !== 'Cancelled'
    
    // Key 2: Inbound, Unsettled, Shipped. Should show.
    // Key 1: Dropship. No.
    // Key 3: SelfDistribute. No.
    // Key 4: Dropship. No.
    
    // So exactly 1 cancel button should exist.
    const cancelButtons = screen.getAllByText('取消');
    expect(cancelButtons.length).toBe(1);
  });

  it('calls cancel API on confirmation', async () => {
    renderComponent();
    const cancelButtons = screen.getAllByText('取消');
    const cancelButton = cancelButtons[0];
    
    fireEvent.click(cancelButton);
    
    // Check if Modal.confirm was called
    expect(Modal.confirm).toHaveBeenCalled();
    
    // Simulate OK click in Modal
    const confirmCall = vi.mocked(Modal.confirm).mock.calls[0][0];
    // @ts-ignore
    await confirmCall.onOk();
    
    expect(mockCancelPurchaseOrder).toHaveBeenCalledWith(2); // Key is '2', converted to number
  });
});
