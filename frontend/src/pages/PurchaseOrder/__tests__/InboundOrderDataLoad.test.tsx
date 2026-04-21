import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import InboundOrderCreate from '../InboundOrderCreate';
import { getSuppliers } from '../../../services/supplierService';
import { productService } from '../../../services/productService';
import { getWarehouses } from '../../../services/warehouseService';
import { BrowserRouter } from 'react-router-dom';

// Mock services
vi.mock('../../../services/supplierService', () => ({
  getSuppliers: vi.fn()
}));

vi.mock('../../../services/productService', () => ({
  productService: {
    getAll: vi.fn()
  }
}));

vi.mock('../../../services/warehouseService', () => ({
  getWarehouses: vi.fn()
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

// Mock matchMedia for AntD
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

describe('InboundOrderDataLoad', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (getWarehouses as any).mockResolvedValue([]);
  });

  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <InboundOrderCreate />
      </BrowserRouter>
    );
  };

  it('Scenario 1: Empty Database (No Suppliers, No Products)', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (getSuppliers as any).mockResolvedValue({ content: [], totalElements: 0 });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (productService.getAll as any).mockResolvedValue({ content: [], totalElements: 0 });

    renderComponent();

    // Open Supplier Select
    const supplierSelect = screen.getByTestId('supplier-select').firstElementChild;
    fireEvent.mouseDown(supplierSelect!);

    // Should show empty state
    await waitFor(() => {
      expect(screen.getByText('暂无可用供应商')).toBeDefined();
    });

    // Open Product Modal (need to click button)
    const addProductBtn = screen.getByText('选择商品');
    fireEvent.click(addProductBtn);

    // Should show empty table in modal
    await waitFor(() => {
      expect(screen.getByText('暂无数据')).toBeDefined();
    });
  });

  it('Scenario 2: Only Suppliers Exist', async () => {
    const mockSuppliers = [
      { id: 1, name: 'Supplier A', status: 'ACTIVE', supplierNo: 'SUP001' },
      { id: 2, name: 'Supplier B', status: 'ACTIVE', supplierNo: 'SUP002' }
    ];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (getSuppliers as any).mockResolvedValue({ content: mockSuppliers, totalElements: 2 });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (productService.getAll as any).mockResolvedValue({ content: [], totalElements: 0 });

    renderComponent();

    // Trigger Supplier Load (it loads on mount now)
    await waitFor(() => {
      expect(getSuppliers).toHaveBeenCalled();
    });

    // Open Select
    const supplierSelect = screen.getByTestId('supplier-select').firstElementChild;
    fireEvent.mouseDown(supplierSelect!);

    // Verify Suppliers are listed
    await waitFor(() => {
      expect(screen.getByText('Supplier A (SUP001)')).toBeDefined();
      expect(screen.getByText('Supplier B (SUP002)')).toBeDefined();
    });

    // Open Product Modal
    const addProductBtn = screen.getByText('选择商品');
    fireEvent.click(addProductBtn);

    // Should still be empty
    await waitFor(() => {
      expect(screen.getByText('暂无数据')).toBeDefined();
    });
  });

  it('Scenario 3: Only Products Exist (but filtered by Supplier?)', async () => {
    // Note: If no supplier selected, maybe all products shown? 
    // Or if filtered by supplier, then 0 products if supplier select is empty?
    // Let's assume ProductPoolModal handles undefined supplierId by showing all or none.
    // Based on previous code, if supplierId is undefined, it might show all or none.
    // Let's assume we want to test product loading mechanism itself.
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (getSuppliers as any).mockResolvedValue({ content: [], totalElements: 0 });
    const mockProducts = [
      { id: 101, name: 'Product X', status: 'ON_SHELF', skus: [{ id: 1, skuCode: 'SKU1', name: 'Spec1', costPrice: 10 }] }
    ];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (productService.getAll as any).mockResolvedValue({ content: mockProducts, totalElements: 1 });

    renderComponent();

    // Open Product Modal
    const addProductBtn = screen.getByText('选择商品');
    fireEvent.click(addProductBtn);

    // Verify Product X is listed
    await waitFor(() => {
      expect(screen.getByText('Product X')).toBeDefined();
    });
  });

  it('Scenario 4: Both Exist', async () => {
    const mockSuppliers = [{ id: 1, name: 'Supplier A', status: 'ACTIVE', supplierNo: 'SUP001' }];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (getSuppliers as any).mockResolvedValue({ content: mockSuppliers, totalElements: 1 });
    
    const mockProducts = [
      { id: 101, name: 'Product X', status: 'ON_SHELF', skus: [{ id: 1, skuCode: 'SKU1', name: 'Spec1', costPrice: 10 }] }
    ];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (productService.getAll as any).mockResolvedValue({ content: mockProducts, totalElements: 1 });

    renderComponent();

    // Select Supplier
    const supplierSelect = screen.getByTestId('supplier-select').firstElementChild;
    fireEvent.mouseDown(supplierSelect!);
    const option = await screen.findByText(/Supplier A/);
    fireEvent.click(option);

    // Open Product Modal
    const addProductBtn = screen.getByText('选择商品');
    fireEvent.click(addProductBtn);

    // Verify Product Load with Supplier Filter
    await waitFor(() => {
      expect(productService.getAll).toHaveBeenCalledWith(expect.objectContaining({
        supplierId: 1 // Selected Supplier ID
      }));
      expect(screen.getByText('Product X')).toBeDefined();
    });
  });
});
