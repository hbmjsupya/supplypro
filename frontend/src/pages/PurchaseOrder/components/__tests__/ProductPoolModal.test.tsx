import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import ProductPoolModal from '../ProductPoolModal';
import { productService } from '../../../../services/productService';

// Mock productService
vi.mock('../../../../services/productService', () => ({
    productService: {
        getAll: vi.fn()
    }
}));

describe('ProductPoolModal', () => {
    const mockOnOk = vi.fn();
    const mockOnCancel = vi.fn();

    it('should fetch products with status=ON_SHELF when opened', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (productService.getAll as any).mockResolvedValue({
            content: [
                { id: 1, name: 'Product 1', status: 'ON_SHELF', skus: [{ id: 101, skuCode: 'SKU001', name: 'Spec 1', costPrice: 100 }] },
                { id: 2, name: 'Product 2', status: 'OFF_SHELF', skus: [{ id: 102, skuCode: 'SKU002', name: 'Spec 2', costPrice: 200 }] }
            ],
            total: 2
        });

        render(<ProductPoolModal open={true} onOk={mockOnOk} onCancel={mockOnCancel} />);

        await waitFor(() => {
            expect(productService.getAll).toHaveBeenCalledWith(expect.objectContaining({
                status: 'ON_SHELF'
            }));
        });

        // Verify only ON_SHELF product is displayed
        expect(screen.getByText('Product 1')).toBeDefined();
        // Product 2 should be filtered out by component logic if API returns it (double safety)
        expect(screen.queryByText('Product 2')).toBeNull();
    });

    it('should call onOk with selected items', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (productService.getAll as any).mockResolvedValue({
            content: [
                { id: 1, name: 'Product 1', status: 'ON_SHELF', skus: [{ id: 101, skuCode: 'SKU001', name: 'Spec 1', costPrice: 100 }] }
            ],
            total: 1
        });

        render(<ProductPoolModal open={true} onOk={mockOnOk} onCancel={mockOnCancel} />);

        await waitFor(() => screen.getByText('Product 1'));

        // Select the row (assuming checkbox is first column or handled by rowSelection)
        // Antd Table row selection usually has a checkbox
        const checkbox = document.querySelector('.ant-checkbox-input');
        if (checkbox) fireEvent.click(checkbox);

        // Click OK
        // AntD Modal OK button text might vary, usually "确 定" or "OK"
        const okButton = screen.getByRole('button', { name: /确\s*定|OK/i });
        fireEvent.click(okButton);

        expect(mockOnOk).toHaveBeenCalled();
        const selected = mockOnOk.mock.calls[0][0];
        expect(selected).toHaveLength(1);
        expect(selected[0].productId).toBe(1);
    });

    it('should fetch products with supplierId when provided', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (productService.getAll as any).mockResolvedValue({
            content: [],
            total: 0
        });

        render(<ProductPoolModal open={true} onOk={mockOnOk} onCancel={mockOnCancel} supplierId={123} />);

        await waitFor(() => {
            expect(productService.getAll).toHaveBeenCalledWith(expect.objectContaining({
                supplierId: 123
            }));
        });
    });
});
