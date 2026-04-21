import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Space, Tag, Form, Input, Select, Dropdown, message, Modal } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { MenuProps } from 'antd';
import { EyeOutlined, CheckCircleOutlined, DownOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import PageDoc from '../../components/PageDoc';
import SearchFormLayout from '../../components/SearchFormLayout';
import request from '../../utils/request';
import { formatTimeFull } from '../../utils/dateFormatter';

interface RefundOrderItem {
  key: string;
  id: number;
  refundNo: string;
  relatedOrderNo: string;
  platformRefundNo: string;
  specName: string;
  quantity: number;
  refundAmount: number;
  refundType: 'REFUND_ONLY' | 'REFUND_RETURN';
  bearer: 'SUPPLIER' | 'PLATFORM';
  status: 'PENDING' | 'RETURNING' | 'RECEIVED' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
}

const statusMap: Record<string, { color: string; text: string }> = {
  PENDING: { color: 'default', text: '待处理' },
  RETURNING: { color: 'processing', text: '退货中' },
  RECEIVED: { color: 'success', text: '已收货' },
  COMPLETED: { color: 'green', text: '已完成' },
  CANCELLED: { color: 'red', text: '已取消' },
};

const RefundOrderList: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<RefundOrderItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [form] = Form.useForm();

  const fetchData = useCallback(async (p = page, ps = pageSize) => {
    setLoading(true);
    try {
      const values = form.getFieldsValue();
      const params: any = { page: p, size: ps };
      if (values.refundNo) params.refundNo = values.refundNo;
      if (values.relatedOrderNo) params.relatedOrderNo = values.relatedOrderNo;
      if (values.platformRefundNo) params.platformRefundNo = values.platformRefundNo;
      if (values.refundType) params.refundType = values.refundType;
      if (values.bearer) params.bearer = values.bearer;
      if (values.status) params.status = values.status;

      const res: any = await request.get('/refund-orders', { params });
      const d = res.data || res;
      const records = (d.records || []).map((item: any) => ({
        key: String(item.id),
        id: item.id,
        refundNo: item.refundNo,
        relatedOrderNo: item.relatedOrderNo || '-',
        platformRefundNo: item.platformRefundNo || '-',
        specName: item.specName || '-',
        quantity: item.quantity || 0,
        refundAmount: Number(item.refundAmount) || 0,
        refundType: item.refundType,
        bearer: item.bearer,
        status: item.status,
        createdAt: formatTimeFull(item.createdAt),
      }));
      setData(records);
      setTotal(d.totalElements || 0);
    } catch {
      message.error('加载退款单列表失败');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, form]);

  useEffect(() => {
    fetchData();
  }, [location.key, fetchData]);

  const handleSearch = () => {
    setPage(0);
    fetchData(0, pageSize);
  };

  const handleReset = () => {
    form.resetFields();
    setPage(0);
    fetchData(0, pageSize);
  };

  const handleConfirmReceipt = async (id: number) => {
    Modal.confirm({
      title: '确认收货',
      content: '确认已收到退货商品？',
      onOk: async () => {
        try {
          await request.put(`/refund-orders/${id}/confirm-receipt`, { receivedBy: '当前用户' });
          message.success('确认收货成功');
          fetchData();
        } catch {
          message.error('确认收货失败');
        }
      },
    });
  };

  const columns: ColumnsType<RefundOrderItem> = [
    { title: '退款单号', dataIndex: 'refundNo', key: 'refundNo' },
    { title: '关联业务单号', dataIndex: 'relatedOrderNo', key: 'relatedOrderNo' },
    { title: '运营退款单号', dataIndex: 'platformRefundNo', key: 'platformRefundNo' },
    { title: '商品规格', dataIndex: 'specName', key: 'specName' },
    { title: '数量', dataIndex: 'quantity', key: 'quantity' },
    {
      title: '退款金额',
      dataIndex: 'refundAmount',
      key: 'refundAmount',
      render: (val) => `¥${Number(val).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    },
    {
      title: '退款类型',
      dataIndex: 'refundType',
      key: 'refundType',
      render: (type) => (
        <Tag color={type === 'REFUND_ONLY' ? 'blue' : 'orange'}>
          {type === 'REFUND_ONLY' ? '仅退款' : '退款退货'}
        </Tag>
      ),
    },
    {
      title: '承担方',
      dataIndex: 'bearer',
      key: 'bearer',
      render: (bearer) => (
        <Tag color={bearer === 'SUPPLIER' ? 'gold' : 'cyan'}>
          {bearer === 'SUPPLIER' ? '供应商' : '平台'}
        </Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const s = statusMap[status] || { color: 'default', text: status };
        return <Tag color={s.color}>{s.text}</Tag>;
      },
    },
    { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt' },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_, record) => {
        const items: MenuProps['items'] = [
          {
            key: 'view',
            label: '查看详情',
            icon: <EyeOutlined />,
            onClick: () => navigate(`/supply-chain/refund-order/detail/${record.id}`),
          },
        ];

        if (record.refundType === 'REFUND_RETURN' && record.status === 'RETURNING') {
          items.push({
            key: 'confirm',
            label: '确认收货',
            icon: <CheckCircleOutlined />,
            onClick: () => handleConfirmReceipt(record.id),
          });
        }

        return (
          <Dropdown menu={{ items }}>
            <a onClick={(e) => e.preventDefault()}>
              操作 <DownOutlined />
            </a>
          </Dropdown>
        );
      },
    },
  ];

  return (
    <div style={{ background: '#fff', padding: 24, minHeight: 360 }}>
      <PageDoc
        pageTitle="供应链管理 > 退款单管理"
        description="退款单管理页面，展示运营平台推送的退款信息。支持按退款单号、关联业务单号、运营退款单号搜索，按退款类型、承担方、状态筛选。"
        fields={[]}
      />

      <SearchFormLayout onFinish={handleSearch} onReset={handleReset} form={form}>
        <Form.Item name="refundNo" label="退款单号" style={{ marginBottom: 0 }}>
          <Input placeholder="请输入" />
        </Form.Item>
        <Form.Item name="relatedOrderNo" label="关联业务单号" style={{ marginBottom: 0 }}>
          <Input placeholder="请输入" />
        </Form.Item>
        <Form.Item name="platformRefundNo" label="运营退款单号" style={{ marginBottom: 0 }}>
          <Input placeholder="请输入" />
        </Form.Item>
        <Form.Item name="refundType" label="退款类型" style={{ marginBottom: 0 }}>
          <Select placeholder="请选择" allowClear>
            <Select.Option value="REFUND_ONLY">仅退款</Select.Option>
            <Select.Option value="REFUND_RETURN">退款退货</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item name="bearer" label="承担方" style={{ marginBottom: 0 }}>
          <Select placeholder="请选择" allowClear>
            <Select.Option value="SUPPLIER">供应商</Select.Option>
            <Select.Option value="PLATFORM">平台</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item name="status" label="状态" style={{ marginBottom: 0 }}>
          <Select placeholder="请选择" allowClear>
            <Select.Option value="PENDING">待处理</Select.Option>
            <Select.Option value="RETURNING">退货中</Select.Option>
            <Select.Option value="RECEIVED">已收货</Select.Option>
            <Select.Option value="COMPLETED">已完成</Select.Option>
            <Select.Option value="CANCELLED">已取消</Select.Option>
          </Select>
        </Form.Item>
      </SearchFormLayout>

      <Table
        columns={columns}
        dataSource={data}
        loading={loading}
        scroll={{ x: 1200 }}
        pagination={{
          current: page + 1,
          pageSize,
          total,
          showSizeChanger: true,
          onChange: (p, ps) => {
            setPage(p - 1);
            setPageSize(ps);
            fetchData(p - 1, ps);
          },
        }}
      />
    </div>
  );
};

export default RefundOrderList;
