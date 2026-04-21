import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import PurchaseOrderDetail from '../PurchaseOrderDetail';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { message } from 'antd';
import * as purchaseOrderService from '../../../services/purchaseOrderService';

// Mock services
vi.mock('../../../services/purchaseOrderService');
vi.mock('../../../services/logisticsService', () => ({
    getLogisticsTrackByOrderId: vi.fn().mockResolvedValue([]),
    getLogisticsProviders: vi.fn().mockResolvedValue([]),
    getLogisticsCompanies: vi.fn().mockResolvedValue([
        { code: 'SF', name: '顺丰速运' },
        { code: 'YTO', name: '圆通速递' }
    ]),
}));

// Mock Ant Design Result component
vi.mock('antd', async (importOriginal) => {
    const actual = await importOriginal<any>();
    
    // Mock Modal
    const mockConfirm = vi.fn(({ onOk }) => onOk());
    const useModal = () => [{ confirm: mockConfirm }, null];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const OriginalModal = (actual as any).Modal;
    const MockModal = (props: any) => <OriginalModal {...props} />;
    Object.assign(MockModal, OriginalModal);
    MockModal.useModal = useModal;
    MockModal.confirm = mockConfirm;

    return {
        ...actual,
        Result: ({ title, subTitle, extra }: any) => (
            <div data-testid="mock-result">
                <div>{title}</div>
                <div>{subTitle}</div>
                <div>{extra}</div>
            </div>
        ),
        Modal: MockModal,
        message: {
            success: vi.fn(),
            error: vi.fn(),
            warning: vi.fn(),
        },
    };
});

const mockGetPurchaseOrderById = purchaseOrderService.getPurchaseOrderById as any;

