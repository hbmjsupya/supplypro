import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import WarehouseSearch from '../components/WarehouseSearch';

// Mock matchMedia for Antd
window.matchMedia = window.matchMedia || function() {
  return {
    matches: false,
    addListener: function() {},
    removeListener: function() {}
  };
};

// Mock request
vi.mock('../../../utils/request', () => ({
  default: {
    get: vi.fn(),
  }
}));

describe('WarehouseSearch', () => {
  const mockOnSearch = vi.fn();
  const mockAddressOptions = [
    { value: '330000', label: 'Zhejiang', children: [
        { value: '330100', label: 'Hangzhou', children: [
            { value: '330106', label: 'Xihu' }
        ]}
    ]}
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders search form', () => {
    render(<WarehouseSearch onSearch={mockOnSearch} addressOptions={mockAddressOptions} />);
    expect(screen.getByLabelText('库名/编号')).toBeInTheDocument();
    expect(screen.getByLabelText('所在地区')).toBeInTheDocument();
    expect(screen.getByText('搜索')).toBeInTheDocument();
  });

  it('calls onSearch with values when search button is clicked', async () => {
    render(<WarehouseSearch onSearch={mockOnSearch} addressOptions={mockAddressOptions} />);
    
    const keywordInput = screen.getByLabelText('库名/编号');
    fireEvent.change(keywordInput, { target: { value: 'Test' } });
    
    const searchBtn = screen.getByText('搜索').closest('button');
    fireEvent.click(searchBtn!);
    
    await waitFor(() => {
        expect(mockOnSearch).toHaveBeenCalledWith(expect.objectContaining({
            keyword: 'Test'
        }));
    });
  });

  it('resets form and calls onSearch with empty object', async () => {
    render(<WarehouseSearch onSearch={mockOnSearch} addressOptions={mockAddressOptions} />);
    
    const keywordInput = screen.getByLabelText('库名/编号');
    fireEvent.change(keywordInput, { target: { value: 'Test' } });
    
    const resetBtn = screen.getByText('重置').closest('button');
    fireEvent.click(resetBtn!);
    
    await waitFor(() => {
        expect(mockOnSearch).toHaveBeenCalledWith({});
    });
    expect(screen.getByLabelText('库名/编号')).toHaveValue('');
  });

  it('saves and loads search history', async () => {
    render(<WarehouseSearch onSearch={mockOnSearch} addressOptions={mockAddressOptions} />);
    
    const keywordInput = screen.getByLabelText('库名/编号');
    fireEvent.change(keywordInput, { target: { value: 'HistoryTest' } });
    
    const searchBtn = screen.getByText('搜索').closest('button');
    fireEvent.click(searchBtn!);
    
    await waitFor(() => {
        expect(screen.getByText(/HistoryTest/)).toBeInTheDocument();
    });
    
    expect(localStorage.getItem('warehouse_search_history')).toContain('HistoryTest');
  });

  it('saves and applies schemes', async () => {
    render(<WarehouseSearch onSearch={mockOnSearch} addressOptions={mockAddressOptions} />);
    
    // Enter values
    const keywordInput = screen.getByLabelText('库名/编号');
    fireEvent.change(keywordInput, { target: { value: 'SchemeTest' } });
    
    // Open Save Modal
    const saveBtn = screen.getByText('保存方案').closest('button');
    fireEvent.click(saveBtn!);
    
    // Enter scheme name
    const nameInput = screen.getByPlaceholderText('请输入方案名称');
    fireEvent.change(nameInput, { target: { value: 'MyScheme' } });
    
    // Confirm save (find OK button in Modal)
    // Antd Modal buttons are in the footer.
    const dialog = screen.getByRole('dialog');
    const footerBtns = dialog.querySelectorAll('button');
    const confirmBtn = footerBtns[footerBtns.length - 1]; 
    fireEvent.click(confirmBtn);
    
    await waitFor(() => {
        expect(screen.getByText('MyScheme')).toBeInTheDocument();
    });
    
    // Click scheme tag to apply
    fireEvent.click(screen.getByText('MyScheme'));
    
    await waitFor(() => {
        expect(mockOnSearch).toHaveBeenCalledWith(expect.objectContaining({
            keyword: 'SchemeTest'
        }));
    });
  });
});