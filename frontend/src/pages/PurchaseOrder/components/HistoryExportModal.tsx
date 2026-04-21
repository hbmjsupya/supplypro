import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Table, Button, Space, Tag, message, Typography, Empty, Spin } from 'antd';
import { HistoryOutlined, DownloadOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { getDeliveryExportRecords, downloadDeliveryExportRecord, DeliveryExportRecord } from '../../../services/deliveryExportService';
import { formatTimeSmart } from '../../../utils/dateFormatter';

const { Text } = Typography;

interface HistoryExportModalProps {
  open: boolean;
  onCancel: () => void;
}

const HistoryExportModal: React.FC<HistoryExportModalProps> = ({ open, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<DeliveryExportRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getDeliveryExportRecords({ page, size: pageSize });
      setRecords(response.content || []);
      setTotal(response.totalElements || response.total || 0);
    } catch (error: any) {
      console.error('Failed to fetch export records:', error);
      message.error('获取历史记录失败');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    if (open) {
      fetchRecords();
    }
  }, [open, fetchRecords]);

  const handleDownload = async (record: DeliveryExportRecord) => {
    setDownloadingId(record.id);
    try {
      await downloadDeliveryExportRecord(record.id);
      message.success('下载成功');
    } catch (error: any) {
      console.error('Download failed:', error);
      message.error('下载失败，请重试');
    } finally {
      setDownloadingId(null);
    }
  };

  const getStatusTag = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return <Tag color="success">成功</Tag>;
      case 'PARTIAL':
        return <Tag color="warning">部分成功</Tag>;
      case 'FAILED':
        return <Tag color="error">失败</Tag>;
      default:
        return <Tag>{status}</Tag>;
    }
  };

  const columns: ColumnsType<DeliveryExportRecord> = [
    {
      title: '文件名',
      dataIndex: 'fileName',
      key: 'fileName',
      width: '25%',
      ellipsis: true,
      render: (text: string) => <Text ellipsis={{ tooltip: text }}>{text}</Text>
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: '10%',
      render: (status: string) => getStatusTag(status)
    },
    {
      title: '导出条数',
      key: 'counts',
      width: '15%',
      render: (_: unknown, record: DeliveryExportRecord) => (
        <Space direction="vertical" size={0}>
          <Text style={{ fontSize: '12px' }}>总计: {record.totalCount}</Text>
          <Text type="success" style={{ fontSize: '12px' }}>成功: {record.successCount}</Text>
          {record.failCount > 0 && (
            <Text type="danger" style={{ fontSize: '12px' }}>失败: {record.failCount}</Text>
          )}
        </Space>
      )
    },
    {
      title: '导出时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: '20%',
      render: (time: string) => <Text style={{ fontSize: '12px' }}>{formatTimeSmart(time)}</Text>
    },
    {
      title: '操作人',
      dataIndex: 'createdBy',
      key: 'createdBy',
      width: '15%',
      render: (text: string) => <Text style={{ fontSize: '12px' }}>{text}</Text>
    },
    {
      title: '操作',
      key: 'action',
      width: '15%',
      render: (_: unknown, record: DeliveryExportRecord) => (
        <Button
          type="link"
          size="small"
          icon={<DownloadOutlined />}
          loading={downloadingId === record.id}
          onClick={() => handleDownload(record)}
        >
          下载
        </Button>
      )
    }
  ];

  return (
    <Modal
      title={
        <Space>
          <HistoryOutlined />
          <span>历史导出记录</span>
        </Space>
      }
      open={open}
      onCancel={onCancel}
      footer={[
        <Button key="close" onClick={onCancel}>
          关闭
        </Button>
      ]}
      width={900}
      bodyStyle={{ padding: '24px', overflowX: 'auto' }}
    >
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          icon={<ReloadOutlined />}
          onClick={fetchRecords}
          loading={loading}
          type="default"
        >
          刷新
        </Button>
      </div>

      <Spin spinning={loading}>
        {records.length === 0 && !loading ? (
          <Empty description="暂无导出记录" />
        ) : (
          <Table
            columns={columns}
            dataSource={records}
            rowKey="id"
            pagination={{
              current: page + 1,
              pageSize: pageSize,
              total: total,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条记录`,
              onChange: (p, ps) => {
                setPage(p - 1);
                setPageSize(ps);
              }
            }}
            size="small"
          />
        )}
      </Spin>
    </Modal>
  );
};

export default HistoryExportModal;
