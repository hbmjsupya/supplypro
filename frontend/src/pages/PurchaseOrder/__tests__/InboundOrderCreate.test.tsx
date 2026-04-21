import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import InboundOrderCreate from '../InboundOrderCreate';
import { BrowserRouter } from 'react-router-dom';

// Mocks
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock request to prevent Network Error if service mock fails
vi.mock('../../../utils/request', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  }
}));

const mockGetWarehouses = vi.fn();
vi.mock('../../../services/warehouseService', () => ({
  getWarehouses: () => mockGetWarehouses(),
}));

const mockCreatePurchaseOrder = vi.fn();
const mockGenerateInboundPurchaseOrder = vi.fn();
vi.mock('../../../services/purchaseOrderService', () => ({
  createPurchaseOrder: (data: unknown) => mockCreatePurchaseOrder(data),
  generateInboundPurchaseOrder: (data: unknown) => mockGenerateInboundPurchaseOrder(data),
}));

vi.mock('../../../utils/tracker', () => ({
  trackEvent: vi.fn(),
}));

// Mock child components to avoid complex interactions
vi.mock('../components/SupplierSelect', () => ({
  default: ({ onChange, value }: { onChange: (val: string) => void, value?: any }) => (
    <input data-testid="supplier-select" value={value || ''} onChange={(e) => onChange(e.target.value)} />
  ),
}));

interface ProductItem {
  key: string;
  productId: number;
  skuCode: string;
  productName: string;
  specName: string;
  unit: string;
  minPurchaseQty: number;
  costPrice: number;
  [key: string]: string | number;
}

vi.mock('../components/ProductPoolModal', () => ({
  default: ({ open, onOk, onCancel }: { open: boolean; onOk: (items: ProductItem[]) => void; onCancel: () => void }) => {
    if (!open) return null;
    return (
      <div data-testid="product-modal">
        <button onClick={onCancel}>Cancel</button>
        <button 
          onClick={() => onOk([
            {
              key: '101-SKU001',
              productId: 101,
              skuCode: 'SKU001',
              productName: 'Test Product',
              specName: 'Spec A',
              unit: 'Box',
              minPurchaseQty: 10,
              costPrice: 50.00,
              defaultSupplierId: 88,
              defaultSupplierName: 'Test Default Supplier'
            }
          ])}
        >
          Confirm Product
        </button>
      </div>
    );
  }
}));

// Mock Antd Select to make testing easier
vi.mock('antd', async (importOriginal) => {
  const actual = await importOriginal<typeof import('antd')>();
  const MockSelect = ({ children, onChange, value, ...props }: React.PropsWithChildren<{ onChange?: (val: string | number) => void; value?: string | number; [key: string]: unknown }>) => {
    return (
      <select
        value={value}
        onChange={(e) => onChange?.(isNaN(Number(e.target.value)) ? e.target.value : Number(e.target.value))}
        data-testid={(props['data-testid'] as string) || 'mock-select'}
      >
        {children}
      </select>
    );
  };
  MockSelect.Option = ({ children, value }: React.PropsWithChildren<{ value: string | number }>) => (
    <option value={value}>{children}</option>
  );

  const MockDatePicker = (props: any) => <input data-testid="mock-datepicker" onChange={(e) => props.onChange && props.onChange(null, e.target.value)} />;

  return {
    ...actual,
    Select: MockSelect,
    DatePicker: MockDatePicker,
  };
});

// Mock Antd Upload
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

