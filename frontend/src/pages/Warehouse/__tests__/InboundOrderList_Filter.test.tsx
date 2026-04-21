import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import dayjs from 'dayjs';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import InboundOrderList from '../InboundOrderList';
import * as warehouseService from '../../../services/warehouseService';

// Mock dependencies
vi.mock('../../../services/warehouseService');
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

// Mock window.matchMedia for Ant Design
window.matchMedia = window.matchMedia || function() {
  return {
    matches: false,
    addListener: function() {},
    removeListener: function() {}
  };
};

describe('InboundOrderList Filter Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('restores filters from localStorage and converts date strings to dayjs objects', async () => {
    // Setup saved filters with string dates
    const savedFilters = {
      inboundDateRange: ['2023-10-01', '2023-10-31'],
      status: 'PENDING'
    };
    localStorage.setItem('inbound_order_filters', JSON.stringify(savedFilters));

    // Mock API response
    (warehouseService.getInboundOrders as any).mockResolvedValue({
      records: [],
      total: 0
    });
    (warehouseService.getWarehouseNameMap as any).mockResolvedValue({});
    (warehouseService.getWarehouses as any).mockResolvedValue([]);
    (warehouseService.getInboundOrderStatusSummary as any).mockResolvedValue({
      total: 0,
      statusList: []
    });

    // Render component
    render(
      <MemoryRouter>
        <InboundOrderList />
      </MemoryRouter>
    );

    // Wait for initial load
    await waitFor(() => {
      expect(warehouseService.getInboundOrders).toHaveBeenCalled();
    });

    // Verify API called with correct date strings (implies filterForm setFieldsValue worked correctly)
    expect(warehouseService.getInboundOrders).toHaveBeenCalledWith(expect.objectContaining({
      startDate: '2023-10-01',
      endDate: '2023-10-31',
      status: 'PENDING'
    }));
    
    // Check if DatePicker has correct value (by checking input value if possible, or just checking if component didn't crash)
    const inputs = screen.getAllByPlaceholderText('开始日期');
    expect(inputs.length).toBeGreaterThan(0);
    // Usually input value is '2023-10-01'
    expect((inputs[0] as HTMLInputElement).value).toBe('2023-10-01');
  });

  it('handles empty date range gracefully', async () => {
    const savedFilters = {
      status: 'COMPLETED'
    };
    localStorage.setItem('inbound_order_filters', JSON.stringify(savedFilters));

    (warehouseService.getInboundOrders as any).mockResolvedValue({ records: [], total: 0 });
    (warehouseService.getWarehouseNameMap as any).mockResolvedValue({});
    (warehouseService.getWarehouses as any).mockResolvedValue([]);
    (warehouseService.getInboundOrderStatusSummary as any).mockResolvedValue({ total: 0, statusList: [] });

    render(
      <MemoryRouter>
        <InboundOrderList />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(warehouseService.getInboundOrders).toHaveBeenCalledWith(expect.objectContaining({
        status: 'COMPLETED'
      }));
    });
  });
});
