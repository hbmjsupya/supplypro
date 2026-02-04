import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Select, Spin, message } from 'antd';
import { getBanks, getBankById, BankDTO } from '../../services/bankService';

interface BankSelectProps {
  value?: number;
  onChange?: (value: number, bank: BankDTO) => void;
  placeholder?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
}

const BankSelect: React.FC<BankSelectProps> = ({
  value,
  onChange,
  placeholder = '请选择开户行',
  style,
  disabled = false,
}) => {
  const [options, setOptions] = useState<BankDTO[]>([]);
  const [fetching, setFetching] = useState(false);
  const fetchRef = useRef(0);

  const loadBanks = async (keyword: string = '') => {
    fetchRef.current += 1;
    const fetchId = fetchRef.current;
    setOptions([]);
    setFetching(true);

    try {
      const result = await getBanks({
        page: 0,
        size: 100, // Increase size to cover more banks
        keyword,
        status: true, // Only active banks
      });

      if (fetchId !== fetchRef.current) {
        // for fetch callback order
        return;
      }

      setOptions(result.content);
    } catch (error) {
      console.error('Failed to load banks', error);
      message.error('获取银行列表失败');
    } finally {
      if (fetchId === fetchRef.current) {
        setFetching(false);
      }
    }
  };

  // Debounce implementation
  const debounceFetcher = useMemo(() => {
    let timeoutId: any;
    return (value: string) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        loadBanks(value);
      }, 500); // 500ms debounce
    };
  }, []);

  // Initial load
  useEffect(() => {
    loadBanks('');
  }, []);

  // Fetch initial value details if provided and not in options
  useEffect(() => {
    if (value && !options.find((o) => o.id === value)) {
      getBankById(value).then((bank) => {
         if (bank) {
             setOptions((prev) => {
                 if (prev.find(p => p.id === bank.id)) return prev;
                 return [bank, ...prev];
             });
         }
      }).catch(err => console.error("Failed to fetch selected bank", err));
    }
  }, [value]); // Depend on value. Note: options dependency might cause loop if not careful.

  // Handle selection
  const handleChange = (val: number) => {
    const selectedBank = options.find((b) => b.id === val);
    if (onChange && selectedBank) {
      onChange(val, selectedBank);
    }
  };

  return (
    <Select
      showSearch
      value={value}
      placeholder={placeholder}
      style={style}
      defaultActiveFirstOption={false}
      filterOption={false}
      loading={fetching}
      notFoundContent={fetching ? <Spin size="small" /> : null}
      options={options.map((d) => ({
        value: d.id,
        label: d.shortName || d.name, // Display name instead of code
      }))}
      onSearch={debounceFetcher}
      onChange={handleChange}
      onFocus={() => {
        if (options.length === 0) {
            loadBanks('');
        }
      }}
      disabled={disabled}
    />
  );
};

export default BankSelect;
