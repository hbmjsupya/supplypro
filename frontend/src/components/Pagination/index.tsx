import React from 'react';
import { Pagination, PaginationProps } from 'antd';

interface TablePaginationProps extends PaginationProps {
  total: number;
  pageSize: number;
  current: number;
  onChange: (page: number, pageSize: number) => void;
  onShowSizeChange?: (current: number, size: number) => void;
  isLoading?: boolean;
}

const TablePagination: React.FC<TablePaginationProps> = ({
  total,
  pageSize,
  current,
  onChange,
  onShowSizeChange,
  isLoading,
  ...rest
}) => {
  // Mock intl if not available, or use props for flexibility
  // const intl = useIntl(); 

  if (total === 0) {
    return null; // Or return a "No Data" placeholder component if controlled externally
  }

  // Only show total count if total <= pageSize (and hide pager)
  // But AntD Pagination handles this via `hideOnSinglePage` if we wanted that. 
  // Requirement says: "When total <= current pageSize, only show total text, no pager buttons"
  // We can achieve this by customizing the `itemRender` or checking condition.
  
  const showPager = total > pageSize;

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'flex-end', 
      marginTop: 16,
      opacity: isLoading ? 0.5 : 1,
      pointerEvents: isLoading ? 'none' : 'auto'
    }}>
      {!showPager ? (
        <span style={{ color: '#999' }}>共 {total} 条</span>
      ) : (
        <Pagination
          total={total}
          pageSize={pageSize}
          current={current}
          onChange={onChange}
          onShowSizeChange={onShowSizeChange}
          showSizeChanger
          showQuickJumper
          showTotal={(total) => `共 ${total} 条`}
          pageSizeOptions={['10', '20', '50', '100']}
          {...rest}
        />
      )}
    </div>
  );
};

export default TablePagination;
