import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import PurchaseOrderList from '../PurchaseOrderList';
import * as purchaseOrderService from '../../../services/purchaseOrderService';
import * as logisticsService from '../../../services/logisticsService';

// Mock services
vi.mock('../../../services/purchaseOrderService');
vi.mock('../../../services/logisticsService');

const mockGetPurchaseOrders = purchaseOrderService.getPurchaseOrders as any;
const mockGetLogisticsProviders = logisticsService.getLogisticsProviders as any;

describe('PurchaseOrderList Status Display', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockGetLogisticsProviders.mockResolvedValue([]);
    });

    it('displays "已收货" when status is RECEIVED', async () => {
        const mockPO = {
            id: 1,
            orderNo: 'PO-123',
            status: 'RECEIVED',
            shippingStatus: 'RECEIVED',
            items: [{ productName: 'Test Product', quantity: 1, unitPrice: 10 }],
            totalAmount: 10,
            createdAt: '2023-01-01',
            type: 'OrderPurchase'
        };

        mockGetPurchaseOrders.mockResolvedValue({
            content: [mockPO],
            totalElements: 1
        });

        render(
            <MemoryRouter>
                <PurchaseOrderList />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('PO-123')).toBeInTheDocument();
        });

        const receivedText = screen.getByText('已收货');
        expect(receivedText).toBeInTheDocument();
    });
});
