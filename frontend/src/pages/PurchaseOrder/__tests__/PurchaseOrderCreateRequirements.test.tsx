import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import PurchaseOrderCreate from '../PurchaseOrderCreate';
import { generateInboundPurchaseOrder } from '../../../services/purchaseOrderService';
import { BrowserRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import dayjs from 'dayjs';

// Mock services
vi.mock('../../../services/supplierService', () => ({
  getSuppliers: vi.fn().mockResolvedValue([{ id: 1, name: 'Supplier A' }])
}));

vi.mock('../../../services/warehouseService', () => ({
  getWarehouses: vi.fn().mockResolvedValue([
    { id: 1, code: 'WH001', name: 'Warehouse A', province: 'P', city: 'C', district: 'D', address: 'Addr' }
  ])
}));

vi.mock('../../../services/purchaseOrderService', () => ({
  generateInboundPurchaseOrder: vi.fn().mockResolvedValue({})
}));

// Mock SupplierSelect
vi.mock('../components/SupplierSelect', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default: ({ onChange }: any) => (
    <div data-testid="supplier-select">
       <button onClick={() => onChange(1)}>Select Supplier A</button>
    </div>
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
            { key: '1', productId: 101, productName: 'Test Product', skuCode: 'TP001', specName: 'Spec', costPrice: 100, defaultSupplierId: 1 }
          ])}>
            Add Test Product
          </button>
        </div>
      );
    }
  };
});

// Mock Message and Antd Components
vi.mock('antd', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const actual: any = await vi.importActual('antd');
    return {
        ...actual,
        message: {
            ...actual.message,
            error: vi.fn(),
            success: vi.fn(),
            warning: vi.fn(),
            info: vi.fn(),
        },
        DatePicker: (props: any) => (
            <input 
                data-testid="mock-datepicker"
                onChange={(e) => props.onChange && props.onChange(dayjs(e.target.value))}
                value={props.value ? props.value.format('YYYY-MM-DD') : ''}
            />
        ),
        Select: (props: any) => (
            <select 
                data-testid="mock-select"
                onChange={(e) => props.onChange && props.onChange(e.target.value)}
                value={props.value}
            >
                {props.options?.map((opt: any) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
        ),
        InputNumber: (props: any) => (
            <input 
                type="number"
                data-testid="mock-inputnumber"
                onChange={(e) => props.onChange && props.onChange(Number(e.target.value))}
                value={props.value}
            />
        )
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

describe('PurchaseOrderCreate Requirements', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call generateInboundPurchaseOrder with correct type="INBOUND" and let backend handle others', async () => {
    render(
      <BrowserRouter>
        <PurchaseOrderCreate />
      </BrowserRouter>
    );

    // 1. Select Supplier
    fireEvent.click(screen.getByText('Select Supplier A'));

    // 2. Select Warehouse
    // Wait for warehouse data to load and Select to populate
    await waitFor(() => screen.getByTestId('mock-select'));
    const selects = screen.getAllByTestId('mock-select');
    // Assuming the first select is warehouse (based on order in code)
    fireEvent.change(selects[0], { target: { value: 'WH001' } });

    // 3. Select Date
    const datePicker = screen.getByTestId('mock-datepicker');
    fireEvent.change(datePicker, { target: { value: '2023-12-31' } });

    // 4. Add Product
    fireEvent.click(screen.getByText('批量添加商品'));
    fireEvent.click(screen.getByText('Add Test Product'));

    // 5. Submit
    const submitBtn = screen.getByText('生成入库采购单');
    // Wait for button to be enabled (it might be disabled if items empty, but we added items)
    await waitFor(() => expect(submitBtn).not.toBeDisabled());
    
    fireEvent.click(submitBtn);

    // 6. Verify Service Call
    await waitFor(() => {
      expect(generateInboundPurchaseOrder).toHaveBeenCalledTimes(1);
    });

    const callArg = (generateInboundPurchaseOrder as any).mock.calls[0][0];
    
    // Requirement 1: Type must be INBOUND
    expect(callArg.type).toBe('INBOUND');
    
    // Requirement 2 & 3 are backend responsibilities, so frontend should NOT send them (or send null)
    // to allow backend to generate them.
    expect(callArg.bizType).toBeUndefined();
    expect(callArg.orderNo).toBeUndefined();
    
    // Verify item structure
    expect(callArg.items).toHaveLength(1);
    expect(callArg.items[0].productId).toBe(101);
  });
});
