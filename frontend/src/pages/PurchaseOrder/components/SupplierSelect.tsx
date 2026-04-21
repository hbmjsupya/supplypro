import React, { useMemo, useState } from 'react';
import { Select, Spin, Empty } from 'antd';
import { getSuppliers, SupplierDTO } from '../../../services/supplierService';
import { debounce } from 'lodash';

interface SupplierSelectProps {
  value?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onChange?: (value: number, option: any) => void;
  placeholder?: string;
  id?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any; // Allow other props
}

const SupplierSelect: React.FC<SupplierSelectProps> = ({ value, onChange, placeholder = '请选择已启用的供应商', id, ...rest }) => {
  const [fetching, setFetching] = useState(false);
  const [options, setOptions] = useState<SupplierDTO[]>([]);

  // Only show active suppliers as per requirement
  const STATUS_FILTER = 'ACTIVE';

  const loadSuppliers = async (name: string) => {
    setFetching(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res: any = await getSuppliers({
        page: 0,
        size: 20,
        name,
        status: STATUS_FILTER
      });
      // Handle both Spring Data JPA (content) and MyBatis-Plus (records) page structures
      setOptions(res.content || res.records || []);
    } catch (error) {
      console.error('Failed to load suppliers', error);
    } finally {
      setFetching(false);
    }
  };

  const debouncedFetch = useMemo(() => {
    return debounce(loadSuppliers, 800);
  }, []);

  // Initial load - Ensure data is fetched when component mounts
  React.useEffect(() => {
    loadSuppliers('');
    return () => {
      debouncedFetch.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div title="仅显示已启用供应商">
      <Select
        id={id}
        data-testid="supplier-select"
        className="test-supplier-select"
        {...rest}
        showSearch
        value={value}
        placeholder={placeholder}
        filterOption={false}
        onSearch={debouncedFetch}
        onChange={onChange}
        notFoundContent={fetching ? <Spin size="small" /> : <Empty description="暂无可用供应商" />}
        loading={fetching}
        style={{ width: '100%' }}
      >
        {options.map((supplier) => (
          <Select.Option key={supplier.id} value={supplier.id}>
            {supplier.name} ({supplier.supplierNo})
          </Select.Option>
        ))}
      </Select>
      <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
        * 仅显示已启用供应商
      </div>
    </div>
  );
};

export default SupplierSelect;
