import React, { useState, useEffect } from 'react';
import { Table, Button, Card, Space, Tag, Modal, Form, Input, Select, message, InputNumber, Radio, Tooltip, Row, Col, Typography, Upload, Progress } from 'antd';
import { CarOutlined, NumberOutlined, EyeOutlined, DownloadOutlined, UploadOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { getOutboundOrders, shipOutboundOrder as shipOutboundOrderApi, cancelOutboundOrder, getWarehouseNameMap } from '../../services/warehouseService';
import { getLogisticsProviders } from '../../services/logisticsService';
import { getStatusText, getStatusColor } from '../../utils/statusMapping';
import { formatTimeSmart, formatTimeFull } from '../../utils/dateFormatter';
import PageDoc from '../../components/PageDoc';
import SearchFormLayout from '../../components/SearchFormLayout';
import ShipOrderModal from '../PurchaseOrder/components/ShipOrderModal';

interface OutboundOrderRecord {
    id: number;
    outboundNo: string;
    sourceType: string;
    sourceRefNo: string;
    status: string;
    settlementStatus: string;
    logisticsCompany: string;
    trackingNo: string;
    deliveryMethod: string;
    logisticsFee: number;
    outboundDate: string;
    outboundItems: string;
    createdAt: string;
    warehouse: { id: number; code: string; name: string } | null;
    logisticsProvider: { id: number; name: string } | null;
    salesOrder: { id: number; orderNo: string } | null;
    consignee?: string;
    consigneePhone?: string;
    consigneeAddress?: string;
    expectedArrival?: string;
    remark?: string;
    confirmedBy?: string;
    shippedAt?: string;
    logisticsProviderId?: number;
}

interface SearchValues {
    outboundNo?: string;
    sourceRefNo?: string;
    status?: string;
    sourceType?: string;
}

const OutboundOrderList: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<OutboundOrderRecord[]>([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [shipModalOpen, setShipModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OutboundOrderRecord | null>(null);
  const [form] = Form.useForm();
  const [logisticsProviders, setLogisticsProviders] = useState<any[]>([]);
  const [shipType, setShipType] = useState('Logistics');
  const [filters, setFilters] = useState<SearchValues>({});
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const loadData = async (page = pagination.current, size = pagination.pageSize) => {
    setLoading(true);
    try {
      const params: any = { page: page - 1, size };
      if (filters.outboundNo) params.outboundNo = filters.outboundNo;
      if (filters.sourceRefNo) params.sourceRefNo = filters.sourceRefNo;
      if (filters.status) params.status = filters.status;
      if (filters.sourceType) params.sourceType = filters.sourceType;

      const res: any = await getOutboundOrders(params);
      const records = res?.data?.records || res?.records || [];
      const total = res?.data?.total || res?.total || 0;
      setData(records);
      setPagination(prev => ({ ...prev, current: page, total }));
    } catch (e) {
      message.error('加载出库单列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    getLogisticsProviders().then((providers: any[]) => setLogisticsProviders(providers));
  }, []);

  const handleSearch = () => {
    setPagination(prev => ({ ...prev, current: 1 }));
    loadData(1);
  };

  const handleReset = () => {
    setFilters({});
    setPagination(prev => ({ ...prev, current: 1 }));
    setTimeout(() => loadData(1), 0);
  };

  const handleShipClick = (record: OutboundOrderRecord) => {
      setSelectedOrder(record);
      setShipModalOpen(true);
      setShipType('Logistics');
      form.resetFields();
  };

  const handleShipSuccess = async (orderId: number, payload: any) => {
      message.success('发货成功，已生成待结算配送单');
      setShipModalOpen(false);
      setSelectedOrder(null);
      loadData();
  };

  const getSourceTypeText = (sourceType: string) => {
      switch (sourceType) {
          case 'PURCHASE': return '分仓发货';
          case 'SALES': return '销售出库';
          case 'DROPSHIP': return '一件代发';
          default: return sourceType || '-';
      }
  };

  const getSourceTypeColor = (sourceType: string) => {
      switch (sourceType) {
          case 'PURCHASE': return 'purple';
          case 'SALES': return 'blue';
          case 'DROPSHIP': return 'cyan';
          default: return 'default';
      }
  };

  const parseOutboundItems = (itemsStr: string) => {
    if (!itemsStr) return [];
    try {
      return JSON.parse(itemsStr);
    } catch {
      return [];
    }
  };

  const handleCancel = async (record: OutboundOrderRecord) => {
      try {
          await cancelOutboundOrder(record.id);
          message.success('出库单已取消，冻结库存已释放');
          loadData();
      } catch (error: any) {
          message.error(error?.response?.data?.message || '取消失败');
      }
  };

  const handleExportShipment = async () => {
    let dataList: OutboundOrderRecord[] = [];
    if (selectedRowKeys.length > 0) {
        dataList = data.filter(d => selectedRowKeys.includes(d.id));
    } else {
        const res: any = await getOutboundOrders({ ...filters, page: 0, size: 1000 });
        dataList = res?.data?.records || res?.records || [];
    }

    const exportData = dataList.map((order: OutboundOrderRecord) => ({
        '出库单号': order.outboundNo,
        '来源类型': getSourceTypeText(order.sourceType),
        '来源单号': order.sourceRefNo || '-',
        '仓库': order.warehouse?.name || '-',
        '物流公司': order.logisticsCompany || order.logisticsProvider?.name || '-',
        '运单号': order.trackingNo || '-',
        '订单状态': getStatusText(order.status?.toLowerCase(), 'outbound'),
        '物流费用': order.logisticsFee || 0,
        '收货人': order.consignee || '-',
        '联系电话': order.consigneePhone || '-',
        '收货地址': order.consigneeAddress || '-'
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '出库单发货信息');
    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `出库单发货信息_${dateStr}.xlsx`);
    message.success(`成功导出 ${exportData.length} 条出库单信息`);
  };

  const handleImportShipment = async (file: File) => {
    setImporting(true);
    setImportProgress(0);
    message.loading({ content: '正在解析文件...', key: 'importShipment' });

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = e.target?.result;
            const workbook = XLSX.read(data, { type: 'binary' });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(sheet);

            if (jsonData.length === 0) {
                message.error({ content: '文件内容为空', key: 'importShipment' });
                setImporting(false);
                return;
            }

            let successCount = 0;
            let failCount = 0;
            const total = jsonData.length;

            for (let i = 0; i < total; i++) {
                const row: any = jsonData[i];
                const outboundNo = row['出库单号'] || row['OutboundOrderNo'];
                const company = row['物流公司'] || row['LogisticsCompany'];
                const trackingNo = row['运单号'] || row['TrackingNo'];
                const logisticsFee = row['物流费用'] || row['LogisticsFee'] || 0;

                if (!outboundNo || !trackingNo) {
                    failCount++;
                    continue;
                }

                try {
                    const targetOrder = data.find((o: OutboundOrderRecord) => o.outboundNo === outboundNo);
                    
                    if (targetOrder) {
                        const provider = logisticsProviders.find((p: any) => p.name === company);
                        await shipOutboundOrderApi(targetOrder.id, {
                            logisticsProviderId: provider?.id,
                            logisticsCompany: company,
                            trackingNo: trackingNo,
                            logisticsFee: logisticsFee,
                            deliveryMethod: 'Logistics',
                            operator: 'admin'
                        });
                        successCount++;
                    } else {
                        failCount++;
                        console.warn(`Outbound order not found: ${outboundNo}`);
                    }
                } catch (err) {
                    failCount++;
                    console.error(`Failed to import for ${outboundNo}`, err);
                }

                setImportProgress(Math.round(((i + 1) / total) * 100));
            }

            message.success({ content: `导入完成: 成功 ${successCount} 条, 失败 ${failCount} 条`, key: 'importShipment' });
            loadData();
        } catch (error) {
            console.error('Import Error:', error);
            message.error({ content: '导入失败，请检查文件格式', key: 'importShipment' });
        } finally {
            setImporting(false);
        }
    };
    reader.readAsBinaryString(file);
    return false;
  };

  const columns: ColumnsType<OutboundOrderRecord> = [
    { 
        title: '出库单信息', 
        key: 'outboundInfo', 
        width: '100%',
        render: (_, record) => {
          const items = parseOutboundItems(record.outboundItems);
          const firstItem = items.length > 0 ? items[0] : null;
          const totalQty = items.reduce((acc: number, cur: any) => acc + (cur.quantity || 0), 0);
          
          return (
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              justifyContent: 'center',
              gap: '0', 
              border: '1px solid #e8e8e8', 
              borderRadius: '8px', 
              marginBottom: '16px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              overflow: 'hidden',
              minHeight: '200px'
            }}>
              <Row gutter={0} align="middle" style={{ minHeight: '40px', background: '#fafafa', fontWeight: 'bold', borderBottom: '1px solid #f0f0f0', marginBottom: '8px' }}>
                <Col span={4} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 4px', height: '40px', fontSize: '12px' }}>出库单号</Col>
                <Col span={5} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 4px', height: '40px', fontSize: '12px' }}>来源单号</Col>
                <Col span={2} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 4px', height: '40px', fontSize: '12px' }}>仓库</Col>
                <Col span={3} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 4px', height: '40px', fontSize: '12px' }}>创建时间</Col>
                <Col span={3} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 4px', height: '40px', fontSize: '12px' }}>期望到货</Col>
                <Col span={3} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 4px', height: '40px', fontSize: '12px' }}>备注</Col>
                <Col span={2} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 4px', height: '40px', fontSize: '12px' }}>状态</Col>
                <Col span={2} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 4px', height: '40px', fontSize: '12px' }}>类型</Col>
              </Row>
              <Row gutter={0} align="middle" style={{ minHeight: '50px', borderBottom: '1px solid #f0f0f0', marginBottom: '8px' }}>
                <Col span={4} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '0 4px' }}>
                  <Typography.Text copyable style={{ fontSize: '12px' }}>{record.outboundNo}</Typography.Text>
                </Col>
                <Col span={5} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 4px' }}>
                  <span style={{ color: '#722ed1', fontSize: '12px' }}>{record.sourceRefNo || '-'}</span>
                </Col>
                <Col span={2} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 4px', fontSize: '12px' }}>
                  {record.warehouse?.name || '-'}
                </Col>
                <Col span={3} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 4px', fontSize: '12px' }}>
                  <Tooltip title={formatTimeFull(record.createdAt)}>
                    {formatTimeSmart(record.createdAt)}
                  </Tooltip>
                </Col>
                <Col span={3} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 4px', fontSize: '12px' }}>
                  <Tooltip title={record.expectedArrival ? formatTimeFull(record.expectedArrival) : '-'}>
                    <span>{record.expectedArrival ? formatTimeSmart(record.expectedArrival) : '-'}</span>
                  </Tooltip>
                </Col>
                <Col span={3} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 4px', fontSize: '12px' }}>
                  <Tooltip title={record.remark || '-'}>
                    <span style={{ 
                      maxWidth: '100px', 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis', 
                      whiteSpace: 'nowrap',
                      display: 'inline-block'
                    }}>
                      {record.remark || '-'}
                    </span>
                  </Tooltip>
                </Col>
                <Col span={2} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 4px' }}>
                  <Tag color={getStatusColor(record.status?.toLowerCase(), 'outbound')} style={{ margin: 0 }}>
                    {getStatusText(record.status?.toLowerCase(), 'outbound')}
                  </Tag>
                </Col>
                <Col span={2} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 4px' }}>
                  <Tag color={getSourceTypeColor(record.sourceType)} style={{ margin: 0 }}>{getSourceTypeText(record.sourceType)}</Tag>
                </Col>
              </Row>
              <Row gutter={0} align="middle" style={{ minHeight: '40px', fontSize: '12px', fontWeight: 'bold', borderBottom: '1px solid #f0f0f0', marginBottom: '8px', background: '#fafafa' }}>
                <Col span={3} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 4px', height: '40px' }}>收货人</Col>
                <Col span={3} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 4px', height: '40px' }}>联系电话</Col>
                <Col span={5} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 4px', height: '40px' }}>收货地址</Col>
                <Col span={4} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 4px', height: '40px' }}>商品名称</Col>
                <Col span={2} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 4px', height: '40px' }}>规格</Col>
                <Col span={2} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 4px', height: '40px' }}>数量</Col>
                <Col span={3} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 4px', height: '40px' }}>物流公司</Col>
                <Col span={2} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 4px', height: '40px' }}>操作</Col>
              </Row>
              <Row gutter={0} align="middle" style={{ minHeight: '50px', marginBottom: '0' }}>
                <Col span={3} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 4px', fontSize: '12px' }}>
                  {record.consignee || '-'}
                </Col>
                <Col span={3} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 4px', fontSize: '12px' }}>
                  {record.consigneePhone || '-'}
                </Col>
                <Col span={5} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 4px', fontSize: '12px' }}>
                  <Tooltip title={record.consigneeAddress || '-'}>
                    <span style={{ 
                      maxWidth: '180px', 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis', 
                      whiteSpace: 'nowrap',
                      display: 'inline-block'
                    }}>
                      {record.consigneeAddress || '-'}
                    </span>
                  </Tooltip>
                </Col>
                <Col span={4} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 4px' }}>
                  <Typography.Text strong ellipsis={{ tooltip: firstItem?.productName || '-' }} style={{ fontSize: '12px' }}>
                    {firstItem?.productName || '-'}
                  </Typography.Text>
                </Col>
                <Col span={2} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 4px', fontSize: '12px' }}>
                  {firstItem?.specName || '-'}
                </Col>
                <Col span={2} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 4px', fontSize: '12px' }}>
                  <Typography.Text strong>{totalQty}</Typography.Text>
                </Col>
                <Col span={3} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 4px', fontSize: '12px' }}>
                  {record.logisticsCompany || record.logisticsProvider?.name || '-'}
                </Col>
                <Col span={2} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 4px' }}>
                   <Space direction="vertical" size={0} style={{ alignItems: 'center' }}>
                     <Button type="link" size="small" style={{ padding: '0 4px', fontSize: '12px' }} onClick={() => navigate(`/supply-chain/outbound/detail/${record.id}`)}>查看</Button>
                     {record.status === 'PENDING' && (
                        <Button type="link" size="small" style={{ padding: '0 4px', fontSize: '12px' }} onClick={() => handleShipClick(record)}>发货</Button>
                     )}
                     {record.status === 'PENDING' && (
                        <Button type="link" size="small" danger style={{ padding: '0 4px', fontSize: '12px' }} onClick={() => handleCancel(record)}>取消</Button>
                     )}
                     {record.status === 'SHIPPED' && (
                        <Button type="link" size="small" style={{ padding: '0 4px', fontSize: '12px' }} icon={<CarOutlined />} onClick={() => navigate(`/supply-chain/outbound/logistics/${record.id}`, { state: { record } })}>
                          物流
                        </Button>
                     )}
                   </Space>
                </Col>
              </Row>
            </div>
          );
        }
    }
  ];

  return (
    <div style={{ padding: 24 }}>
      <PageDoc 
        pageTitle="仓储管理 > 仓库出库管理"
        description="管理所有出库单据，进行发货操作。分仓发货生成的出库单发货后将自动生成待结算配送单。"
      />
      <SearchFormLayout onSearch={handleSearch} onReset={handleReset}>
          <Form.Item label="出库单号" style={{ marginBottom: 0 }}>
             <Input placeholder="请输入" value={filters.outboundNo} onChange={e => setFilters({ ...filters, outboundNo: e.target.value })} />
          </Form.Item>
          <Form.Item label="来源单号" style={{ marginBottom: 0 }}>
             <Input placeholder="采购单号/销售单号" value={filters.sourceRefNo} onChange={e => setFilters({ ...filters, sourceRefNo: e.target.value })} />
          </Form.Item>
          <Form.Item label="来源类型" style={{ marginBottom: 0 }}>
             <Select value={filters.sourceType} onChange={v => setFilters({ ...filters, sourceType: v })} style={{ width: '100%' }} allowClear>
                 <Select.Option value="">全部</Select.Option>
                 <Select.Option value="PURCHASE">分仓发货</Select.Option>
                 <Select.Option value="SALES">销售出库</Select.Option>
                 <Select.Option value="DROPSHIP">一件代发</Select.Option>
             </Select>
          </Form.Item>
          <Form.Item label="状态" style={{ marginBottom: 0 }}>
             <Select value={filters.status} onChange={v => setFilters({ ...filters, status: v })} style={{ width: '100%' }} allowClear>
                 <Select.Option value="">全部</Select.Option>
                 <Select.Option value="PENDING">待发货</Select.Option>
                 <Select.Option value="SHIPPED">已发货</Select.Option>
                 <Select.Option value="CANCELLED">已取消</Select.Option>
             </Select>
          </Form.Item>
      </SearchFormLayout>

      <div style={{ marginBottom: 16 }}>
          <Space>
              <Button icon={<DownloadOutlined />} onClick={handleExportShipment}>导出发货单</Button>
              <Upload 
                  beforeUpload={handleImportShipment} 
                  showUploadList={false} 
                  accept=".xlsx,.xls"
              >
                  <Button icon={<UploadOutlined />} loading={importing}>导入发货单</Button>
              </Upload>
          </Space>
          {importing && (
              <div style={{ marginTop: 8, width: 200 }}>
                  <Progress percent={importProgress} size="small" />
              </div>
          )}
      </div>

      <Card>
          <Table 
            columns={columns} 
            dataSource={data} 
            rowKey="id" 
            loading={loading}
            pagination={{
                ...pagination,
                showTotal: total => `共 ${total} 条`,
                onChange: (page, size) => loadData(page, size)
            }}
          />
      </Card>

      <ShipOrderModal 
        open={shipModalOpen} 
        onCancel={() => setShipModalOpen(false)}
        onSuccess={handleShipSuccess}
        order={selectedOrder ? {
            id: selectedOrder.id,
            poNo: selectedOrder.outboundNo,
            quantity: parseOutboundItems(selectedOrder.outboundItems).reduce((acc: number, cur: any) => acc + (cur.quantity || 0), 0),
            items: parseOutboundItems(selectedOrder.outboundItems),
            deliveryMethod: selectedOrder.deliveryMethod,
            logisticsProviderId: selectedOrder.logisticsProvider?.id || selectedOrder.logisticsProviderId,
            shipCompany: selectedOrder.logisticsCompany,
            shipNo: selectedOrder.trackingNo,
            freight: selectedOrder.logisticsFee,
            shippingStatus: selectedOrder.status,
            attachments: undefined
        } : null}
        isOutboundOrder={true}
      />
    </div>
  );
};

export default OutboundOrderList;
