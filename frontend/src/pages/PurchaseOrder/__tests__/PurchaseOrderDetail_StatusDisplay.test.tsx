import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { vi, describe, test, expect, beforeEach } from 'vitest';
import PurchaseOrderDetail from '../PurchaseOrderDetail';
import * as service from '../../../services/purchaseOrderService';

// Mock dependencies
vi.mock('../../../services/purchaseOrderService');
// Mock other components to isolate test
vi.mock('../../../components/PageDoc', () => ({ default: () => <div data-testid="page-doc">PageDoc</div> }));
vi.mock('../components/LogisticsTracker', () => ({ default: () => <div data-testid="logistics-tracker">Tracker</div> }));

// Helper to create mock order response
const createMockOrderResponse = (orderStatus: string, shippingStatus: string) => ({
    code: 200,
    data: {
        id: 1,
        orderNo: 'PO-TEST-123',
        status: orderStatus,
        shippingStatus: shippingStatus,
        supplier: { name: 'Test Supplier', purchaser: { username: 'buyer' } },
        items: [],
        totalAmount: 100,
        createdAt: '2023-01-01',
        deliveryDate: '2023-01-05',
        // Ensure other fields required by component are present
        payableAmount: 100,
        settledAmount: 0
    },
    refundRecords: [],
    orderLogs: []
});

describe('PurchaseOrderDetail - Status Display Sync', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const renderComponent = () => {
        render(
            <MemoryRouter initialEntries={['/purchase-order/detail/1']}>
                <Routes>
                    <Route path="/purchase-order/detail/:id" element={<PurchaseOrderDetail />} />
                </Routes>
            </MemoryRouter>
        );
    };

    test('Displays "已收货" when status is RECEIVED', async () => {
        (service.getPurchaseOrderById as any).mockResolvedValue(createMockOrderResponse('RECEIVED', 'RECEIVED'));

        renderComponent();

        await waitFor(() => {
            expect(screen.getByText('PO-TEST-123')).toBeInTheDocument();
        });

        expect(screen.getByText('已收货')).toBeInTheDocument();
    });

    test('Displays "已发货" when status is SHIPPED', async () => {
        (service.getPurchaseOrderById as any).mockResolvedValue(createMockOrderResponse('SHIPPED', 'SHIPPED'));

        renderComponent();

        await waitFor(() => {
            expect(screen.getByText('PO-TEST-123')).toBeInTheDocument();
        });

        expect(screen.getByText('已发货')).toBeInTheDocument();
    });

    test('Displays "已收货" when status is RECEIVED but not COMPLETED', async () => {
        (service.getPurchaseOrderById as any).mockResolvedValue(createMockOrderResponse('RECEIVED', 'RECEIVED'));

        renderComponent();

        await waitFor(() => {
            expect(screen.getByText('PO-TEST-123')).toBeInTheDocument();
        });

        expect(screen.getByText('已收货')).toBeInTheDocument();
    });
});
