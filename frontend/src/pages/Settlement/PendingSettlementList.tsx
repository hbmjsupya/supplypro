import React, { useState, useEffect } from 'react';
import { Table, Button, Card, Tag, message, Modal, Form, Input, Select, Space, Tooltip, Dropdown, Menu, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { MenuProps } from 'antd';
import { DownOutlined, SyncOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { PendingDeliverySettlement } from '../../types/settlement';
import { getPendingPurchaseSettlements, getSupplierAccounts, BankAccount, createPurchaseSettlementsFromPending } from '../../services/settlementService';
import { getStatusText, getStatusColor } from '../../utils/statusMapping';
import PageDoc from '../../components/PageDoc';
import SearchFormLayout from '../../components/SearchFormLayout';

const { Text } = Typography;

const getBizTypeInfo = (type: string) => {
    switch (type) {
      case 'PLATFORM':
      case 'OrderPurchase':
        return { label: '平台单', color: 'blue' };
      case 'REPLENISHMENT':
      case 'ReplenishPurchase':
        return { label: '补货单', color: 'orange' };
      case 'INBOUND':
      case 'ProductInbound':
        return { label: '入库单', color: 'purple' };
      case 'COST_ADJUSTMENT':
        return { label: '调价单', color: 'green' };
      case 'REFUND':
        return { label: '退款单', color: 'red' };
      default:
        return { label: type || '其他', color: 'default' };
    }
  };

interface PendingSettlementType {
    id: string;
    bizType: string;
    bizNo: string;
    purchaseOrderNo: string;
    supplierId: string;
    supplierName: string;
    amount: number;
    settlementType: string;
    settlementPeriod: number;
    status: string;
    [key: string]: any;
}

const PendingSettlementList: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PendingSettlementType[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [filters, setFilters] = useState({ supplierName: '', purchaseOrderNo: '', status: '', bizType: '', settlementType: '', bizNo: '' });
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });

  // Bank Account Selection Modal State
  const [bankModalVisible, setBankModalVisible] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [bankModalData, setBankModalData] = useState<any>(null);
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null);
  const [payeeAccounts, setPayeeAccounts] = useState<BankAccount[]>([]);

  const loadData = async (page = pagination.current, size = pagination.pageSize, overrideFilters?: typeof filters) => {
    setLoading(true);
    try {
      const currentFilters = overrideFilters || filters;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const params: any = {};
      if (currentFilters.purchaseOrderNo) params.purchaseOrderNo = currentFilters.purchaseOrderNo;
      if (currentFilters.supplierName) params.supplierName = currentFilters.supplierName;
      if (currentFilters.status) params.status = currentFilters.status;
      if (currentFilters.bizType) params.bizType = currentFilters.bizType;
      if (currentFilters.settlementType) params.settlementType = currentFilters.settlementType;
      if (currentFilters.bizNo) params.bizNo = currentFilters.bizNo;
      params.page = page - 1;
      params.size = size;
      
      const result: any = await getPendingPurchaseSettlements(params);
      // 确保正确处理后端返回的数据格式
      let records = [];
      let total = 0;
      if (result && Array.isArray(result)) {
        // 后端返回的是数组
        records = result;
        total = result.length;
      } else if (result && result.records) {
        // 后端返回的是带有 records 和 total 字段的对象
        records = result.records || [];
        total = result.total || 0;
      }
      setData(records);
      setPagination(prev => ({ ...prev, current: page, pageSize: size, total }));
    } catch (error) {
      console.error('加载待结算采购单数据失败:', error);
      setData([]);
      setPagination(prev => ({ ...prev, total: 0 }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSearch = () => {
      loadData(1, pagination.pageSize); 
  };

  const getFilteredData = () => {
      return data.filter(item => {
          if (filters.supplierName && !item.supplierName.includes(filters.supplierName)) return false;
          if (filters.purchaseOrderNo && !item.purchaseOrderNo.includes(filters.purchaseOrderNo)) return false;
          if (filters.bizNo && item.bizNo && !item.bizNo.includes(filters.bizNo)) return false;
          // bizType 琜索由后端处理，前端不再筛选
          // if (filters.bizType && item.bizType !== filters.bizType) return false;
          if (filters.status && item.status !== filters.status) return false;
          if (filters.settlementType && item.settlementType !== filters.settlementType) return false;
          return true;
      });
  };

  // 批量结算确认弹窗状态
  const [batchConfirmModalVisible, setBatchConfirmModalVisible] = useState(false);
  const [batchConfirmData, setBatchConfirmData] = useState<any>(null);

  const handleInitiateSettlement = async () => {
      if (selectedRowKeys.length === 0) {
          message.warning('请选择要结算的记录');
          return;
      }

      const selectedItems = data.filter(item => 
          selectedRowKeys.some(key => String(key) === String(item.id))
      );
      
      console.log('selectedRowKeys:', selectedRowKeys);
      console.log('selectedItems:', selectedItems);
      
      // Group by Supplier
      const groups = new Map<string, PendingSettlementType[]>();
      selectedItems.forEach(item => {
          const key = String(item.supplierId);
          if (!groups.has(key)) {
              groups.set(key, []);
          }
          groups.get(key)?.push(item);
      });

      if (groups.size === 1) {
          // 只有一个供应商，显示银行账户确认弹窗
          const entry = groups.entries().next().value;
          if (!entry) return;
          const [supplierId, items] = entry;
          const supplierName = items[0].supplierName;
          const totalAmount = items.reduce((sum: number, item: PendingSettlementType) => sum + (item.amount || 0), 0);

          try {
              const accounts: BankAccount[] = await getSupplierAccounts(supplierId);
              setPayeeAccounts(accounts);
              
              const defaultAcc = accounts.find((a: BankAccount) => a.isDefault) || accounts[0] || null;
              setSelectedAccount(defaultAcc);
              
              setBankModalData({
                  supplierId,
                  supplierName,
                  items,
                  totalAmount,
                  isBatch: true,
                  batchItems: selectedItems
              });
              setBankModalVisible(true);
          } catch (e) {
              message.error('获取收款方银行信息失败');
          }
      } else {
          // 多个供应商，显示批量确认弹窗
          const supplierCount = groups.size;
          const settlementCount = supplierCount; // 每个供应商生成一个结算单
          const totalItemsCount = selectedItems.length;

          setBatchConfirmData({
              groups,
              supplierCount,
              settlementCount,
              totalItemsCount,
              selectedItems
          });
          setBatchConfirmModalVisible(true);
      }
  };

  const handleBatchConfirm = async () => {
      if (!batchConfirmData) return;

      try {
          setLoading(true);
          
          // 收集所有勾选的业务变动记录
          const allBizItems: any[] = [];
          for (const [supplierId, items] of batchConfirmData.groups.entries()) {
              items.forEach((item: any) => {
                  allBizItems.push({
                      id: item.id,
                      bizType: item.bizType,
                      rawId: item.rawId,
                      purchaseOrderId: item.purchaseOrderId,
                      purchaseOrderNo: item.purchaseOrderNo,
                      bizNo: item.bizNo,
                      supplierId: item.supplierId,
                      supplierName: item.supplierName,
                      amount: item.amount
                  });
              });
          }
          
          if (allBizItems.length > 0) {
              await createPurchaseSettlementsFromPending({
                  items: allBizItems,
                  createdBy: 'admin'
              });
              message.success(`成功生成 ${batchConfirmData.groups.size} 个结算单`);
              loadData();
              setSelectedRowKeys([]);
          }
      } catch (error) {
          message.error('批量生成结算单失败');
      } finally {
          setLoading(false);
          setBatchConfirmModalVisible(false);
          setBatchConfirmData(null);
      }
  };

  const handleInitiateSingleSettlement = async (items: PendingSettlementType[]) => {
      const supplierId = items[0].supplierId;
      const supplierName = items[0].supplierName;
      const totalAmount = items.reduce((sum, item) => sum + (item.amount || 0), 0);

      try {
          const accounts: BankAccount[] = await getSupplierAccounts(supplierId);
          setPayeeAccounts(accounts);
          
          const defaultAcc = accounts.find((a: BankAccount) => a.isDefault) || accounts[0] || null;
          setSelectedAccount(defaultAcc);
          
          setBankModalData({
              supplierId,
              supplierName,
              items,
              totalAmount
          });
          setBankModalVisible(true);
      } catch (e) {
          message.error('获取收款方银行信息失败');
      }
  };

  const handleConfirmSettlement = async () => {
      if (!selectedAccount) {
          message.error('请选择收款账户');
          return;
      }
      
      const { items } = bankModalData;
      
      try {
          // 构建业务变动记录列表
          const bizItems = items.map((item: PendingSettlementType) => ({
              id: item.id,
              bizType: item.bizType,
              bizTypeLabel: item.bizTypeLabel,
              rawId: item.rawId,
              purchaseOrderId: item.purchaseOrderId,
              purchaseOrderNo: item.purchaseOrderNo,
              bizNo: item.bizNo,
              supplierId: item.supplierId,
              supplierName: item.supplierName,
              amount: item.amount,
              platformOrderNo: item.platformOrderNo
          }));
          
          await createPurchaseSettlementsFromPending({
              items: bizItems,
              createdBy: 'admin',
              payeeAccountType: selectedAccount.type || 'COMPANY',
              payeeAccountName: selectedAccount.name,
              payeeBank: selectedAccount.bank,
              payeeAccount: selectedAccount.account
          });

          message.success('结算发起成功');
          setBankModalVisible(false);
          setSelectedRowKeys([]);
          loadData();
      } catch (e) {
          message.error('结算发起失败');
      }
  };

  const getStatusInfo = (status: string) => {
    return {
        text: getStatusText(status),
        color: getStatusColor(status)
    };
  };

  const columns: ColumnsType<PendingSettlementType> = [
    { 
      title: '业务类型', 
      dataIndex: 'bizType', 
      render: (val: string, record) => {
        const bizTypeInfo = getBizTypeInfo(val);
        return (
          <Space direction="vertical" size={0}>
            <Tag color={bizTypeInfo.color}>
              {bizTypeInfo.label}
            </Tag>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.bizNo || '-'}
            </Text>
          </Space>
        );
      }
    },
    { title: '采购单号', dataIndex: 'purchaseOrderNo' },
    { title: '商品供应商', dataIndex: 'supplierName' },
    { title: '结算类型', dataIndex: 'settlementType', render: (val: string) => {
      if (val === 'CASH') return <Tag color="blue">现付</Tag>;
      if (val === 'PREPAYMENT') return <Tag color="orange">预付</Tag>;
      return val || '-';
    }},
    { title: '结算周期', dataIndex: 'settlementPeriod', render: (val: number) => {
      if (val) return `${val}天`;
      return '-';
    }},
    { title: '变动金额', dataIndex: 'amount', render: (val) => {
      if (val === null || val === undefined) return '-';
      const numVal = typeof val === 'string' ? parseFloat(val) : val;
      const color = numVal < 0 ? '#ff4d4f' : '#52c41a';
      return <span style={{ color }}>{numVal < 0 ? '' : '+'}{`¥${numVal.toFixed(2)}`}</span>;
    }},
    { 
        title: '状态', 
        dataIndex: 'shippingStatus',
        render: (val: string, record) => {
            const status = val || record.status;
            if (!status) return '-';
            const statusInfo = getStatusInfo(status);
            return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>;
        }
    },
    {
        title: '操作',
        key: 'action',
        width: 100,
        render: (_, record) => {
            const menuItems: MenuProps['items'] = [
                {
                    key: 'view',
                    label: '查看',
                    onClick: () => {
                        if (record.bizType === 'COST_ADJUSTMENT') {
                            navigate(`/supply-chain/price-adjustment/detail/${record.bizNo}`);
                        } else {
                            navigate(`/supply-chain/purchase-order/detail/${record.purchaseOrderId}`);
                        }
                    }
                }
            ];
            
            if (record.status === '待发货' || record.status === '已发货' || record.status === '已收货' || record.status === 'CONFIRMED' || record.status === 'SHIPPED' || record.status === 'RECEIVED') {
                menuItems.push({
                    key: 'settle',
                    label: '发起结算',
                    onClick: () => {
                        setSelectedRowKeys([record.id]);
                        // 需要稍微延迟让 selectedRowKeys 生效，或者直接传参
                        handleInitiateSingleSettlement([record]);
                    }
                });
            }
            
            return (
                <Dropdown menu={{ items: menuItems }} trigger={['click']}>
                    <Button type="link" onClick={e => e.preventDefault()}>
                        操作 <DownOutlined />
                    </Button>
                </Dropdown>
            );
        }
    }
  ];

  return (
    <div style={{ padding: 24 }}>
      <PageDoc 
        pageTitle="供应链管理 > 待结算采购单列表 > 待结算配送单列表"
        description="物流商配送单自动同步至此列表，支持按供应商批量生成结算单。"
      />
      <SearchFormLayout onSearch={handleSearch} onReset={() => { const emptyFilters = { supplierName: '', purchaseOrderNo: '', status: '', bizType: '', settlementType: '', bizNo: '' }; setFilters(emptyFilters); loadData(1, pagination.pageSize, emptyFilters); }}>
         <Form.Item label="采购单号" style={{ marginBottom: 0 }}>
            <Input placeholder="请输入采购单号" value={filters.purchaseOrderNo} onChange={e => setFilters({ ...filters, purchaseOrderNo: e.target.value })} />
         </Form.Item>
         <Form.Item label="业务单号" style={{ marginBottom: 0 }}>
            <Input placeholder="请输入业务单号" value={filters.bizNo} onChange={e => setFilters({ ...filters, bizNo: e.target.value })} />
         </Form.Item>
         <Form.Item label="供应商" style={{ marginBottom: 0 }}>
            <Input placeholder="请输入供应商名称" value={filters.supplierName} onChange={e => setFilters({ ...filters, supplierName: e.target.value })} />
         </Form.Item>
 <Form.Item label="业务类型" style={{ marginBottom: 0 }}>
            <Select value={filters.bizType} onChange={v => setFilters({ ...filters, bizType: v })} style={{ width: '100%' }} allowClear>
                <Select.Option value="PLATFORM">平台单</Select.Option>
                <Select.Option value="INBOUND">入库单</Select.Option>
                <Select.Option value="REPLENISHMENT">补货单</Select.Option>
                <Select.Option value="COST_ADJUSTMENT">调价单</Select.Option>
                <Select.Option value="REFUND">退款单</Select.Option>
            </Select>
         </Form.Item>
         <Form.Item label="状态" style={{ marginBottom: 0 }}>
            <Select value={filters.status} onChange={v => setFilters({ ...filters, status: v })} style={{ width: '100%' }} allowClear>
                <Select.Option value="TO_SHIP">待发货</Select.Option>
                <Select.Option value="SHIPPED">已发货</Select.Option>
                <Select.Option value="RECEIVED">已收货</Select.Option>
                <Select.Option value="COMPLETED">已完成</Select.Option>
            </Select>
         </Form.Item>
      </SearchFormLayout>

      <div style={{ marginBottom: 16 }}>
        <Button type="primary" onClick={handleInitiateSettlement} disabled={selectedRowKeys.length === 0}>
          批量发起结算
        </Button>
      </div>
      <Card bodyStyle={{ padding: 0 }}>
        <Table 
          rowSelection={{
            type: 'checkbox',
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys)
          }}
          rowKey="id"
          columns={columns} 
          dataSource={data} 
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            onChange: (page, size) => {
              loadData(page, size);
            }
          }}
        />
      </Card>

      <Modal
        title="确认收款方银行信息"
        open={bankModalVisible}
        onOk={handleConfirmSettlement}
        onCancel={() => setBankModalVisible(false)}
        width={600}
      >
        {bankModalData && (
          <div style={{ marginBottom: 16 }}>
            <p><strong>收款方：</strong>{bankModalData.supplierName}</p>
            <p><strong>结算金额：</strong>¥{bankModalData.totalAmount.toFixed(2)}</p>
            {bankModalData.isBatch && (
              <p><strong>结算记录数：</strong>{bankModalData.items.length} 条</p>
            )}
          </div>
        )}
        
        {payeeAccounts.length === 0 ? (
           <p style={{ color: 'red' }}>未配置银行账户信息，请先配置或联系管理员。</p>
        ) : (
          <Form layout="vertical">
             <Form.Item label="选择银行账户">
                <Select 
                   value={selectedAccount?.id} 
                   onChange={(val) => setSelectedAccount(payeeAccounts.find(a => a.id === val) || null)}
                >
                   {payeeAccounts.map(acc => (
                      <Select.Option key={acc.id} value={acc.id}>
                         {acc.bank} - {acc.account} ({acc.name}) {acc.isDefault ? ' [默认]' : ''}
                      </Select.Option>
                   ))}
                </Select>
             </Form.Item>
             
             {selectedAccount && (
                <Card size="small" style={{ background: '#fafafa' }}>
                   <p><strong>账户类型：</strong>{selectedAccount.type === 'COMPANY' ? '企业对公账户' : selectedAccount.type === 'PERSONAL' ? '个人账户' : (selectedAccount.type || '-')}</p>
                   <p><strong>账户名称：</strong>{selectedAccount.name}</p>
                   <p><strong>开户银行：</strong>{selectedAccount.bank}</p>
                   <p><strong>银行账号：</strong>{selectedAccount.account}</p>
                </Card>
             )}
          </Form>
        )}
      </Modal>

      <Modal
        title="批量发起结算确认"
        open={batchConfirmModalVisible}
        onOk={handleBatchConfirm}
        onCancel={() => {
          setBatchConfirmModalVisible(false);
          setBatchConfirmData(null);
        }}
        width={500}
      >
        {batchConfirmData && (
          <div style={{ marginBottom: 16 }}>
            <p><strong>供应商数量：</strong>{batchConfirmData.supplierCount} 个</p>
            <p><strong>结算单数量：</strong>{batchConfirmData.settlementCount} 个</p>
            <p><strong>结算记录数：</strong>{batchConfirmData.totalItemsCount} 条</p>
            <div style={{ marginTop: 16, padding: 12, background: '#f0f0f0', borderRadius: 4 }}>
              <p style={{ marginBottom: 8 }}><strong>温馨提示：</strong></p>
              <p>系统将为每个供应商自动生成一个结算单，并使用各供应商的默认银行账户信息。</p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PendingSettlementList;
