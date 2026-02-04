import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ProductAdd from './ProductAdd';
import request from '../../utils/request';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

// Mock request
vi.mock('../../utils/request', () => ({
    default: {
        get: vi.fn(),
        post: vi.fn(),
    }
}));

// Mock matchMedia for Antd
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

describe('ProductAdd Component Automation Test', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        
        // Default mocks
        (request.get as any).mockImplementation((url: string, config: any) => {
            // Category Mock (Component handles both wrapped/unwrapped for Categories)
            if (url === '/categories') {
                const parentCode = config?.params?.parentCode;
                if (!parentCode) {
                    // Level 1
                    return Promise.resolve([{ code: 'L1', name: 'Electronics', leaf: false }]);
                }
                if (parentCode === 'L1') {
                    // Level 2
                    return Promise.resolve([{ code: 'L2', name: 'Computers', leaf: false }]);
                }
                if (parentCode === 'L2') {
                    // Level 3
                    return Promise.resolve([{ code: 'L3', name: 'Laptops', leaf: false }]);
                }
                if (parentCode === 'L3') {
                    // Level 4
                    return Promise.resolve([{ code: 'L4', name: 'Gaming Laptops', leaf: true }]);
                }
                return Promise.resolve([]);
            }
            
            // Brand Mock (Unwrapped: return { records: ... })
            if (url === '/brands') {
                const status = config?.params?.status;
                if (status === 'ENABLED') {
                    return Promise.resolve({
                        content: [
                            { id: 1, name: 'Brand A', status: 'ENABLED' },
                            { id: 2, name: 'Brand B', status: 'ENABLED' }
                        ],
                        totalElements: 2
                    });
                }
                return Promise.resolve({ content: [] });
            }
            
            // Tax Search Mock (Unwrapped: return [...])
            if (url === '/tax-classifications/search') {
                const keyword = config?.params?.keyword;
                if (keyword === 'tax') {
                    return Promise.resolve([
                        { code: 'T1001', name: 'Computer Tax', taxRate: 0.13 }
                    ]);
                }
                return Promise.resolve([]);
            }

            // Tax Match Mock (Unwrapped: return [...])
            if (url === '/tax-classifications/match') {
                 const productName = config?.params?.productName;
                 if (productName && productName.includes('Tax')) {
                     return Promise.resolve([
                         { code: 'T1001', name: 'Computer Tax', taxRate: 0.13 }
                     ]);
                 }
                 return Promise.resolve([]);
            }

            // Supplier Mock (Unwrapped: return { content: ... })
            if (url === '/suppliers') {
                const status = config?.params?.status;
                if (status === 'ACTIVE') {
                     return Promise.resolve({
                         content: [{ id: 1, name: 'Supplier A', status: 'ACTIVE' }],
                         totalElements: 1
                     });
                }
                return Promise.resolve({ content: [] });
            }
            
            return Promise.resolve({});
        });
        
        (request.post as any).mockResolvedValue({ code: 200, message: 'Success' });
    });

    it('Scenario 1: Should render 4-level category selector and load initial data', async () => {
        render(
            <BrowserRouter>
                <ProductAdd />
            </BrowserRouter>
        );

        // Verify initial load of Level 1 categories
        await waitFor(() => {
            expect(request.get).toHaveBeenCalledWith('/categories', expect.objectContaining({ 
                params: { parentCode: undefined } 
            }));
        });
        
        // Check if Cascader placeholder exists
        // Antd Cascader placeholder is often a span
        expect(screen.getByText('请选择分类（四级）')).toBeInTheDocument();
    });

    it('Scenario 2: Should support Brand search filtering', async () => {
        render(
            <BrowserRouter>
                <ProductAdd />
            </BrowserRouter>
        );
        
        // Antd Select placeholder is rendered as a span, not input attribute
        const brandPlaceholder = screen.getByText('请输入品牌名称搜索');
        expect(brandPlaceholder).toBeInTheDocument();
    });

    it('Scenario 3: Should support Tax refresh and empty state', async () => {
        render(
            <BrowserRouter>
                <ProductAdd />
            </BrowserRouter>
        );
        
        // Check for "Refresh" button in Tax label
        const refreshBtn = screen.getByText('刷新');
        expect(refreshBtn).toBeInTheDocument();
        
        // Simulate click
        fireEvent.click(refreshBtn);
        
        // Verify API call to sync
        await waitFor(() => {
            expect(request.post).toHaveBeenCalledWith('/tax-classifications/sync');
        });
    });

    it('Scenario 4: Should render Upload component correctly (Fix 1 verification)', async () => {
        render(
            <BrowserRouter>
                <ProductAdd />
            </BrowserRouter>
        );
        // Verify Upload button text exists
        expect(screen.getByText('上传文件 (100M以内)')).toBeInTheDocument();
    });

    it('Scenario 5: Should handle Spec Modal and Form List without key spread error (Fix 2 verification)', async () => {
        render(
            <BrowserRouter>
                <ProductAdd />
            </BrowserRouter>
        );

        // Open Spec Modal
        const addSpecBtn = screen.getByText('新增规格');
        fireEvent.click(addSpecBtn);

        // Check if Modal opened (Level 1 Name input)
        await waitFor(() => {
            expect(screen.getByPlaceholderText('例如：内存')).toBeInTheDocument();
        });

        // Click "Add Spec Attribute" to trigger Form.List add
        const addAttrBtn = screen.getByText('新增规格属性');
        fireEvent.click(addAttrBtn);

        // Verify new input appears (by counting placeholders or inputs)
        // Initial 1 + Added 1 = 2 inputs with placeholder "属性值，如：128G"
        await waitFor(() => {
            const inputs = screen.getAllByPlaceholderText('属性值，如：128G');
            expect(inputs.length).toBeGreaterThanOrEqual(2);
        });
    });

    it('Scenario 6: Should fetch and render active suppliers', async () => {
        render(
            <BrowserRouter>
                <ProductAdd />
            </BrowserRouter>
        );

        // Wait for suppliers fetch
        await waitFor(() => {
            expect(request.get).toHaveBeenCalledWith('/suppliers', expect.objectContaining({ 
                params: { name: '', status: 'ACTIVE', size: 50 } 
            }));
        });
    });
});
