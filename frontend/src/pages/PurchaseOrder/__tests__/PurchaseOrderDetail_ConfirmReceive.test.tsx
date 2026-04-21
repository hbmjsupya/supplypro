import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import '@testing-library/jest-dom'; // Import jest-dom for matchers
import PurchaseOrderDetail from '../PurchaseOrderDetail';
import * as service from '../../../services/purchaseOrderService';
import { vi, describe, test, expect, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('../../../services/purchaseOrderService');
vi.mock('../../../components/PageDoc', () => ({ default: () => <div data-testid="page-doc">PageDoc</div> }));
vi.mock('../components/LogisticsTracker', () => ({ default: () => <div data-testid="logistics-tracker">Tracker</div> }));

// Mock window.matchMedia
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

const mockGetPurchaseOrderById = service.getPurchaseOrderById as unknown as ReturnType<typeof vi.fn>;
const mockReceivePurchaseOrder = service.receivePurchaseOrder as unknown as ReturnType<typeof vi.fn>;

// Helper to create mock order
const createMockOrder = (status: string) => ({
    data: {
        id: 1,
        orderNo: 'PO123',
        status: status,
        supplierName: 'Test Supplier',
        items: [],
        totalAmount: 100,
        createdAt: '2023-01-01',
        deliveryDate: '2023-01-05'
    }
});

describe('PurchaseOrderDetail - Confirm Receive Button', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const renderWithRouter = () => {
        render(
            <MemoryRouter initialEntries={['/purchase-order/detail/1']}>
                <Routes>
                    <Route path="/purchase-order/detail/:id" element={<PurchaseOrderDetail />} />
                </Routes>
            </MemoryRouter>
        );
    };

    test('Button visible when Status is PENDING', async () => {
        mockGetPurchaseOrderById.mockResolvedValue(createMockOrder('PENDING'));
        renderWithRouter();
        await waitFor(() => {
            expect(screen.getByText('确认收货')).toBeInTheDocument();
        });
    });

    test('Button visible when Status is CONFIRMED', async () => {
        mockGetPurchaseOrderById.mockResolvedValue(createMockOrder('CONFIRMED'));
        renderWithRouter();
        await waitFor(() => {
            expect(screen.getByText('确认收货')).toBeInTheDocument();
        });
    });

    test('Button visible when Status is SHIPPED', async () => {
        mockGetPurchaseOrderById.mockResolvedValue(createMockOrder('SHIPPED'));
        renderWithRouter();
        await waitFor(() => {
            expect(screen.getByText('确认收货')).toBeInTheDocument();
        });
    });

    test('Button HIDDEN when Status is RECEIVED', async () => {
        mockGetPurchaseOrderById.mockResolvedValue(createMockOrder('RECEIVED'));
        renderWithRouter();
        await waitFor(() => {
            expect(screen.getByText('PO123')).toBeInTheDocument();
            expect(screen.queryByText('确认收货')).not.toBeInTheDocument();
        });
    });

    test('Button HIDDEN when Status is CANCELLED', async () => {
        mockGetPurchaseOrderById.mockResolvedValue(createMockOrder('CANCELLED'));
        renderWithRouter();
        await waitFor(() => {
            expect(screen.getByText('PO123')).toBeInTheDocument();
            expect(screen.queryByText('确认收货')).not.toBeInTheDocument();
        });
    });

    test('Clicking button calls receive API', async () => {
        mockGetPurchaseOrderById.mockResolvedValue(createMockOrder('SHIPPED'));
        mockReceivePurchaseOrder.mockResolvedValue({ code: 200, message: 'Success' });

        renderWithRouter();

        // 1. Click "Confirm Receive"
        await waitFor(() => {
            expect(screen.getByText('确认收货')).toBeInTheDocument();
        });
        fireEvent.click(screen.getByText('确认收货'));

        // 2. Wait for Modal and Click "OK"
        await waitFor(() => {
            // Check for modal content instead of title to avoid ambiguity with button text
            expect(screen.getByText('确认收到货物？此操作将记录收货人与时间。')).toBeInTheDocument();
        });
        
        // Find modal OK button (usually inside ant-modal-confirm-btns)
        const okButton = screen.getByRole('button', { name: 'OK' });
        fireEvent.click(okButton);

        // 3. Verify API call
        await waitFor(() => {
            expect(mockReceivePurchaseOrder).toHaveBeenCalledWith(1);
        });
    });
});
