import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import InboundOrderCreate from '../InboundOrderCreate';
import { getSuppliers } from '../../../services/supplierService';
// import { productService } from '../../../services/productService';
import { getWarehouses } from '../../../services/warehouseService';
import { generateInboundPurchaseOrder } from '../../../services/purchaseOrderService';
import { BrowserRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { message } from 'antd';

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

vi.mock('../../../services/purchaseOrderService', () => ({
  createPurchaseOrder: vi.fn(),
  generateInboundPurchaseOrder: vi.fn()
}));

// Mock SupplierSelect to simplify testing
vi.mock('../components/SupplierSelect', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default: ({ onChange }: any) => (
    <button onClick={() => onChange(1)}>Select Supplier A</button>
  )
}));

// Mock ProductPoolModal to allow injecting bad data
vi.mock('../components/ProductPoolModal', () => {
  return {
    __esModule: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    default: ({ onOk, open }: any) => {
      if (!open) return null;
      return (
        <div data-testid="mock-modal">
          <button onClick={() => onOk([
            { key: '1', productId: null, productName: 'Bad Product', skuCode: 'BP001', specName: 'Spec', costPrice: 100 }
          ])}>
            Add Bad Product
          </button>
          <button onClick={() => onOk([
            { key: '2', productId: 101, productName: 'Good Product', skuCode: 'GP001', specName: 'Spec', costPrice: 100 }
          ])}>
            Add Good Product
          </button>
        </div>
      );
    }
  };
});

// Mock Message
vi.mock('antd', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const actual: any = await vi.importActual('antd');
    return {
        ...actual,
        message: {
            ...actual.message,
            error: vi.fn(),
            success: vi.fn(),
        },
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

describe('InboundOrderValidation', () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (getWarehouses as any).mockResolvedValue([
        { 
            id: 1, 
            name: 'Warehouse A', 
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
        <InboundOrderCreate />
      </BrowserRouter>
    );
  };

  const fillFormBasics = async () => {
    // Select Supplier via Mock
    fireEvent.click(screen.getByText('Select Supplier A'));

    // Trigger Warehouse Select
    // Antd Select is tricky. We can try to find the input with role combobox for "入库仓库"
    // Since we only have one other Select (Supplier is mocked), we can find it easily.
    const warehouseSelect = screen.getByRole('combobox', { name: '入库仓库' });
    fireEvent.mouseDown(warehouseSelect);
    
    // Wait for option to appear in portal
    await waitFor(() => screen.getByText('Warehouse A'));
    fireEvent.click(screen.getByText('Warehouse A'));
  };

  it('Test Case 1: Submit button should be disabled when no products selected', async () => {
    renderComponent();
    await fillFormBasics();

    // Verify the red warning text is present, which confirms items.length === 0
    expect(screen.getByText('* 请至少选择一件商品')).toBeInTheDocument();

    // Submit button should be disabled
    // Ant Design Tooltip might wrap the button, so we ensure we get the button itself
    const submitBtn = screen.getByRole('button', { name: '提交入库采购单' });
    
    // Check disabled attribute directly if toBeDisabled() is flaky with Antd Tooltip
    expect(submitBtn).toBeDisabled();

    // Click should not trigger submission
    fireEvent.click(submitBtn);
    expect(generateInboundPurchaseOrder).not.toHaveBeenCalled();
  });

  it('Test Case 2: Submit with product missing ID should show error', async () => {
    renderComponent();
    await fillFormBasics();

    // Open Modal
    fireEvent.click(screen.getByText('选择商品'));
    
    // Click "Add Bad Product" from our mock
    fireEvent.click(screen.getByText('Add Bad Product'));

    // The InboundOrderCreate component has a check in handleProductSelect that filters nulls OR errors.
    // In our modified code: 
    // if (sku.productId === null) { message.error(...); return null; }
    // So the item won't be added to the list.
    // Thus, submitting will trigger "Please select at least one product".
    
    // Wait for the specific error message from handleProductSelect
    await waitFor(() => {
         expect(message.error).toHaveBeenCalledWith(expect.stringContaining('数据严重异常(ID缺失)'));
    });

    // Since the item was rejected, items list is empty.
    // Button should be disabled.
    const submitBtn = screen.getByRole('button', { name: '提交入库采购单' });
    expect(submitBtn).toBeDisabled();
    expect(screen.getByText('* 请至少选择一件商品')).toBeInTheDocument();
    
    expect(generateInboundPurchaseOrder).not.toHaveBeenCalled();
  });

  it('Test Case 3: Successful submission', async () => {
    renderComponent();
    await fillFormBasics();

    // Open Modal
    fireEvent.click(screen.getByText('选择商品'));
    
    // Click "Add Good Product"
    fireEvent.click(screen.getByText('Add Good Product'));

    // Wait for item to appear in table (by text)
    await waitFor(() => screen.getByText('Good Product'));

    // Submit
    const submitBtn = screen.getByText('提交入库采购单');
    fireEvent.click(submitBtn);

    await waitFor(() => {
        expect(generateInboundPurchaseOrder).toHaveBeenCalled();
    });
    expect(message.success).toHaveBeenCalledWith('入库采购单已创建');
  });
});
