import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import InboundOrderCreate from '../InboundOrderCreate';
import { BrowserRouter } from 'react-router-dom';
import { message } from 'antd';

// Mocks
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Use vi.hoisted for variables accessed in vi.mock
const { mockCreatePurchaseOrder, mockGetWarehouses } = vi.hoisted(() => {
  return { 
    mockCreatePurchaseOrder: vi.fn(),
    mockGetWarehouses: vi.fn().mockResolvedValue([
      { id: 1, name: 'Warehouse A', managers: [] }
    ])
  };
});

// Mock services
vi.mock('../../../services/warehouseService', () => ({
  getWarehouses: mockGetWarehouses,
}));

vi.mock('../../../services/purchaseOrderService', () => ({
  createPurchaseOrder: mockCreatePurchaseOrder,
}));

vi.mock('../../../utils/tracker', () => ({
  trackEvent: vi.fn(),
}));

// Mock SupplierSelect
vi.mock('../components/SupplierSelect', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default: ({ onChange }: any) => (
    <input data-testid="supplier-select" onChange={(e) => onChange(e.target.value)} />
  ),
}));

// Mock ProductPoolModal to simulate valid and invalid selections
vi.mock('../components/ProductPoolModal', () => ({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
  default: ({ open, onOk, onCancel }: any) => {
    if (!open) return null;
    return (
      <div data-testid="product-modal">
        <button onClick={() => onOk([
          {
            key: '101-SKU001',
            productId: 101, // Valid ID
            skuCode: 'SKU001',
            productName: 'Valid Product',
            specName: 'Spec A',
            costPrice: 50.00
          }
        ])}>Add Valid Product</button>
        
        <button onClick={() => onOk([
          {
            key: '102-SKU002',
            productId: undefined, // Invalid: Missing ID
            skuCode: 'SKU002',
            productName: 'Invalid Product',
            specName: 'Spec B',
            costPrice: 60.00
          }
        ])}>Add Invalid Product</button>
      </div>
    );
  }
}));

// Mock message and Select
vi.mock('antd', async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const actual = await importOriginal() as any;
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const MockSelect = ({ children, onChange, value, ...props }: any) => {
    return (
      <select
        value={value}
        onChange={(e) => onChange(isNaN(Number(e.target.value)) ? e.target.value : Number(e.target.value))}
        data-testid={props['data-testid'] || 'mock-select'}
      >
        {children}
      </select>
    );
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  MockSelect.Option = ({ children, value }: any) => (
    <option value={value}>{children}</option>
  );

  return {
    ...actual,
    Select: MockSelect,
    message: {
      ...actual.message,
      error: vi.fn(),
      success: vi.fn(),
    },
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

describe('InboundOrderCreate Validation Fix', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <InboundOrderCreate />
      </BrowserRouter>
    );
  };

  it('adds valid product correctly', async () => {
    renderComponent();
    
    // Open modal
    fireEvent.click(screen.getByText('选择商品'));
    
    // Select valid product
    fireEvent.click(screen.getByText('Add Valid Product'));
    
    // Check if added to table
    expect(screen.getByText('Valid Product')).toBeDefined();
    expect(screen.getByText('SKU001')).toBeDefined();
  });

  it('prevents adding product with missing ID', async () => {
    renderComponent();
    
    // Open modal
    fireEvent.click(screen.getByText('选择商品'));
    
    // Select invalid product
    fireEvent.click(screen.getByText('Add Invalid Product'));
    
    // Check error message
    expect(message.error).toHaveBeenCalledWith(expect.stringContaining('数据异常(缺失ID)'));
    
    // Check NOT added to table (Invalid Product text should not be visible in table)
    // Note: Since screen.queryByText searches whole document, and our mock button has the text,
    // we need to be careful. But the table row renders "Invalid Product" in the name column.
    // The button has "Add Invalid Product".
    // So searching for "Invalid Product" (exact) or checking the table rows is better.
    // Assuming table renders "Invalid Product" if added.
    
    // Better check: The table shouldn't show it.
    // We can check if "SKU002" is present.
    expect(screen.queryByText('SKU002')).toBeNull();
  });

  it('validates items before submission', async () => {
    renderComponent();
    
    // Fill required fields
    fireEvent.change(screen.getByTestId('supplier-select'), { target: { value: '1' } });
    
    // Fill warehouse (using custom mock select logic)
    // Note: The mock select expects children option with value.
    // In test setup we have mocked getWarehouses returning [{id:1...}]
    // We need to trigger the useEffect to load warehouses first
    await waitFor(() => expect(mockGetWarehouses).toHaveBeenCalled());
    const warehouseSelect = screen.getByTestId('warehouse-select');
    fireEvent.change(warehouseSelect, { target: { value: '1' } });

    // Fill contact info (auto-filled by warehouse selection in real app, but let's ensure they are filled)
    // Actually in the real component, selecting warehouse sets contact info via setFieldsValue.
    // But in test environment, we need to verify if that happens or manually fill if needed.
    // Let's manually fill to be safe as we are testing item validation.
    
    // Wait for form updates if any
    await waitFor(() => {});
    
    // Fill other required fields if not auto-filled
    const nameInput = screen.getByLabelText('联系人姓名');
    fireEvent.change(nameInput, { target: { value: 'Test Contact' } });
    
    const phoneInput = screen.getByLabelText('联系人电话');
    fireEvent.change(phoneInput, { target: { value: '1234567890' } });

    // Try to submit without items
    fireEvent.click(screen.getByText('提交入库采购单'));
    
    await waitFor(() => {
        expect(message.error).toHaveBeenCalledWith('请至少选择一个商品');
    });
    
    expect(mockCreatePurchaseOrder).not.toHaveBeenCalled();
  });
});
