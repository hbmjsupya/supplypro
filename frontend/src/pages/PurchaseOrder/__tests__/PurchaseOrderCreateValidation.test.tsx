import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import PurchaseOrderCreate from '../PurchaseOrderCreate';
import { getSuppliers } from '../../../services/supplierService';
import { getWarehouses } from '../../../services/warehouseService';
import { generateInboundPurchaseOrder } from '../../../services/purchaseOrderService';
import { BrowserRouter } from 'react-router-dom';
import { message } from 'antd';

// Mock services
vi.mock('../../../services/supplierService', () => ({
  getSuppliers: vi.fn()
}));

vi.mock('../../../services/warehouseService', () => ({
  getWarehouses: vi.fn()
}));

vi.mock('../../../services/purchaseOrderService', () => ({
  createPurchaseOrder: vi.fn(),
  generateInboundPurchaseOrder: vi.fn()
}));

vi.mock('../../../utils/tracker', () => ({
  trackEvent: vi.fn()
}));

// Mock SupplierSelect
vi.mock('../components/SupplierSelect', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default: ({ onChange }: any) => (
    <button onClick={() => onChange(1)}>Select Supplier A</button>
  )
}));

// Mock ProductPoolModal
vi.mock('../components/ProductPoolModal', () => {
  return {
    __esModule: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    default: ({ onOk, open }: any) => {
      if (!open) return null;
      return (
        <div data-testid="mock-modal">
          <button onClick={() => onOk([
            { key: '1', productId: 101, productName: 'Test Product', skuCode: 'TP001', specName: 'Spec', costPrice: 100, defaultSupplierId: 1, defaultSupplierName: 'Test Supplier' }
          ])}>
            Add Test Product
          </button>
          <button onClick={() => onOk([
            { key: '2', productId: null, productName: 'Invalid Product', skuCode: 'INV001', specName: 'Spec', costPrice: 10 }
          ])}>
            Add Invalid Product
          </button>
        </div>
      );
    }
  };
});

// Mock Message and DatePicker
vi.mock('antd', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const actual: any = await vi.importActual('antd');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dayjs = (await vi.importActual('dayjs') as any).default;
    
    return {
        ...actual,
        message: {
            ...actual.message,
            error: vi.fn(),
            success: vi.fn(),
            warning: vi.fn(),
            info: vi.fn(),
        },
        // Mock DatePicker to simplify testing
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        DatePicker: (props: any) => (
            <input 
                data-testid="mock-datepicker"
                onChange={(e) => props.onChange && props.onChange(dayjs(e.target.value))}
                value={props.value ? props.value.format('YYYY-MM-DD') : ''}
                id={props.id}
            />
        )
    };
});

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

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

describe('PurchaseOrderCreateValidation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (generateInboundPurchaseOrder as any).mockResolvedValue({ id: 1, orderNo: 'PO123' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (getWarehouses as any).mockResolvedValue([
        { 
            id: 1, 
            name: 'Warehouse A', 
            code: 'WH001',
            status: 'ACTIVE', 
            province: 'Guangdong', 
            city: 'Shenzhen', 
            district: 'Nanshan', 
            address: 'Test Addr',
            managers: [{ username: 'Mgr1', phone: '13800000000' }]
        }
    ]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (getSuppliers as any).mockResolvedValue({ content: [{ id: 1, name: 'Supplier A' }], totalElements: 1 });
  });

  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <PurchaseOrderCreate />
      </BrowserRouter>
    );
  };

  it('Test Case 1: Submit button should be disabled when no products selected', async () => {
    renderComponent();

    // Fill basics
    // Supplier select removed
    
    // Select Warehouse
    // Antd Select interaction via finding input or using placeholder
    const warehouseSelect = screen.getByRole('combobox', { name: '入库仓库' });
    fireEvent.mouseDown(warehouseSelect);
    await waitFor(() => screen.getByText('Warehouse A'));
    fireEvent.click(screen.getByText('Warehouse A'));

    // Verify button is disabled
    const submitBtn = screen.getByRole('button', { name: '生成入库采购单' });
    expect(submitBtn).toBeDisabled();

    // Verify red text hint
    expect(screen.getByText('* 请先选择商品')).toBeInTheDocument();

    // Click should not call generateInboundPurchaseOrder
    fireEvent.click(submitBtn);
    expect(generateInboundPurchaseOrder).not.toHaveBeenCalled();
  });

  it('Test Case 2: Successful submission with product', async () => {
    renderComponent();

    // Fill basics
    // Supplier select removed
    
    // Select Warehouse
    const warehouseSelect = screen.getByRole('combobox', { name: '入库仓库' });
    fireEvent.mouseDown(warehouseSelect);
    await waitFor(() => screen.getByText('Warehouse A'));
    fireEvent.click(screen.getByText('Warehouse A'));

    // Add Product
    fireEvent.click(screen.getByText('批量添加商品'));
    fireEvent.click(screen.getByText('Add Test Product'));

    // Wait for table to update (Input value)
    await waitFor(() => screen.getByDisplayValue('Test Product'));

    // Fill Date (Simulate DatePicker)
    const dateInput = screen.getByTestId('mock-datepicker');
    fireEvent.change(dateInput, { target: { value: '2023-10-01' } });
    await waitFor(() => expect(dateInput).toHaveValue('2023-10-01'));

    // Button should be enabled
    const submitBtn = screen.getByRole('button', { name: '生成入库采购单' });
    await waitFor(() => expect(submitBtn).not.toBeDisabled());

    // Submit
    fireEvent.click(submitBtn);

    // DEBUG: Check for errors if navigation fails
    await waitFor(() => {
              if (mockNavigate.mock.calls.length === 0) {
                  // If not navigated, check if error message was shown
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const errorCalls = (message.error as any).mock.calls;
                  if (errorCalls.length > 0) {
                      throw new Error(`Submission failed with error: ${errorCalls[0]}`);
                  }
              }
              // Check if navigation happened
              expect(mockNavigate).toHaveBeenCalledWith('/supply-chain/purchase-order', expect.anything());
          });
  });

  it('Test Case 3: Should block submission if items are invalid (missing productId)', async () => {
    renderComponent();

    // Fill basics
    // Supplier select removed
    
    // Select Warehouse
    const warehouseSelect = screen.getByRole('combobox', { name: '入库仓库' });
    fireEvent.mouseDown(warehouseSelect);
    await waitFor(() => screen.getByText('Warehouse A'));
    fireEvent.click(screen.getByText('Warehouse A'));
    
    // Fill Date (Simulate DatePicker)
    const dateInput = screen.getByTestId('mock-datepicker');
    fireEvent.change(dateInput, { target: { value: '2023-10-01' } });
    await waitFor(() => expect(dateInput).toHaveValue('2023-10-01'));

    // Add Invalid Product
    fireEvent.click(screen.getByText('批量添加商品'));
    fireEvent.click(screen.getByText('Add Invalid Product'));

    // Wait for table to update
    await waitFor(() => screen.getByDisplayValue('Invalid Product'));

    // Button should be enabled (since form level items array is not empty)
    const submitBtn = screen.getByRole('button', { name: '生成入库采购单' });
    await waitFor(() => expect(submitBtn).not.toBeDisabled());
    
    // Submit
    // Use act to wrap submission
    fireEvent.click(submitBtn);

    // Expect NO navigation and NO API call
    // We expect submission to be blocked either by Form validation or logic validation
    await waitFor(() => {
        expect(mockNavigate).not.toHaveBeenCalled();
    });
    expect(generateInboundPurchaseOrder).not.toHaveBeenCalled();
  });
});
