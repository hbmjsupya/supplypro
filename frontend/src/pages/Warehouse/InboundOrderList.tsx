import React, { useState, useEffect } from 'react';
import { Table, Button, Card, Space, Tag, Modal, message, Form, Select, InputNumber, Descriptions, Timeline, Typography } from 'antd';
import { PlusOutlined, CheckCircleOutlined, FileTextOutlined, ClockCircleOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';
import { InboundOrder, InboundOrderItem } from '../../types/warehouse';
import { getInboundOrders, createInboundOrder, confirmInboundOrder, getWarehouseNameMap } from '../../services/warehouseService';
import { getPurchaseOrders } from '../../services/purchaseOrderService';
import PageDoc from '../../components/PageDoc';

const InboundOrderList: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<InboundOrder[]>([]);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<InboundOrder | null>(null);
  
  // Data for creation
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [warehouseMap, setWarehouseMap] = useState<Record<string, string>>({});
  const [form] = Form.useForm();

  const loadData = async () => {
    setLoading(true);
    try {
      const [orders, whMap] = await Promise.all([getInboundOrders(), getWarehouseNameMap()]);
      setData(orders);
      setWarehouseMap(whMap);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleConfirmArrival = (record: InboundOrder) => {
    setSelectedOrder(record);
    setConfirmModalOpen(true);
  };

  const submitConfirm = async () => {
    if (selectedOrder) {
      await confirmInboundOrder(selectedOrder.id, 'CurrentUser'); // Mock user
      message.success('入库确认成功，库存已更新');
      setConfirmModalOpen(false);
      loadData();
    }
  };

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    const h = date.getHours().toString().padStart(2, '0');
    const min = date.getMinutes().toString().padStart(2, '0');
    const s = date.getSeconds().toString().padStart(2, '0');
    return `${y}年${m}月${d}日 ${h}:${min}:${s}`;
  };

  const columns: ColumnsType<InboundOrder> = [
    { title: '入库单号', dataIndex: 'id', key: 'id' },
    { 
        title: '关联采购单', 
        dataIndex: 'poNo', 
        key: 'poNo',
        render: (text) => <a href={`/supply-chain/purchase-order`}>{text}</a>
    },
    { title: '供应商', dataIndex: 'supplierName', key: 'supplierName' },
    { 
        title: '入库仓库', 
        dataIndex: 'warehouseCode', 
        key: 'warehouseCode',
        render: (code) => warehouseMap[code] || code
    },
    {
        title: '商品明细',
        key: 'items',
        width: 300,
        render: (_, record) => (
            <div style={{ fontSize: 12 }}>
                {record.items.map((item, idx) => (
                    <div key={idx} style={{ marginBottom: 4 }}>
                        {item.productName} ({item.specName}) x {item.quantity}
                        <br/>
                        <span style={{ color: '#999' }}>单价: ¥{item.unitCost} | 合计: ¥{(item.quantity * item.unitCost).toFixed(2)}</span>
                    </div>
                ))}
            </div>
        )
    },
    { 
        title: '成本总计', 
        key: 'totalCost',
        render: (_, record) => `¥${record.items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0).toFixed(2)}`
    },
    { 
      title: '状态', 
      dataIndex: 'status', 
      key: 'status',
      render: (status) => (
        <Tag color={status === 'completed' ? 'green' : 'orange'}>
          {status === 'completed' ? '已完成' : '待确认'}
        </Tag>
      )
    },
    { 
      title: '创建时间', 
      dataIndex: 'createTime', 
      key: 'createTime',
      render: (t) => formatDate(t)
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          {record.status === 'pending' && (
            <Button type="primary" size="small" icon={<CheckCircleOutlined />} onClick={() => handleConfirmArrival(record)}>
              确认到货
            </Button>
          )}
          <Button size="small" onClick={() => navigate(`/supply-chain/inbound/detail/${record.id}`)}>详情</Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <PageDoc 
        pageTitle="仓储管理 > 采购入库"
        description={`
          **功能说明**：
          1. **入库单管理**：管理所有采购入库单据。入库单必须关联有效的采购单。
          2. **创建入库单**：
             - 选择已审核通过的采购单。
             - 指定入库仓库。
             - 系统自动带入采购单商品明细及待入库数量。
          3. **确认到货**：
             - 库管员核对实物与单据。
             - 确认无误后，系统将状态更新为“已完成”。
             - **自动逻辑**：确认到货后，系统自动创建对应的库存批次（Inventory Batch），增加仓库库存。
        `}
        fields={[
          { name: 'id', type: 'String', desc: '入库单号' },
          { name: 'poNo', type: 'String', desc: '关联采购单号' },
          { name: 'supplierName', type: 'String', desc: '供应商名称' },
          { name: 'warehouseCode', type: 'String', desc: '入库仓库代码' },
          { name: 'status', type: 'Enum', desc: '状态: pending(待确认), completed(已完成)' },
          { name: 'createTime', type: 'DateTime', desc: '创建时间' },
          { name: 'items', type: 'Array', desc: '入库商品明细' },
        ]}
        flowchart={`
          graph LR
            A[采购单生效] --> B[创建入库单]
            B --> C{待确认}
            C -->|确认到货| D[已完成]
            D -.-> E[生成库存批次]
        `}
      />
      <Card title="采购入库管理">
      <Table columns={columns} dataSource={data} rowKey="id" loading={loading} />

      {/* Confirm Modal */}
      <Modal
        title="确认到货"
        open={confirmModalOpen}
        onOk={submitConfirm}
        onCancel={() => setConfirmModalOpen(false)}
      >
        <p>确认以下商品已实际到货并入库？</p>
        {selectedOrder && (
          <ul>
            {selectedOrder.items.map((item, idx) => (
              <li key={idx}>{item.productName} ({item.specName}) x {item.quantity}</li>
            ))}
          </ul>
        )}
        <p style={{ color: '#999', fontSize: 12 }}>确认后将自动生成库存批次。</p>
      </Modal>
      </Card>
    </div>
  );
};

export default InboundOrderList;
