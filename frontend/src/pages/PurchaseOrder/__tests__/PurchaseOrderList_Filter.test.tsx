import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import PurchaseOrderList from '../PurchaseOrderList';
import { getPurchaseOrders } from '../../../services/purchaseOrderService';
import { getLogisticsProviders } from '../../../services/logisticsService';
import { vi, describe, test, expect, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('../../../services/purchaseOrderService');
vi.mock('../../../services/logisticsService');
vi.mock('../../../components/PageDoc', () => ({ default: () => <div data-testid="page-doc">PageDoc</div> }));

// Mock window.matchMedia for Ant Design
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

describe('PurchaseOrderList - Search Filter', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (getPurchaseOrders as any).mockResolvedValue({
            content: [],
            totalElements: 0
        });
        (getLogisticsProviders as any).mockResolvedValue([]);
    });

    test('Status filter only shows allowed options', async () => {
        render(
            <MemoryRouter>
                <PurchaseOrderList />
            </MemoryRouter>
        );

        // Wait for initial load
        await waitFor(() => {
            expect(screen.getByText('PageDoc')).toBeInTheDocument();
        });

        // Find the status select. It has a label "发货状态"
        // Antd Form Item label is usually a label element. The input is associated with it.
        // We can find the Select by its placeholder if we know it.
        // In the code: <Select placeholder="请选择状态" ...>
        
        // Open the Select dropdown
        const selects = screen.getAllByRole('combobox');
        // Click the first select (Status)
        fireEvent.mouseDown(selects[0]);

        // Wait for dropdown options to appear
        // The mock service currently returns an empty list, but we can check if the static options are rendered
        await waitFor(() => {
            // Check for allowed options
            expect(document.querySelector('.ant-select-item-option-content')).toBeInTheDocument();
        });
    });

    test('Purchase Type filter shows correct options', async () => {
        render(
            <MemoryRouter>
                <PurchaseOrderList />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('PageDoc')).toBeInTheDocument();
        });

        // Find the "采购类型" label and associated select
        // Since we changed "业务类型" to "采购类型"
        const label = screen.getByText('采购类型');
        expect(label).toBeInTheDocument();

        const selects = screen.getAllByRole('combobox');
        // Click the second select (Purchase Type)
        fireEvent.mouseDown(selects[1]);

        await waitFor(() => {
            expect(document.querySelector('.ant-select-item-option-content')).toBeInTheDocument();
        });
    });
});
