import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi, describe, beforeEach, it, expect } from 'vitest';
import PurchaseOrderDetail from '../PurchaseOrderDetail';
import * as purchaseOrderService from '../../../services/purchaseOrderService';

// Mock the service
vi.mock('../../../services/purchaseOrderService');

const mockSnapshotResponse = {
  dataSource: 'SNAPSHOT',
  data: {
    id: 50,
    orderNo: 'C202602131247001',
    status: 'PENDING',
    items: [
      {
        id: 161,
        quantity: 100,
        unitPrice: 10.50,
        totalPrice: 1050.00,
        productId: 1,
        spec: 'Standard',
        specName: 'Standard',
        skuCode: 'SKU001',
        productName: '高性能CPU处理器'
      }
    ],
    supplier: { 
        name: 'Office Depot Inc.',
        purchaser: { fullName: 'Purchaser Bob', username: 'bob' } 
    },
    totalAmount: 1050.00,
    payableAmount: 1050.00,
    settledAmount: 500.00,
    createdAt: '2026-02-13 12:47:34',
    contactName: 'Tester',
    contactPhone: '13800000000',
    detailAddress: 'Test Address 123',
    deliveryDate: '2026-02-18'
  },
  orderLogs: [
    {
      id: 40,
      operator: 'admin',
      operationType: 'STATUS_CHANGE',
      createdAt: '2026-02-13 12:47:34',
      remark: 'Inbound Purchase Order initialized with PENDING status'
    }
  ],
  refundRecords: [],
  settlementRecords: [
      {
          id: 1,
          settlementNo: 'SET001',
          totalAmount: 500.00,
          status: 'PAID',
          createdAt: '2026-02-14 10:00:00'
      },
      {
          id: 2,
          settlementNo: 'SET002',
          totalAmount: 200.00,
          status: 'PENDING',
          createdAt: '2026-02-15 10:00:00'
      }
  ]
};

describe('PurchaseOrderDetail Snapshot Verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (purchaseOrderService.getPurchaseOrderById as any).mockResolvedValue(mockSnapshotResponse);
  });

  it('renders snapshot data correctly including transient fields and settlement stats', async () => {
    render(
      <MemoryRouter initialEntries={['/purchase-orders/50']}>
        <Routes>
          <Route path="/purchase-orders/:id" element={<PurchaseOrderDetail />} />
        </Routes>
      </MemoryRouter>
    );

    // Wait for data to load
    await waitFor(() => expect(screen.queryByText('加载中...')).not.toBeInTheDocument());

    // Verify Order No
    expect(screen.getByText('C202602131247001')).toBeInTheDocument();

    // Verify Product Name
    expect(screen.getAllByText('高性能CPU处理器')[0]).toBeInTheDocument();

    // Verify Status Mapping
    expect(screen.getByText('待处理')).toBeInTheDocument();

    // Verify Log Operation Mapping
    expect(screen.getByText('状态更新')).toBeInTheDocument();

    // Verify Purchaser (New Feature)
    expect(screen.getByText('Purchaser Bob')).toBeInTheDocument();

    // Verify Creation Time (New Feature)
    // Use regex to be more flexible with whitespace or wrapping
    // Use getAllByText because the date might appear in logs as well
    expect(screen.getAllByText(/2026-02-13 12:47:34/).length).toBeGreaterThan(0);

    // Verify Settlement Stats (New Feature)
    // Use getAllByText because amounts might appear multiple times (e.g. in stats and table)
    // Payable: 1050.00
    expect(screen.getAllByText(/1050.00/).length).toBeGreaterThan(0);
    // Settled: 500.00
    expect(screen.getAllByText(/500.00/).length).toBeGreaterThan(0);
    // Settling: 200.00
    expect(screen.getAllByText(/200.00/).length).toBeGreaterThan(0);
    
    // Verify Unsettled Amount (Calculated)
    // Statistic component might split numbers, so we check text content of the container
    const unsettledTitle = screen.getByText('未结算金额');
    const statisticContainer = unsettledTitle.closest('.ant-statistic');
    expect(statisticContainer).toHaveTextContent('350.00');

    // Verify Settlement List
    expect(screen.getByText('SET001')).toBeInTheDocument();
    expect(screen.getByText('SET002')).toBeInTheDocument();
  });
});
