import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import BundleList from '../BundleList';
import { BrowserRouter } from 'react-router-dom';
import * as requestModule from '../../../utils/request';

// Mock request
vi.mock('../../../utils/request', () => {
    return {
        default: {
            get: vi.fn(),
            post: vi.fn(),
            patch: vi.fn()
        }
    };
});

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate
    };
});

describe('BundleList Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(requestModule.default.get).mockReset();
        vi.mocked(requestModule.default.post).mockReset();
        vi.mocked(requestModule.default.patch).mockReset();
    });

    it('should render bundle list and verify refresh button is removed', async () => {
        // Mock data
        const mockData = {
            content: [
                {
                    id: 1,
                    name: 'Bundle 1',
                    status: 'ON_SHELF',
                    bundleItems: [
                        {
                            quantity: 1,
                            childProduct: {
                                name: 'Child 1',
                                skus: [{ costPrice: 10, supplier: { name: 'Supplier A' } }]
                            }
                        }
                    ]
                }
            ],
            totalElements: 1,
            number: 0
        };

        vi.mocked(requestModule.default.get).mockResolvedValue(mockData);

        render(
            <BrowserRouter>
                <BundleList />
            </BrowserRouter>
        );

        // Verify data load
        await waitFor(() => {
            expect(screen.getByText('Bundle 1')).toBeDefined();
        });

        // Verify Refresh button is NOT present
        const refreshBtn = screen.queryByText('刷新');
        expect(refreshBtn).toBeNull();

        // Verify Export button IS present
        expect(screen.getByText(/批量导出/)).toBeDefined();
    });

    it('should handle fetch errors gracefully', async () => {
        vi.mocked(requestModule.default.get).mockRejectedValue(new Error('Network Error'));
        
        // Mock console.error to avoid noise
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        render(
            <BrowserRouter>
                <BundleList />
            </BrowserRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('加载失败')).toBeDefined();
        });
        
        consoleSpy.mockRestore();
    });

    it('should render empty state when no bundle data', async () => {
        vi.mocked(requestModule.default.get).mockResolvedValue({
            content: [],
            totalElements: 0,
            number: 0
        });

        render(
            <BrowserRouter>
                <BundleList />
            </BrowserRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('暂无组合商品')).toBeDefined();
        });
    });

    it('should surface rate limit error message', async () => {
        vi.mocked(requestModule.default.get)
            .mockRejectedValueOnce({ response: { status: 429 } })
            .mockResolvedValueOnce({
                content: [],
                totalElements: 0,
                number: 0
            });

        render(
            <BrowserRouter>
                <BundleList />
            </BrowserRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('请求过于频繁，请稍后重试')).toBeDefined();
        });
    });

});
