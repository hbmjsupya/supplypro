import React, { useState, useEffect } from 'react';
import { Table, Button, Card, Tag, message, Modal, Form, Input, Select, Space, Tooltip, Dropdown, Menu } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { MenuProps } from 'antd';
import { DownOutlined, ShoppingCartOutlined, SyncOutlined } from '@ant-design/icons';
import { PendingDeliverySettlement } from '../../types/settlement';
import { getPendingDeliverySettlements, updatePendingDeliverySettlementStatus, createSupplierSettlement, generateSettlementId, getPayeeAccounts, BankAccount } from '../../services/settlementService';
import PageDoc from '../../components/PageDoc';
import SearchFormLayout from '../../components/SearchFormLayout';

const PendingDeliverySettlementList: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PendingDeliverySettlement[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [filters, setFilters] = useState({ supplierName: '', deliveryNo: '', status: '', purchaseOrderNo: '', trackingNo: '', bizType: '', sourceType: '' });
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });

  // Bank Account Selection Modal State
  const [bankModalVisible, setBankModalVisible] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [bankModalData, setBankModalData] = useState<any>(null);
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null);
  const [payeeAccounts, setPayeeAccounts] = useState<BankAccount[]>([]);

  const loadData = async (page = pagination.current, size = pagination.pageSize) => {
    setLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const params: any = {};
      if (filters.purchaseOrderNo) params.purchaseOrderNo = filters.purchaseOrderNo;
      if (filters.trackingNo) params.trackingNo = filters.trackingNo;
      if (filters.supplierName) params.supplierName = filters.supplierName;
      if (filters.deliveryNo) params.deliveryNo = filters.deliveryNo;
      if (filters.status) params.status = filters.status;
      if (filters.bizType) params.bizType = filters.bizType;
      if (filters.sourceType) params.sourceType = filters.sourceType;
      params.page = page - 1;
      params.size = size;
      
      const result: any = await getPendingDeliverySettlements(params);
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
      console.error('加载待结算配送单数据失败:', error);
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
          if (filters.deliveryNo && !item.deliveryNo.includes(filters.deliveryNo)) return false;
          if (filters.status && item.status !== filters.status) return false;
          if (filters.bizType && item.bizType !== filters.bizType) return false;
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

      const selectedItems = data.filter(item => selectedRowKeys.includes(item.id));
      
      // Group by Supplier/LogisticsProvider
      const groups = new Map<string, PendingDeliverySettlement[]>();
      selectedItems.forEach(item => {
          const key = item.supplierId;
          if (!groups.has(key)) {
              groups.set(key, []);
          }
          groups.get(key)?.push(item);
      });

      // 检查供应商数量
      if (groups.size === 1) {
          // 只有一个供应商，显示银行账户确认弹窗
          const entry = groups.entries().next().value;
          if (!entry) return;
          const [supplierId, items] = entry;
          const supplierName = items[0].supplierName;
          const totalAmount = items.reduce((sum: number, item: PendingDeliverySettlement) => sum + item.fee, 0);

          try {
              const res: any = await getPayeeAccounts([items[0].id as unknown as number]);
              const accounts = res.accounts || [];
              setPayeeAccounts(accounts);
              
              if (accounts.length === 0) {
                  message.error(`${supplierName || '该供应商'} 未配置银行账户，请先在物流供应商管理页面添加银行账户信息`);
                  return;
              }
              
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
          } catch (e: any) {
              const errorMsg = e?.response?.data?.error || e?.message || '获取收款方银行信息失败';
              message.error(errorMsg);
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
          let successCount = 0;
          let failureCount = 0;
          
          for (const [supplierId, items] of batchConfirmData.groups.entries()) {
              try {
                  // Fetch payee accounts
                  const res: any = await getPayeeAccounts([items[0].id as unknown as number]);
                  const accounts = res.accounts || [];
                  
                  // Use default account or first available
                  const defaultAcc = accounts.find((a: BankAccount) => a.isDefault) || accounts[0];
                  
                  if (!defaultAcc) {
                      failureCount++;
                      console.warn(`供应商 ${items[0].supplierName} 没有配置银行账户`);
                      continue;
                  }
                  
                  const supplierName = items[0].supplierName;
                  const totalAmount = items.reduce((sum: number, item: PendingDeliverySettlement) => sum + item.fee, 0);
                  const currentTime = new Date().toISOString();
                  
                  const settlementId = await generateSettlementId('SET');
                  await createSupplierSettlement({
                      id: settlementId,
                      supplierId,
                      supplierName,
                      source: 'Delivery',
                      amount: totalAmount,
                      status: 'PENDING',
                      createTime: currentTime,
                      items: items,
                      // Bank info - auto use default
                      payeeAccountType: defaultAcc.type || 'COMPANY',
                      payeeAccountName: defaultAcc.name,
                      payeeBank: defaultAcc.bank,
                      payeeAccount: defaultAcc.account,
                      // Log information
                      settlementInfoSource: 'AUTO_DEFAULT',
                      settlementInfoGeneratedAt: currentTime
                  });

                  // 不再更新状态为 SETTLED，因为结算单应该保持待结算状态
                  // await updatePendingDeliverySettlementStatus(items.map((i: any) => i.id), 'SETTLED');
                  // Log operation
                  console.log(`[结算操作] 供应商: ${supplierName}, 结算单ID: ${settlementId}, 生成时间: ${currentTime}, 账户来源: 自动使用默认账户`);
                  successCount++;
              } catch (e) {
                  failureCount++;
                  console.error(`处理供应商 ${items[0].supplierName} 时出错:`, e);
              }
          }
          
          if (successCount > 0) {
              message.success(`成功发起 ${successCount} 个结算单`);
          }
          if (failureCount > 0) {
              message.warning(`有 ${failureCount} 个供应商结算失败`);
          }
          
          setSelectedRowKeys([]);
          loadData();
      } catch (e) {
          message.error('批量发起结算失败');
      } finally {
          setLoading(false);
          setBatchConfirmModalVisible(false);
          setBatchConfirmData(null);
      }
  };

  const handleInitiateSingleSettlement = async (items: PendingDeliverySettlement[]) => {
      const supplierId = items[0].supplierId;
      const supplierName = items[0].supplierName;
      const totalAmount = items.reduce((sum, item) => sum + item.fee, 0);

      try {
          const res: any = await getPayeeAccounts([items[0].id as unknown as number]);
          const accounts = res.accounts || [];
          setPayeeAccounts(accounts);
          
          if (accounts.length === 0) {
              message.error(`${supplierName || '该供应商'} 未配置银行账户，请先在物流供应商管理页面添加银行账户信息`);
              return;
          }
          
          const defaultAcc = accounts.find((a: BankAccount) => a.isDefault) || accounts[0] || null;
          setSelectedAccount(defaultAcc);
          
          setBankModalData({
              supplierId,
              supplierName,
              items,
              totalAmount
          });
          setBankModalVisible(true);
      } catch (e: any) {
          const errorMsg = e?.response?.data?.error || e?.message || '获取收款方银行信息失败';
          message.error(errorMsg);
      }
  };

  const handleConfirmSettlement = async () => {
      if (!selectedAccount) {
          message.error('请选择收款账户');
          return;
      }
      
      const { supplierId, supplierName, items, totalAmount } = bankModalData;
      
      try {
          const settlementId = await generateSettlementId('SET');
          await createSupplierSettlement({
              id: settlementId,
              supplierId,
              supplierName,
              source: 'Delivery',
              amount: totalAmount,
              status: 'PENDING',
              createTime: new Date().toISOString(),
              items: items,
              // Bank info
              payeeAccountType: selectedAccount.type || 'COMPANY',
              payeeAccountName: selectedAccount.name,
              payeeBank: selectedAccount.bank,
              payeeAccount: selectedAccount.account
          });

          // 不再更新状态为 SETTLED，因为结算单应该保持待结算状态
          // await updatePendingDeliverySettlementStatus(items.map((i: any) => i.id), 'SETTLED');
          message.success('结算发起成功');
          setBankModalVisible(false);
          setSelectedRowKeys([]);
          loadData();
      } catch (e) {
          message.error('结算发起失败');
      }
  };

  const columns: ColumnsType<PendingDeliverySettlement> = [
    { title: '配送单号', dataIndex: 'deliveryNo' },
    { 
        title: '来源/单号', 
        dataIndex: 'relatedOrderNo',
        width: 200,
        render: (relatedOrderNo: string, record) => {
            const sourceType = record.sourceType || '采购单';
            const sourceLabel = sourceType === '出库单' ? '出库单' : '采购单';
            const orderNos = relatedOrderNo ? relatedOrderNo.split(',').filter(Boolean) : [];
            if (orderNos.length === 0) return '-';
            
            const content = orderNos.length === 1 ? (
                <span style={{ color: '#1890ff' }}>{orderNos[0]}</span>
            ) : (
                <Tooltip 
                    title={orderNos.map((no, idx) => (
                        <div key={idx} style={{ marginBottom: idx < orderNos.length - 1 ? 4 : 0, color: '#fff' }}>
                            {no}
                        </div>
                    ))} 
                    placement="topLeft"
                    overlayStyle={{ maxWidth: 350 }}
                    color="#000"
                >
                    <span style={{ cursor: 'pointer', color: '#1890ff' }}>
                        {orderNos[0]}...
                    </span>
                </Tooltip>
            );
            
            return (
                <Space direction="vertical" size={0}>
                    <Tag color={sourceType === '出库单' ? 'purple' : 'blue'} style={{ fontSize: 11 }}>
                        {sourceLabel}
                    </Tag>
                    {content}
                </Space>
            );
        }
    },
    { 
        title: '配送方式', 
        dataIndex: 'type', 
        render: (val) => {
            if (val === 'Logistics') return <Tag color="blue">物流配送</Tag>;
            if (val === 'SelfDelivery') return <Tag color="green">自配送</Tag>;
            return val;
        }
    },
    { 
        title: '配送详情', 
        dataIndex: 'details', 
        ellipsis: {
            showTitle: false,
        },
        render: (details: string) => (
            <Tooltip 
                title={details} 
                placement="topLeft"
                overlayStyle={{ maxWidth: 400 }}
            >
                <div style={{ 
                    overflow: 'hidden', 
                    whiteSpace: 'nowrap', 
                    textOverflow: 'ellipsis',
                    maxWidth: '200px'
                }}>
                    {details}
                </div>
            </Tooltip>
        )
    },
    { title: '物流供应商', dataIndex: 'supplierName' },
    { 
        title: '运单号', 
        dataIndex: 'trackingNo',
        render: (val: string) => val || '-'
    },
    { 
        title: '结算类型', 
        dataIndex: 'settlementType', 
        width: 120,
        render: (val: string) => {
            const typeMap: Record<string, string> = {
                'PREPAYMENT': '预付',
                'CASH': '现付',
                'PERIOD': '账期',
                'FISHERMAN': '渔人'
            };
            const label = typeMap[val?.toUpperCase()] || val || '-';
            return <Tag>{label}</Tag>;
        }
    },
    { 
        title: '结算周期', 
        dataIndex: 'settlementCycle',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        render: (val: any, record: PendingDeliverySettlement) => {
            // PREPAYMENT and FISHERMAN should show empty
            if (record.settlementType === 'PREPAYMENT' || record.settlementType === 'FISHERMAN' || !val) {
                return '-';
            }
            if (val === 'Monthly') return <Tag color="blue">月结</Tag>;
            if (val === 'Weekly') return <Tag color="cyan">周结</Tag>;
            return val;
        }
    },
    { title: '物流费用', dataIndex: 'fee', render: (val) => `¥${Number(val).toFixed(2)}` },
    { 
        title: '状态', 
        dataIndex: 'status',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        render: (val: any) => {
            if (val === '已发货') return <Tag color="processing">已发货</Tag>;
            if (val === '已收货') return <Tag color="success">已收货</Tag>;
            if (val === 'SHIPPED') return <Tag color="processing">已发货</Tag>;
            if (val === 'RECEIVED') return <Tag color="success">已收货</Tag>;
            if (val === 'PARTIAL_RECEIVED') return <Tag color="success">已收货</Tag>;
            return <Tag>{val}</Tag>;
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
                        const deliveryNo = record.deliveryNo;
                        if (deliveryNo) {
                            window.location.href = `/supply-chain/delivery/detail/${deliveryNo}`;
                        }
                    }
                }
            ];
            
            if (record.status === '已发货' || record.status === '已收货' || record.status === 'SHIPPED' || record.status === 'RECEIVED') {
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
      <SearchFormLayout
        onSearch={handleSearch}
        onReset={() => setFilters({ supplierName: '', deliveryNo: '', status: '', purchaseOrderNo: '', trackingNo: '', bizType: '', sourceType: '' })}
      >
         <Form.Item label="供应商" style={{ marginBottom: 0 }}>
            <Input placeholder="请输入" value={filters.supplierName} onChange={e => setFilters({ ...filters, supplierName: e.target.value })} />
         </Form.Item>
         <Form.Item label="配送单号" style={{ marginBottom: 0 }}>
            <Input placeholder="请输入" value={filters.deliveryNo} onChange={e => setFilters({ ...filters, deliveryNo: e.target.value })} />
         </Form.Item>
         <Form.Item label="来源单号" style={{ marginBottom: 0 }}>
            <Input placeholder="采购单号/出库单号" value={filters.purchaseOrderNo} onChange={e => setFilters({ ...filters, purchaseOrderNo: e.target.value })} />
         </Form.Item>
         <Form.Item label="来源类型" style={{ marginBottom: 0 }}>
            <Select value={filters.sourceType} onChange={v => setFilters({ ...filters, sourceType: v })} style={{ width: '100%' }} allowClear>
                <Select.Option value="">全部</Select.Option>
                <Select.Option value="采购单">采购单</Select.Option>
                <Select.Option value="出库单">出库单</Select.Option>
            </Select>
         </Form.Item>
         <Form.Item label="运单/物流单号" style={{ marginBottom: 0 }}>
            <Input placeholder="请输入" value={filters.trackingNo} onChange={e => setFilters({ ...filters, trackingNo: e.target.value })} />
         </Form.Item>
         <Form.Item label="业务类型" style={{ marginBottom: 0 }}>
            <Select value={filters.bizType} onChange={v => setFilters({ ...filters, bizType: v })} style={{ width: '100%' }} allowClear>
                <Select.Option value="">全部</Select.Option>
                <Select.Option value="PLATFORM">平台单</Select.Option>
                <Select.Option value="INBOUND">入库采购</Select.Option>
                <Select.Option value="REPLENISHMENT">补货采购</Select.Option>
            </Select>
         </Form.Item>
         <Form.Item label="状态" style={{ marginBottom: 0 }}>
            <Select value={filters.status} onChange={v => setFilters({ ...filters, status: v })} style={{ width: '100%' }}>
                <Select.Option value="">全部</Select.Option>
                <Select.Option value="已发货">已发货</Select.Option>
                <Select.Option value="已收货">已收货</Select.Option>
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

export default PendingDeliverySettlementList;
