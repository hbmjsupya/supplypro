import React, { useState, useEffect } from 'react';
import { Modal, Space, Button, message, Typography, Divider, Alert, Radio, Spin } from 'antd';
import { ExportOutlined, DownloadOutlined } from '@ant-design/icons';
import { exportDeliveryOrders, DeliveryExportRequest, getExportDeliveryCount } from '../../../services/deliveryExportService';
import { getStatusText } from '../../../utils/statusMapping';

const { Text } = Typography;

interface ListFilterParams {
  keyword?: string;
  product?: string;
  supplierName?: string;
  receiver?: string;
  bizType?: string;
  settlementStatus?: string[];
  platformOrderNo?: string;
  bizNo?: string;
  project?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  supplierId?: number;
}

interface ExportDeliveryModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  selectedCount: number;
  selectedPoIds: number[];
  listFilterParams?: ListFilterParams;
  totalCount?: number;
}

const ExportDeliveryModal: React.FC<ExportDeliveryModalProps> = ({
  open,
  onCancel,
  onSuccess,
  selectedCount,
  selectedPoIds,
  listFilterParams,
  totalCount
}) => {
  const [loading, setLoading] = useState(false);
  const [exportMode, setExportMode] = useState<'selected' | 'filter'>(selectedCount > 0 ? 'selected' : 'filter');
  const [filteredCount, setFilteredCount] = useState<number | null>(null);
  const [countLoading, setCountLoading] = useState(false);
  const [countError, setCountError] = useState(false);

  useEffect(() => {
    if (open && exportMode === 'filter') {
      fetchFilteredCount();
    }
  }, [open, exportMode, listFilterParams]);

  const fetchFilteredCount = async () => {
    setCountLoading(true);
    setCountError(false);
    try {
      const params: Record<string, any> = {};
      if (listFilterParams?.keyword) {
        params.keyword = listFilterParams.keyword;
      }
      if (listFilterParams?.product) {
        params.product = listFilterParams.product;
      }
      if (listFilterParams?.supplierId) {
        params.supplierId = listFilterParams.supplierId;
      }
      if (listFilterParams?.startDate) {
        params.startDate = listFilterParams.startDate;
      }
      if (listFilterParams?.endDate) {
        params.endDate = listFilterParams.endDate;
      }
      
      const result = await getExportDeliveryCount(params);
      setFilteredCount(result.count);
    } catch (error) {
      console.error('Failed to fetch export count:', error);
      // 如果获取失败，设置为0或null，并在UI提示
      setFilteredCount(null);
      setCountError(true);
    } finally {
      setCountLoading(false);
    }
  };

  const handleExport = async () => {
    setLoading(true);
    try {
      const requestData: DeliveryExportRequest = {};
      
      if (exportMode === 'selected') {
        if (selectedPoIds.length === 0) {
          message.warning('请先选择要导出的采购单');
          setLoading(false);
          return;
        }
        requestData.poIds = selectedPoIds;
      } else {
        if (listFilterParams) {
          if (listFilterParams.keyword) {
            requestData.keyword = listFilterParams.keyword;
          }
          if (listFilterParams.product) {
            requestData.product = listFilterParams.product;
          }
          // 状态筛选：业务强制要求仅导出待处理状态，因此无论用户选择什么状态（包括全部），
          // 导出请求都不传递状态参数，让后端使用默认的PENDING状态。
          // 这样可以避免用户误以为可以导出"已发货"等状态的数据。
          // if (listFilterParams.status && listFilterParams.status !== 'all' && listFilterParams.status !== '') {
          //   requestData.status = listFilterParams.status;
          // }
          if (listFilterParams.startDate) {
            requestData.startDate = listFilterParams.startDate;
          }
          if (listFilterParams.endDate) {
            requestData.endDate = listFilterParams.endDate;
          }
          if (listFilterParams.supplierId) {
            requestData.supplierId = listFilterParams.supplierId;
          }
        }
      }

      const result = await exportDeliveryOrders(requestData);
      
      message.success(`导出成功: ${result.fileName}`);
      onSuccess();
      onCancel();
    } catch (error) {
      console.error('Export failed:', error);
      message.error(error instanceof Error ? error.message : '导出失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const getStatusLabel = (status: string | undefined): string => {
    if (!status) return '';
    return getStatusText(status, 'order');
  };

  const getFilterDescription = () => {
    const parts: string[] = [];
    if (listFilterParams?.keyword) {
      parts.push(`采购单号: ${listFilterParams.keyword}`);
    }
    if (listFilterParams?.product) {
      parts.push(`商品: ${listFilterParams.product}`);
    }
    if (listFilterParams?.supplierName) {
      parts.push(`供应商: ${listFilterParams.supplierName}`);
    }
    if (listFilterParams?.receiver) {
      parts.push(`收货信息: ${listFilterParams.receiver}`);
    }
    if (listFilterParams?.bizType) {
      parts.push(`采购类型: ${listFilterParams.bizType}`);
    }
    if (listFilterParams?.platformOrderNo) {
      parts.push(`平台订单号: ${listFilterParams.platformOrderNo}`);
    }
    if (listFilterParams?.bizNo) {
      parts.push(`业务单号: ${listFilterParams.bizNo}`);
    }
    if (listFilterParams?.project) {
      parts.push(`项目: ${listFilterParams.project}`);
    }
    if (listFilterParams?.status && listFilterParams.status !== 'all' && listFilterParams.status !== '') {
      // 业务规则：导出发货单仅包含待处理状态。即使用户筛选了其他状态，也仅导出其中的待处理项。
      if (listFilterParams.status === 'PENDING') {
        parts.push(`状态: 待处理`);
      } else {
        parts.push(`状态: ${getStatusLabel(listFilterParams.status)} (仅导出待处理)`);
      }
    } else {
      parts.push(`状态: 待处理（默认）`);
    }
    if (listFilterParams?.startDate && listFilterParams?.endDate) {
      parts.push(`时间: ${listFilterParams.startDate} ~ ${listFilterParams.endDate}`);
    }
    return parts.length > 0 ? parts.join(' | ') : '无筛选条件';
  };

  return (
    <Modal
      title={
        <Space>
          <ExportOutlined />
          <span>导出发货单</span>
        </Space>
      }
      open={open}
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          取消
        </Button>,
        <Button
          key="export"
          type="primary"
          icon={<DownloadOutlined />}
          loading={loading}
          onClick={handleExport}
        >
          确认导出
        </Button>
      ]}
      width={480}
    >
      <Alert
        message="导出说明"
        description="导出发货单将生成包含采购单物流信息的Excel文件，可用于物流跟踪和对账。仅导出待处理状态的采购单。"
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Divider style={{ margin: '12px 0' }} />

      <div style={{ marginBottom: 16 }}>
        <Text strong>选择导出方式：</Text>
        <div style={{ marginTop: 12 }}>
          <Radio.Group 
            value={exportMode} 
            onChange={(e) => setExportMode(e.target.value)}
            style={{ width: '100%' }}
          >
            {selectedCount > 0 && (
              <Radio.Button value="selected" style={{ width: '100%', marginBottom: 8, height: 'auto', padding: '8px 12px' }}>
                <div>
                  <Text strong>导出选中项</Text>
                  <br />
                  <Text type="secondary">已选择 {selectedCount} 条采购单</Text>
                </div>
              </Radio.Button>
            )}
            <Radio.Button value="filter" style={{ width: '100%', height: 'auto', padding: '8px 12px' }}>
              <div>
                <Text strong>按列表筛选条件导出</Text>
                <br />
                <Text type="secondary">当前筛选条件: {getFilterDescription()}</Text>
                {countLoading ? (
                  <Spin size="small" style={{ marginLeft: 8 }} />
                ) : filteredCount !== null ? (
                  <Text type="secondary"> (符合导出条件: {filteredCount} 条)</Text>
                ) : countError ? (
                  <Text type="danger" style={{ marginLeft: 8 }}>(获取失败)</Text>
                ) : null}
              </div>
            </Radio.Button>
          </Radio.Group>
        </div>
      </div>

      {exportMode === 'selected' && selectedCount > 0 && (
        <Alert
          message={`将导出选中的 ${selectedCount} 条采购单`}
          type="success"
          showIcon
        />
      )}

      {exportMode === 'filter' && (
        <Alert
          message="将使用列表页当前的筛选条件导出数据"
          description={getFilterDescription()}
          type="warning"
          showIcon
        />
      )}
    </Modal>
  );
};

export default ExportDeliveryModal;
