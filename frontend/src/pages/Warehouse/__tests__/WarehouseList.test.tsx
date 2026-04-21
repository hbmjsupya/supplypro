import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import WarehouseList from '../WarehouseList';
import { BrowserRouter } from 'react-router-dom';
import { message } from 'antd';
import * as warehouseService from '../../../services/warehouseService';
import request from '../../../utils/request';

// Mock services
vi.mock('../../../services/warehouseService', async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const actual: any = await importOriginal();
  return {
    ...actual,
    getWarehouses: vi.fn(),
    getInventoryBatches: vi.fn(),
    updateWarehouseStatus: vi.fn(),
    getNextWarehouseCode: vi.fn(),
    saveWarehouse: vi.fn(),
    deleteWarehouse: vi.fn(),
  };
});

// Mock Ant Design Dropdown to avoid Portal/Hover issues
vi.mock('antd', async (importOriginal) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const actual: any = await importOriginal();
    return {
        ...actual,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Dropdown: ({ menu, children }: any) => (
            <div data-testid="mock-dropdown">
                {children}
                <div className="mock-dropdown-menu">
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {menu?.items?.map((item: any) => (
                        item.type === 'divider' ? null :
                        <div 
                            key={item.key} 
                            onClick={item.onClick}
                            role="menuitem"
                        >
                            {item.label}
                        </div>
                    ))}
                </div>
            </div>
        ),
        message: {
            error: vi.fn(),
            success: vi.fn(),
        }
    };
});

// Mock request
vi.mock('../../../utils/request', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  }
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

