import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ProductPoolList from './ProductPoolList';
import request from '../../utils/request';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

// Mock request
vi.mock('../../utils/request', () => ({
    default: {
        get: vi.fn(),
        patch: vi.fn(),
        post: vi.fn(),
    }
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

// Mock matchMedia for Antd
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(), 
        removeListener: vi.fn(), 
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
});

describe('ProductPoolList Component Test', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        
        // Mock List Data
        (request.get as any).mockResolvedValue({
            data: {
                records: [
                    {
                        id: '1',
                        skuCode: 'P001',
                        name: 'Test Product',
                        status: 'PENDING_SELECTION',
                        brandZhName: 'Brand A',
                        skus: [{ name: 'Spec 1', skuCode: 'S001', costPrice: 10.0 }]
                    }
                ],
                total: 1
            }
        });
    });

    it('should display error modal when validation fails during selection', async () => {
        render(
            <BrowserRouter>
                <ProductPoolList />
            </BrowserRouter>
        );

        // Wait for list to load
        await waitFor(() => {
            expect(screen.getByText('Test Product')).toBeInTheDocument();
        });

        // Mock Patch Error (400)
        const errorResponse = {
            response: {
                data: {
                    code: 400,
                    message: '选品通过需补全以下必填项: 品牌 (Brand)'
                }
            }
        };
        (request.patch as any).mockRejectedValue(errorResponse);

        // Click "确认选品" (Select)
        const selectBtn = screen.getByText('确认选品');
        fireEvent.click(selectBtn);

        // Verify Modal appears
        await waitFor(() => {
            expect(screen.getByText('无法完成操作')).toBeInTheDocument();
            expect(screen.getByText('选品通过需补全以下必填项: 品牌 (Brand)')).toBeInTheDocument();
        });

        // Click "去编辑"
        const editBtn = screen.getByText('去编辑完善信息');
        fireEvent.click(editBtn);

        // Verify Navigation
        expect(mockNavigate).toHaveBeenCalledWith('/supply-chain/product-pool/edit/1');
    });
});