describe('InboundOrderCreate', () => {
  const mockWarehouses = [
    {
      id: 1,
      name: 'Warehouse A',
      province: 'Province A',
      city: 'City A',
      district: 'District A',
      address: 'Address A',
      managers: [{ username: 'Manager A', phone: '1234567890' }],
    },
    {
        id: 2,
        name: 'Warehouse B',
        province: 'Province B',
        city: 'City B',
        district: 'District B',
        address: 'Address B',
        admins: ['Admin B'], // Legacy format
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetWarehouses.mockResolvedValue(mockWarehouses);
    mockCreatePurchaseOrder.mockResolvedValue({ orderNo: 'PO123' });
    mockGenerateInboundPurchaseOrder.mockResolvedValue({ orderNo: 'INB-2023-001' });
  });

  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <InboundOrderCreate />
      </BrowserRouter>
    );
  };

  it('renders form with all sections', () => {
    renderComponent();
    
    expect(screen.getByText('新建入库采购单')).toBeDefined();
    // '基本信息' might be implicit or not present if Card title is used.
    // '收货信息' is in Divider.
    expect(screen.getByText('收货信息')).toBeDefined();
    expect(screen.getByText('商品明细')).toBeDefined();
  });

  it('auto-fills address and contact when warehouse is selected', async () => {
    renderComponent();
    
    // Wait for warehouses
    await waitFor(() => expect(mockGetWarehouses).toHaveBeenCalled());

    const select = screen.getByTestId('warehouse-select');
    fireEvent.change(select, { target: { value: '1' } }); // Warehouse A ID is 1
    
    // Verify auto-fill
    await waitFor(() => {
        expect(screen.getByDisplayValue('Province A')).toBeDefined();
        expect(screen.getByDisplayValue('City A')).toBeDefined();
        expect(screen.getByDisplayValue('District A')).toBeDefined();
        expect(screen.getByDisplayValue('Address A')).toBeDefined();
        expect(screen.getByDisplayValue('Manager A')).toBeDefined();
        expect(screen.getByDisplayValue('1234567890')).toBeDefined();
    });
  });

  it('handles legacy warehouse admin contact', async () => {
    renderComponent();
    await waitFor(() => expect(mockGetWarehouses).toHaveBeenCalled());

    const select = screen.getByTestId('warehouse-select');
    fireEvent.change(select, { target: { value: '2' } }); // Warehouse B ID is 2
    
    await waitFor(() => {
        expect(screen.getByDisplayValue('Admin B')).toBeDefined();
    });
  });

  it('adds items via product modal', async () => {
    renderComponent();
    
    // Click "Select Product" button
    const addBtn = screen.getByText('选择商品');
    fireEvent.click(addBtn);
    
    // Modal should appear
    expect(screen.getByTestId('product-modal')).toBeDefined();
    
    // Select product in mock modal
    fireEvent.click(screen.getByText('Confirm Product'));
    
    // Verify item added to table
    await waitFor(() => {
        expect(screen.getByText('Test Product')).toBeDefined();
        expect(screen.getByText('Spec A')).toBeDefined();
    });
  });

  it('updates totals when quantity changes', async () => {
    renderComponent();
    
    // Add item first
    const addBtn = screen.getByText('选择商品');
    fireEvent.click(addBtn);
    fireEvent.click(screen.getByText('Confirm Product'));
    
    await waitFor(() => screen.getByText('Test Product'));
    
    // Find quantity input (InputNumber)
    // Default quantity is 1
    const qtyInput = screen.getByDisplayValue('1');
    
    // Interact with Antd InputNumber
    fireEvent.focus(qtyInput);
    fireEvent.change(qtyInput, { target: { value: '5' } });
    fireEvent.blur(qtyInput);
    
    // Verify total amount update
    // Cost 50 * 5 = 250
    // We look for the cell containing the total price
    await waitFor(() => {
        // There might be multiple "¥250.00" if unit price was 250, but here unit is 50.
        // So only total should be 250.
        // However, summary row also shows total.
        expect(screen.getAllByText('¥250.00').length).toBeGreaterThan(0);
    });
  });

  it('submits valid form successfully', async () => {
    renderComponent();
    await waitFor(() => expect(mockGetWarehouses).toHaveBeenCalled());
    
    // 1. Select Warehouse
    const select = screen.getByTestId('warehouse-select');
    fireEvent.change(select, { target: { value: '1' } });
    
    // 2. Select Supplier (Mocked)
    const supplierInput = screen.getByTestId('supplier-select');
    fireEvent.change(supplierInput, { target: { value: '99' } });
    
    // 3. Add Product
    fireEvent.click(screen.getByText('选择商品'));
    fireEvent.click(screen.getByText('Confirm Product'));
    
    // 4. Fill required fields
    // Expect time - Removed as it's not in InboundOrderCreate form
    // const dateInput = screen.getByPlaceholderText('请选择期望收货时间');
    // fireEvent.click(dateInput);
    // const today = document.querySelector('.ant-picker-today-btn');
    // if (today) fireEvent.click(today);
    
    // 5. Submit
    const submitBtn = screen.getByText('提交入库采购单');
    fireEvent.click(submitBtn);
    
    // Verify API call
    await waitFor(() => {
        expect(mockGenerateInboundPurchaseOrder).toHaveBeenCalled();
        const callArg = mockGenerateInboundPurchaseOrder.mock.calls[0][0];
        expect(callArg.warehouseId).toBe(1);
        expect(callArg.supplier.id).toBe(99); // Note: supplierId might be converted to object or ID depending on logic
        expect(callArg.items).toHaveLength(1);
        // expect(callArg.totalAmount).toBe(50); // 1 * 50
    });
    
    // Verify navigation
    await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/supply-chain/purchase-order', expect.anything());
    });
  });

  it('auto-fills default supplier when adding product if supplier not selected', async () => {
    renderComponent();
    await waitFor(() => expect(mockGetWarehouses).toHaveBeenCalled());
    
    // 1. Open Modal
    fireEvent.click(screen.getByText('选择商品'));
    
    // 2. Add Product (Mock returns product with defaultSupplierId=88)
    fireEvent.click(screen.getByText('Confirm Product'));
    
    // 3. Verify supplier input is auto-filled
    await waitFor(() => {
        expect(screen.getByText('Test Default Supplier')).toBeDefined();
        // Check if input value is set (now that mock accepts value)
        const input = screen.getByTestId('supplier-select') as HTMLInputElement;
        expect(input.value).toBe('88');
    });
    
    // 4. Select Warehouse
    const select = screen.getByTestId('warehouse-select');
    fireEvent.change(select, { target: { value: '1' } });
    
    // Verify warehouse auto-fill
    await waitFor(() => {
         expect(screen.getByDisplayValue('Manager A')).toBeDefined(); // Contact Name
    });

    // 5. Submit
    const submitBtn = screen.getByText('提交入库采购单');
    fireEvent.click(submitBtn);
    
    await waitFor(() => {
         expect(mockGenerateInboundPurchaseOrder).toHaveBeenCalled();
         const callArg = mockGenerateInboundPurchaseOrder.mock.calls[0][0];
         expect(callArg.supplier.id).toBe(88);
    });
  });

  it('validates missing required fields', async () => {
    renderComponent();
    
    // Add item first to enable submit button
    fireEvent.click(screen.getByText('选择商品'));
    fireEvent.click(screen.getByText('Confirm Product'));
    await waitFor(() => screen.getByText('Test Default Supplier'));
    
    const submitBtn = screen.getByText('提交入库采购单');
    fireEvent.click(submitBtn);
    
    // Should see validation errors
    // "请选择入库仓库"
    await waitFor(() => {
        expect(screen.getByText('请选择入库仓库')).toBeDefined();
    });
    
    expect(mockGenerateInboundPurchaseOrder).not.toHaveBeenCalled();
  });
});