describe('WarehouseList', () => {
  const mockWarehouses = [
    {
      id: '1',
      code: 'WH00001',
      name: 'Test Warehouse',
      province: 'Zhejiang',
      city: 'Hangzhou',
      district: 'Xihu',
      status: 'ACTIVE',
      createdAt: '2023-10-01T10:00:00',
      managers: [{ id: 'u1', username: 'Manager1' }],
      address: 'Test Address',
      provinceCode: '330000',
      cityCode: '330100',
      districtCode: '330106'
    }
  ];

  const mockBatches = [
      {
          warehouseCode: 'WH00001',
          skuId: 'S1',
          currentQty: 10,
          unitCost: 100
      }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (warehouseService.getWarehouses as any).mockResolvedValue(mockWarehouses);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (warehouseService.getInventoryBatches as any).mockResolvedValue(mockBatches);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (warehouseService.getNextWarehouseCode as any).mockResolvedValue('WH00002');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (warehouseService.saveWarehouse as any).mockResolvedValue({});
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (warehouseService.deleteWarehouse as any).mockResolvedValue({});
    
    // Mock fetch for regions
    window.fetch = vi.fn().mockResolvedValue({
        json: async () => ([
            {
                code: '330000',
                name: 'Zhejiang',
                children: [
                    {
                        code: '330100',
                        name: 'Hangzhou',
                        children: [
                            {
                                code: '330106',
                                name: 'Xihu'
                            }
                        ]
                    }
                ]
            }
        ])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any;

    // Mock request.get for users and details
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (request.get as any).mockImplementation((url: string) => {
        if (url.includes('/users/list')) {
            return Promise.resolve({
                content: [{ id: 'u1', username: 'Manager1' }, { id: 'u2', username: 'Manager2' }]
            });
        }
        if (url.includes('/warehouses/1')) {
            return Promise.resolve({
                ...mockWarehouses[0],
                managerIds: ['u1']
            });
        }
        return Promise.resolve({});
    });
  });

  it('opens edit modal and loads details correctly', async () => {
    render(
      <BrowserRouter>
        <WarehouseList />
      </BrowserRouter>
    );

    await waitFor(() => screen.getByText('Test Warehouse'));

    // Find the edit action (rendered by mock dropdown)
    const editBtn = screen.getByText('编辑');
    fireEvent.click(editBtn);

    // Wait for modal and form population
    // 'Test Address' is only in detail, not in table columns
    await waitFor(() => {
        expect(screen.getByDisplayValue('Test Address')).toBeInTheDocument();
    });

    // Verify region population (mocked response has provinceCode etc)
    // Cascader display is complex to test, but we can check if the form values are set
    // verifying display value of 'Test Address' confirms the detail request succeeded and form.setFieldsValue was called
  });

  it('renders warehouse list and stats correctly', async () => {
    render(
      <BrowserRouter>
        <WarehouseList />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Warehouse')).toBeInTheDocument();
      // Check stats: 10 * 100 = 1000
      expect(screen.getByText('¥1000.00')).toBeInTheDocument();
      expect(screen.getByText('Manager1')).toBeInTheDocument();
    });
  });

  it('handles status toggle', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (warehouseService.updateWarehouseStatus as any).mockResolvedValue();

    render(
      <BrowserRouter>
        <WarehouseList />
      </BrowserRouter>
    );

    await waitFor(() => screen.getByText('Test Warehouse'));

    const switchBtn = screen.getByRole('switch');
    expect(switchBtn).toHaveAttribute('aria-checked', 'true');

    fireEvent.click(switchBtn);

    expect(warehouseService.updateWarehouseStatus).toHaveBeenCalledWith('1', 'INACTIVE');
    
    await waitFor(() => {
       expect(switchBtn).toHaveAttribute('aria-checked', 'false');
    });
  });

  it('opens add modal and submits form', async () => {
    render(
        <BrowserRouter>
          <WarehouseList />
        </BrowserRouter>
    );

    await waitFor(() => screen.getByText('Test Warehouse'));

    // Click Add
    const addBtn = screen.getByText('新增仓库');
    fireEvent.click(addBtn);

    await waitFor(() => {
        expect(screen.getByText('WH00002')).toBeInTheDocument(); // Preview code
    });

    // Fill form
    // Use within modal to avoid conflict with search form (e.g., "所在地区")
    const modal = screen.getByRole('dialog');
    const withinModal = within(modal);

    fireEvent.change(withinModal.getByLabelText('库名'), { target: { value: 'New Warehouse' } });
    fireEvent.change(withinModal.getByLabelText('详细地址'), { target: { value: 'New Address' } });
    
    // Check fields exist
    expect(withinModal.getByLabelText('库名')).toBeInTheDocument();
    expect(withinModal.getByLabelText('所在地区')).toBeInTheDocument();
    expect(withinModal.getByLabelText('详细地址')).toBeInTheDocument();
    expect(withinModal.getByLabelText('仓库管理员')).toBeInTheDocument();

    // Try to submit empty to trigger validation
    // Find the primary button in the modal (usually OK/确定)
    // We use a flexible matcher for text or class since AntD Modal defaults can vary
    const okBtn = withinModal.queryByText('确 定') || withinModal.queryByText('确定') || withinModal.queryByText('OK') || modal.querySelector('.ant-btn-primary');
    
    // Ensure we found the button
    expect(okBtn).toBeInTheDocument();
    fireEvent.click(okBtn!);
    
    await waitFor(() => {
        // We filled Name and Address, but not Region/Manager.
        expect(withinModal.getByText('请选择所在地区')).toBeVisible();
    });
  });

  it('handles edit and populates form', async () => {
    render(
        <BrowserRouter>
          <WarehouseList />
        </BrowserRouter>
    );

    await waitFor(() => screen.getByText('Test Warehouse'));

    // Find the row
    // Note: getByRole('row', { name: ... }) matches the row text content
    // 'Test Warehouse' is in the first column.
    // However, Antd table rows can be tricky.
    // Let's use getByText('Test Warehouse') and traverse up to row?
    // Or just use getAllByText('操作') and take the last one (header is first, rows follow).
    
    // With Mock Dropdown, items are always rendered.
    // We just need to find the correct "编辑" button.
    // If there are multiple rows, we might have multiple "编辑".
    // Since we have 1 mock warehouse, getByText should work or getAllByText.
    
    await waitFor(() => {
        const editOptions = screen.getAllByText('编辑');
        const editOption = editOptions[editOptions.length - 1];
        expect(editOption).toBeVisible();
        fireEvent.click(editOption);
    });

    // Check modal title
    await waitFor(() => {
        expect(screen.getByText('编辑仓库')).toBeVisible();
        expect(screen.getByDisplayValue('Test Warehouse')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Test Address')).toBeInTheDocument();
    });
  });

  it('handles delete', async () => {
     render(
        <BrowserRouter>
          <WarehouseList />
        </BrowserRouter>
    );

    await waitFor(() => screen.getByText('Test Warehouse'));
    
    // With Mock Dropdown, items are always rendered.
    await waitFor(() => {
        const deleteOptions = screen.getAllByText('删除');
        const deleteOption = deleteOptions[deleteOptions.length - 1];
        fireEvent.click(deleteOption);
    });

    await waitFor(() => {
        expect(warehouseService.deleteWarehouse).toHaveBeenCalledWith('1');
    });
  });

  it('handles error when loading warehouse details fails', async () => {
    // Mock failure
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (request.get as any).mockImplementation((url: string) => {
        if (url.includes('/warehouses/1')) {
            return Promise.reject(new Error('Network Error'));
        }
        return Promise.resolve({});
    });

    render(
      <BrowserRouter>
        <WarehouseList />
      </BrowserRouter>
    );

    await waitFor(() => screen.getByText('Test Warehouse'));

    // Find the edit action (rendered by mock dropdown)
    // Note: there might be multiple "编辑" if there are multiple rows or re-renders, 
    // but here we likely have one row. Using getAllByText to be safe.
    const editOptions = screen.getAllByText('编辑');
    const editBtn = editOptions[0];
    fireEvent.click(editBtn);

    await waitFor(() => {
        expect(message.error).toHaveBeenCalledWith('加载仓库详情失败');
    });
  });

  it('handles missing optional fields in warehouse details', async () => {
    // Mock response with missing fields
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (request.get as any).mockImplementation((url: string) => {
        if (url.includes('/warehouses/1')) {
            return Promise.resolve({
                id: '1',
                code: 'WH00001',
                name: 'Test Warehouse',
                status: 'ACTIVE',
                // Missing managers, address, region codes
            });
        }
        return Promise.resolve({});
    });

    render(
      <BrowserRouter>
        <WarehouseList />
      </BrowserRouter>
    );

    await waitFor(() => screen.getByText('Test Warehouse'));

    const editOptions = screen.getAllByText('编辑');
    const editBtn = editOptions[0];
    fireEvent.click(editBtn);

    // Should open modal without crash
    await waitFor(() => {
        expect(screen.getByText('编辑仓库')).toBeVisible();
        // Check Name is populated
        expect(screen.getByDisplayValue('Test Warehouse')).toBeInTheDocument();
    });
  });
});