describe('PurchaseOrderDetail', () => {
    const ORDER_ID = '123';

    beforeEach(() => {
        vi.clearAllMocks();
        mockGetPurchaseOrderById.mockReset();
    });

    it('renders and fetches data correctly', async () => {
        // Mock successful response
        mockGetPurchaseOrderById.mockResolvedValue({
            id: 123,
            orderNo: 'PO-123',
            status: 'PENDING',
            createTime: '2023-01-01 10:00:00',
            supplierName: 'Test Supplier',
            items: [],
            refundRecords: [],
            orderLogs: []
        });

        render(
            <MemoryRouter initialEntries={[`/purchase-order/${ORDER_ID}`]}>
                <Routes>
                    <Route path="/purchase-order/:id" element={<PurchaseOrderDetail />} />
                </Routes>
            </MemoryRouter>
        );

        // Wait for data to load
        await waitFor(() => {
            expect(screen.getByText('PO-123')).toBeInTheDocument();
            expect(screen.getByText('Test Supplier')).toBeInTheDocument();
        });
    });

    it('shows error message and retry button when fetch fails', async () => {
        // Mock error response
        const errorMessage = '数据服务维护中，请稍后刷新或联系管理员';
        mockGetPurchaseOrderById.mockRejectedValue({
            response: {
                data: {
                    message: errorMessage
                }
            }
        });

        render(
            <MemoryRouter initialEntries={[`/purchase-order/${ORDER_ID}`]}>
                <Routes>
                    <Route path="/purchase-order/:id" element={<PurchaseOrderDetail />} />
                </Routes>
            </MemoryRouter>
        );

        // Wait for error message
        await waitFor(() => {
            expect(screen.getByText('获取详情失败')).toBeInTheDocument();
        });

        // Verify buttons
        // Note: Ant Design might insert spaces in 2-character buttons (e.g., "重 试")
        expect(screen.getByRole('button', { name: /重\s*试/ })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /联系管理员/ })).toBeInTheDocument();
    });

    it('retries fetching data when retry button is clicked', async () => {
        let callCount = 0;
        mockGetPurchaseOrderById.mockImplementation(() => {
            callCount++;
            // Fail first call
            if (callCount === 1) return Promise.reject({ message: 'Network Error' });
            // Succeed 2nd call (Retry button)
            return Promise.resolve({
                id: 123,
                orderNo: 'PO-123-RETRY',
                status: 'PENDING',
                items: []
            });
        });

        render(
            <MemoryRouter initialEntries={[`/purchase-order/${ORDER_ID}`]}>
                <Routes>
                    <Route path="/purchase-order/:id" element={<PurchaseOrderDetail />} />
                </Routes>
            </MemoryRouter>
        );

        // Wait for first failure
        await waitFor(() => {
            expect(screen.getByText('Network Error')).toBeInTheDocument();
        });

        // Click retry
        const retryButton = screen.getByRole('button', { name: /重\s*试/ });
        fireEvent.click(retryButton);

        // Wait for success
        await waitFor(() => {
            expect(screen.getByText('PO-123-RETRY')).toBeInTheDocument();
        });

        expect(mockGetPurchaseOrderById).toHaveBeenCalledTimes(2);
    });

    describe('Ship Order', () => {
        const PO_ID = 123;
        const mockShipPurchaseOrder = purchaseOrderService.shipPurchaseOrder as any;

        it('successfully ships an order and refreshes data', async () => {
             mockGetPurchaseOrderById.mockResolvedValue({
                id: PO_ID,
                orderNo: 'PO-123',
                status: 'CONFIRMED',
                shippingStatus: 'TO_SHIP', // Required to show ship button
                createTime: '2023-01-01 10:00:00',
                supplierName: 'Test Supplier',
                items: [],
                refundRecords: [],
                orderLogs: []
            });
            mockShipPurchaseOrder.mockResolvedValue({});
            
            render(
                <MemoryRouter initialEntries={[`/purchase-order/${PO_ID}`]}>
                    <Routes>
                        <Route path="/purchase-order/:id" element={<PurchaseOrderDetail />} />
                    </Routes>
                </MemoryRouter>
            );

            // Wait for data to load
            await waitFor(() => {
                expect(screen.getByText('PO-123')).toBeInTheDocument();
            });

            // Find and click ship button
            const shipBtn = screen.getByTestId('ship-button');
            fireEvent.click(shipBtn);

            // Wait for modal to appear
            await waitFor(() => {
                expect(screen.getByLabelText('物流公司')).toBeInTheDocument();
            });
            
            // Fill form fields
            const shipNoInput = screen.getByLabelText('运单号');
            fireEvent.change(shipNoInput, { target: { value: 'SF123456' } });

            const companySelect = screen.getByLabelText('物流公司');
            fireEvent.mouseDown(companySelect);
            const option = await screen.findByText('顺丰速运');
            fireEvent.click(option);

            // Click OK on Modal
            const okBtn = screen.getByRole('button', { name: /确\s*定|OK/i });
            fireEvent.click(okBtn);

            // Verify API call and success message
            await waitFor(() => {
                expect(mockShipPurchaseOrder).toHaveBeenCalled();
                expect(message.success).toHaveBeenCalledWith('发货信息已提交');
            });

            // Should be called 2 times: initial load + after shipping
            expect(mockGetPurchaseOrderById).toHaveBeenCalledTimes(2);
        });

        it('shows warning when shipping succeeds but data refresh fails', async () => {
           const successResponse = {
               id: PO_ID,
               orderNo: 'PO-123',
               status: 'CONFIRMED',
               shippingStatus: 'TO_SHIP', // Required to show ship button
               createTime: '2023-01-01 10:00:00',
               supplierName: 'Test Supplier',
               items: [],
               refundRecords: [],
               orderLogs: []
           };

           let callCount = 0;
           mockGetPurchaseOrderById.mockImplementation(() => {
               callCount++;
               // Succeed first call
               if (callCount === 1) return Promise.resolve(successResponse);
               // Fail 2nd call (Refresh)
               return Promise.reject({ message: 'Network Error' });
           });

           mockShipPurchaseOrder.mockResolvedValue({});
           
           render(
               <MemoryRouter initialEntries={[`/purchase-order/${PO_ID}`]}>
                   <Routes>
                       <Route path="/purchase-order/:id" element={<PurchaseOrderDetail />} />
                   </Routes>
               </MemoryRouter>
           );

           // Wait for data to load
           await waitFor(() => {
               expect(screen.getByText('PO-123')).toBeInTheDocument();
           });

           // Find and click ship button
           const shipBtn = screen.getByTestId('ship-button');
           fireEvent.click(shipBtn);

           // Wait for modal to appear
           await waitFor(() => {
               expect(screen.getByLabelText('物流公司')).toBeInTheDocument();
           });
           
           // Fill form fields
            const shipNoInput = screen.getByLabelText('运单号');
            fireEvent.change(shipNoInput, { target: { value: 'SF123456' } });

           const companySelect = screen.getByLabelText('物流公司');
           fireEvent.mouseDown(companySelect);
           const option = await screen.findByText('顺丰速运');
           fireEvent.click(option);

           // Click OK on Modal
            const okBtn = screen.getByRole('button', { name: /确\s*定|OK/i });
            fireEvent.click(okBtn);

           // Verify API call and warning
           await waitFor(() => {
                expect(mockShipPurchaseOrder).toHaveBeenCalled();
                expect(message.success).toHaveBeenCalledWith('发货信息已提交');
                expect(message.warning).toHaveBeenCalledWith('发货信息已提交，但状态同步失败，请手动刷新页面');
            });

           // Should be called 2 times
           expect(mockGetPurchaseOrderById).toHaveBeenCalledTimes(2);
       });
        it('displays correct shipping status for Received order', async () => {
             mockGetPurchaseOrderById.mockResolvedValue({
                 id: PO_ID,
                 orderNo: 'PO-123',
                 status: 'RECEIVED',
                 shippingStatus: 'RECEIVED',
                 createTime: '2023-01-01 10:00:00',
                 supplierName: 'Test Supplier',
                 items: [],
                 refundRecords: [],
                 orderLogs: []
             });

             render(
                 <MemoryRouter initialEntries={[`/purchase-order/${PO_ID}`]}>
                     <Routes>
                         <Route path="/purchase-order/:id" element={<PurchaseOrderDetail />} />
                     </Routes>
                 </MemoryRouter>
             );

             await waitFor(() => {
                 expect(screen.getByText('PO-123')).toBeInTheDocument();
             });
             
             // Should show "已收货"
             expect(screen.getAllByText('已收货').length).toBeGreaterThan(0);
        });

        it('displays Completed shipping status when order is Completed, even if shipping is Received', async () => {
             mockGetPurchaseOrderById.mockResolvedValue({
                 id: PO_ID,
                 orderNo: 'PO-123',
                 status: 'COMPLETED',
                 shippingStatus: 'RECEIVED', // Backend might not update shippingStatus
                 createTime: '2023-01-01 10:00:00',
                 supplierName: 'Test Supplier',
                 items: [],
                 refundRecords: [],
                 orderLogs: []
             });

             render(
                 <MemoryRouter initialEntries={[`/purchase-order/${PO_ID}`]}>
                     <Routes>
                         <Route path="/purchase-order/:id" element={<PurchaseOrderDetail />} />
                     </Routes>
                 </MemoryRouter>
             );

             await waitFor(() => {
                 expect(screen.getByText('PO-123')).toBeInTheDocument();
             });
             
             // Should show "已完成"
             expect(screen.getAllByText('已完成').length).toBeGreaterThan(0);
        });
    });
});
