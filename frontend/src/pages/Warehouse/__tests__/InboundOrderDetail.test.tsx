import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import InboundOrderDetail from '../InboundOrderDetail';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import * as warehouseService from '../../../services/warehouseService';
import * as purchaseOrderService from '../../../services/purchaseOrderService';
import * as tracker from '../../../utils/tracker';

// Mock services
vi.mock('../../../services/warehouseService');
vi.mock('../../../services/purchaseOrderService');
vi.mock('../../../utils/tracker');

// Mock Ant Design
vi.mock('antd', async (importOriginal) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const actual: any = await importOriginal();
    return {
        ...actual,
        message: {
            error: vi.fn(),
            success: vi.fn(),
            warning: vi.fn(),
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Result: ({ title, subTitle, extra }: any) => (
            <div data-testid="result">
                <h1>{title}</h1>
                <p>{subTitle}</p>
                <div>{extra}</div>
            </div>
        ),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Spin: ({ tip }: any) => <div data-testid="spin">{tip}</div>,
    };
});

describe('InboundOrderDetail', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders loading state initially', () => {
        render(
            <MemoryRouter initialEntries={['/supply-chain/inbound/123']}>
                <Routes>
                    <Route path="/supply-chain/inbound/:id" element={<InboundOrderDetail />} />
                </Routes>
            </MemoryRouter>
        );
        expect(screen.getByText('加载中...')).toBeInTheDocument();
    });

    it('renders 404 when order not found', async () => {
        vi.spyOn(warehouseService, 'getInboundOrder').mockResolvedValue(null);

        render(
            <MemoryRouter initialEntries={['/supply-chain/inbound/999']}>
                <Routes>
                    <Route path="/supply-chain/inbound/:id" element={<InboundOrderDetail />} />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('404')).toBeInTheDocument();
            expect(screen.getByText('未找到入库单信息')).toBeInTheDocument();
        });
    });

    it('renders error state when fetch fails', async () => {
        vi.spyOn(warehouseService, 'getInboundOrder').mockRejectedValue(new Error('Network Error'));

        render(
            <MemoryRouter initialEntries={['/supply-chain/inbound/123']}>
                <Routes>
                    <Route path="/supply-chain/inbound/:id" element={<InboundOrderDetail />} />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('出错了')).toBeInTheDocument();
            expect(screen.getByText('数据加载失败，请检查网络或联系管理员')).toBeInTheDocument();
        });
    });

    it('renders order details when load successful', async () => {
        const mockOrder = {
            id: '123',
            inboundNo: 'IN20231027001',
            poNo: 'PO20231027001',
            supplierId: '1',
            supplierName: 'Test Supplier',
            warehouseCode: 'WH001',
            status: 'RECEIVED',
            createTime: '2023-10-27T10:00:00Z',
            confirmTime: null,
            items: []
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vi.spyOn(warehouseService, 'getInboundOrder').mockResolvedValue(mockOrder as any);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vi.spyOn(purchaseOrderService, 'getPurchaseOrders').mockResolvedValue({ records: [] } as any);

        render(
            <MemoryRouter initialEntries={['/supply-chain/inbound/123']}>
                <Routes>
                    <Route path="/supply-chain/inbound/:id" element={<InboundOrderDetail />} />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => {
            // Check for inboundNo instead of ID because the component now displays inboundNo || id
            // Looking at the code: <Descriptions.Item label="入库单号">{orderInfo.inboundNo || orderInfo.id}</Descriptions.Item>
            expect(screen.getByText('IN20231027001')).toBeInTheDocument();
            expect(screen.getByText('Test Supplier')).toBeInTheDocument();
        });
    });

    it('retries loading when retry button clicked', async () => {
        const mockOrder = {
            id: '123',
            inboundNo: 'IN20231027001',
            poNo: 'PO20231027001',
            items: []
        };

        // First fail
        vi.spyOn(warehouseService, 'getInboundOrder').mockRejectedValueOnce(new Error('Fail'));
        // Second succeed
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vi.spyOn(warehouseService, 'getInboundOrder').mockResolvedValueOnce(mockOrder as any);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vi.spyOn(purchaseOrderService, 'getPurchaseOrders').mockResolvedValue({ records: [] } as any);

        render(
            <MemoryRouter initialEntries={['/supply-chain/inbound/123']}>
                <Routes>
                    <Route path="/supply-chain/inbound/:id" element={<InboundOrderDetail />} />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('出错了')).toBeInTheDocument();
        });

        // Ant Design inserts spaces in 2-char buttons
        const retryButton = screen.getByText(/重\s*试/);
        fireEvent.click(retryButton);

        await waitFor(() => {
            expect(screen.getByText('IN20231027001')).toBeInTheDocument();
        });
    });

    it('renders 403 when permission denied', async () => {
        // Mock the service to throw the specific error that the component expects
        vi.spyOn(warehouseService, 'getInboundOrder').mockRejectedValueOnce(new Error('PERMISSION_DENIED'));

        render(
            <MemoryRouter initialEntries={['/supply-chain/inbound/123']}>
                <Routes>
                    <Route path="/supply-chain/inbound/:id" element={<InboundOrderDetail />} />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('403')).toBeInTheDocument();
            expect(screen.getByText('无权访问该入库单信息')).toBeInTheDocument();
        });
    });
});
