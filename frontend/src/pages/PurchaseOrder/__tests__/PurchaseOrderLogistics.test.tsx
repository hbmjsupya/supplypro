import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import PurchaseOrderLogistics from '../PurchaseOrderLogistics';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import * as purchaseOrderService from '../../../services/purchaseOrderService';
import * as logisticsService from '../../../services/logisticsService';

// Mock services
vi.mock('../../../services/purchaseOrderService');
vi.mock('../../../services/logisticsService');

const mockGetPurchaseOrders = purchaseOrderService.getPurchaseOrders as any;
const mockGetLogisticsTrackByTrackingNo = logisticsService.getLogisticsTrackByTrackingNo as any;

describe('PurchaseOrderLogistics', () => {
    const ORDER_NO = 'C202602240900001';
    const TRACKING_NO = 'YT3761367226619';

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders and fetches data correctly for order no', async () => {
        // Mock PO response
        mockGetPurchaseOrders.mockResolvedValue({
            content: [{
                id: 1,
                orderNo: ORDER_NO,
                poNo: ORDER_NO,
                purchaseOrderId: 1,
                status: 'SHIPPED',
                trackingNumber: TRACKING_NO,
                shipNo: TRACKING_NO,
                supplierName: 'Test Supplier',
                logisticsSupplierName: null, // DROPSHIP scenario
                items: []
            }]
        });

        // Mock Logistics response
        mockGetLogisticsTrackByTrackingNo.mockResolvedValue({
            success: true,
            state: '3',
            logisticCode: TRACKING_NO,
            traces: [
                { acceptTime: '2026-02-24 12:00:00', acceptStation: 'Delivered', action: '3' }
            ]
        });

        render(
            <MemoryRouter initialEntries={[`/logistics/${ORDER_NO}`]}>
                <Routes>
                    <Route path="/logistics/:id" element={<PurchaseOrderLogistics />} />
                </Routes>
            </MemoryRouter>
        );

        // Wait for PO data to load
        await waitFor(() => {
            expect(screen.getByText(ORDER_NO)).toBeInTheDocument();
            expect(screen.getAllByText('Test Supplier')[0]).toBeInTheDocument(); // Appears in both Supplier and Logistics Supplier
        });

        // Verify logistics data fetch
        await waitFor(() => {
            expect(mockGetLogisticsTrackByTrackingNo).toHaveBeenCalledWith(TRACKING_NO, expect.anything());
            expect(screen.getByText('Delivered')).toBeInTheDocument();
        });
    });

    it('shows error when PO not found', async () => {
        mockGetPurchaseOrders.mockResolvedValue({ content: [] });

        render(
            <MemoryRouter initialEntries={[`/logistics/${ORDER_NO}`]}>
                <Routes>
                    <Route path="/logistics/:id" element={<PurchaseOrderLogistics />} />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => {
            // It actually shows "无法加载物流信息" because it falls back to the empty state when no data is mapped
            expect(screen.getByText('无法加载物流信息')).toBeInTheDocument();
        });
    });
});
