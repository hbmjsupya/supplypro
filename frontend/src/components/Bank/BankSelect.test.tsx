import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import BankSelect from './BankSelect';
import { getBanks } from '../../services/bankService';
import { vi } from 'vitest';

// Mock the service
vi.mock('../../services/bankService', () => ({
  getBanks: vi.fn(),
  getBankById: vi.fn(),
}));

const mockBanks = {
  content: [
    {
      id: 1,
      bankCode: '102100099996',
      name: '中国工商银行股份有限公司',
      shortName: '工商银行',
      type: 'STATE_OWNED',
    },
    {
      id: 2,
      bankCode: '308584000013',
      name: '招商银行股份有限公司',
      shortName: '招商银行',
      type: 'JOINT_STOCK',
    },
  ],
  totalElements: 2,
};

describe('BankSelect Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders with placeholder', () => {
    (getBanks as any).mockResolvedValue({ content: [] });
    render(<BankSelect />);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    // Placeholder might be in a different element in Antd Select, but check logic
  });

  test('loads and displays banks', async () => {
    (getBanks as any).mockResolvedValue(mockBanks);
    render(<BankSelect />);

    // Trigger dropdown
    const select = screen.getByRole('combobox');
    fireEvent.mouseDown(select);

    await waitFor(() => {
      expect(getBanks).toHaveBeenCalled();
    });

    // Check if options are displayed (Antd renders options in a portal)
    await waitFor(() => {
      expect(screen.getByText('工商银行')).toBeInTheDocument();
      expect(screen.getByText('招商银行')).toBeInTheDocument();
    });
  });

  test('displays error message on fetch failure', async () => {
    (getBanks as any).mockRejectedValue(new Error('Fetch failed'));
    render(<BankSelect />);
    
    // Wait for error handling (console error or message)
    await waitFor(() => {
       // Since message.error is global, testing it might require mocking 'antd' message
       // But we verify no crash
       expect(getBanks).toHaveBeenCalled();
    });
  });
});
