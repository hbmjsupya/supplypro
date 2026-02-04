import React, { useState, useEffect } from 'react';
import { Table, Button, Card, Space, Tag, message, Input, Select, Form, Modal } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PendingDeliverySettlement } from '../../types/settlement';
import { getPendingDeliverySettlements, updatePendingDeliverySettlementStatus, createSupplierSettlement, generateSettlementId } from '../../services/settlementService';
import PageDoc from '../../components/PageDoc';

const PendingDeliverySettlementList: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PendingDeliverySettlement[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [filters, setFilters] = useState({ supplierName: '', deliveryNo: '', status: 'pending' });

  const loadData = async () => {
    setLoading(true);
    try {
      const result: any = await getPendingDeliverySettlements();
      setData(result.records || result || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSearch = () => {
      // Client-side filter for prototype
      loadData(); 
  };

  const getFilteredData = () => {
      return data.filter(item => {
          if (filters.supplierName && !item.supplierName.includes(filters.supplierName)) return false;
          if (filters.deliveryNo && !item.deliveryNo.includes(filters.deliveryNo)) return false;
          if (filters.status && item.status !== filters.status) return false;
          return true;
      });
  };

  const handleInitiateSettlement = async () => {
      if (selectedRowKeys.length === 0) {
          message.warning('请选择要结算的记录');
          return;
      }

      const selectedItems = data.filter(item => selectedRowKeys.includes(item.id));
      
      // Validate: Must be same supplier
      const supplierIds = Array.from(new Set(selectedItems.map(i => i.supplierId)));
      if (supplierIds.length > 1) {
          message.error('批量结算必须选择同一物流供应商的记录');
          return;
      }

      const supplierId = supplierIds[0];
      const supplierName = selectedItems[0].supplierName;
      const totalAmount = selectedItems.reduce((sum, item) => sum + item.fee, 0);

      Modal.confirm({
          title: '确认发起结算',
          content: `即将为供应商 "${supplierName}" 发起结算，共 ${selectedItems.length} 笔订单，总金额 ¥${totalAmount.toFixed(2)}`,
          onOk: async () => {
              try {
                  // Create Supplier Settlement
                  const settlementId = await generateSettlementId('Delivery');
                  await createSupplierSettlement({
                      id: settlementId,
                      supplierId,
                      supplierName,
                      source: 'Delivery',
                      amount: totalAmount,
                      status: 'Pending',
                      createTime: new Date().toISOString(),
                      items: selectedItems
                  });

                  // Update status
                  await updatePendingDeliverySettlementStatus(selectedRowKeys as string[], 'settled');

                  message.success('结算发起成功');
                  setSelectedRowKeys([]);
                  loadData();
              } catch (error) {
                  message.error('操作失败');
              }
          }
      });
  };

  const columns: ColumnsType<PendingDeliverySettlement> = [
      { title: '配送单号', dataIndex: 'deliveryNo' },
      { title: '配送方式', dataIndex: 'type', render: (val) => val === 'Logistics' ? '物流配送' : '自配送' },
      { title: '配送详情', dataIndex: 'details' },
      { title: '物流供应商', dataIndex: 'supplierName' },
      { 
          title: '结算周期', 
          dataIndex: 'settlementCycle',
          render: (val) => {
              const map: any = { 'Daily': '日结', 'Weekly': '周结', 'Monthly': '月结' };
              return map[val] || val || '-';
          }
      },
      { title: '关联业务单', dataIndex: 'relatedBizNo' },
      { title: '商品规格', dataIndex: 'specs', ellipsis: true },
      { title: '物流费用', dataIndex: 'fee', render: (val) => `¥${val.toFixed(2)}` },
      { 
          title: '状态', 
          dataIndex: 'status', 
          render: (val) => <Tag color={val === 'pending' ? 'orange' : 'green'}>{val === 'pending' ? '待结算' : '已结算'}</Tag> 
      },
      { title: '创建时间', dataIndex: 'createTime', render: t => t.split('T')[0] }
  ];

  return (
    <div style={{ padding: 24 }}>
      <PageDoc 
        pageTitle="结算管理 > 待结算配送单"
        description="管理所有已发货但未结算的物流/配送费用清单，支持合并发起结算。"
      />
      <Card variant="borderless">
          <Form layout="inline" style={{ marginBottom: 16 }}>
              <Form.Item label="供应商">
                  <Input 
                      placeholder="供应商名称" 
                      value={filters.supplierName} 
                      onChange={e => setFilters({ ...filters, supplierName: e.target.value })} 
                  />
              </Form.Item>
              <Form.Item label="配送单号">
                  <Input 
                      placeholder="配送单号" 
                      value={filters.deliveryNo} 
                      onChange={e => setFilters({ ...filters, deliveryNo: e.target.value })} 
                  />
              </Form.Item>
              <Form.Item label="状态">
                  <Select 
                      value={filters.status} 
                      onChange={v => setFilters({ ...filters, status: v })}
                      style={{ width: 120 }}
                  >
                      <Select.Option value="pending">待结算</Select.Option>
                      <Select.Option value="settled">已结算</Select.Option>
                      <Select.Option value="">全部</Select.Option>
                  </Select>
              </Form.Item>
              <Form.Item>
                  <Button type="primary" onClick={handleSearch}>查询</Button>
              </Form.Item>
          </Form>

          <div style={{ marginBottom: 16 }}>
              <Button type="primary" onClick={handleInitiateSettlement} disabled={selectedRowKeys.length === 0}>
                  发起结算
              </Button>
              <span style={{ marginLeft: 8 }}>
                  {selectedRowKeys.length > 0 ? `已选 ${selectedRowKeys.length} 项` : ''}
              </span>
          </div>

          <Table 
              rowSelection={{
                  type: 'checkbox',
                  selectedRowKeys,
                  onChange: (keys) => setSelectedRowKeys(keys),
                  getCheckboxProps: (record) => ({
                      disabled: record.status !== 'pending',
                  }),
              }}
              columns={columns} 
              dataSource={getFilteredData()} 
              rowKey="id"
              loading={loading}
              onRow={(record) => ({
                  onClick: () => {
                      if (record.status === 'pending') {
                          Modal.confirm({
                              title: '确认发起结算',
                              content: `即将为供应商 "${record.supplierName}" 发起结算，金额 ¥${record.fee.toFixed(2)}`,
                              onOk: async () => {
                                  try {
                                      const settlementId = await generateSettlementId('Delivery');
                                      await createSupplierSettlement({
                                          id: settlementId,
                                          supplierId: record.supplierId,
                                          supplierName: record.supplierName,
                                          source: 'Delivery',
                                          amount: record.fee,
                                          status: 'Pending',
                                          createTime: new Date().toISOString(),
                                          items: [record]
                                      });
                                      await updatePendingDeliverySettlementStatus([record.id], 'settled');
                                      message.success('结算发起成功');
                                      loadData();
                                  } catch (error) {
                                      message.error('操作失败');
                                  }
                              }
                          });
                      }
                  },
                  style: { cursor: record.status === 'pending' ? 'pointer' : 'default' }
              })}
          />
      </Card>
    </div>
  );
};

export default PendingDeliverySettlementList;
