import React, { useState, useEffect } from 'react';
import { Table, Tag, Card, Statistic, Row, Col, Button, Modal, Form, InputNumber, Input, message } from 'antd';
import request from '../../utils/request';

interface PrepaymentLog {
  id: number;
  type: 'CHARGE' | 'DEDUCT' | 'REFUND';
  amount: number;
  balanceAfter: number;
  relatedOrderNo?: string;
  remark?: string;
  createTime: string;
  createdBy?: string;
}

interface Props {
  supplierId: number;
}

const SupplierPrepaymentLog: React.FC<Props> = ({ supplierId }) => {
  const [logs, setLogs] = useState<PrepaymentLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await request.get(`/suppliers/${supplierId}/prepayment/logs`);
      setLogs(res.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (supplierId) {
      fetchLogs();
    }
  }, [supplierId]);

  const handleCharge = async () => {
    try {
      const values = await form.validateFields();
      await request.post(`/suppliers/${supplierId}/prepayment/charge`, values);
      message.success('充值成功');
      setIsModalVisible(false);
      form.resetFields();
      fetchLogs();
    } catch (error) {
      console.error(error);
    }
  };

  const columns = [
    {
      title: '类型',
      dataIndex: 'type',
      render: (type: string) => {
        const colors = { CHARGE: 'green', DEDUCT: 'red', REFUND: 'orange' };
        const texts = { CHARGE: '充值', DEDUCT: '消费', REFUND: '退回' };
        return <Tag color={colors[type as keyof typeof colors]}>{texts[type as keyof typeof texts]}</Tag>;
      }
    },
    {
      title: '金额',
      dataIndex: 'amount',
      render: (val: number, record: PrepaymentLog) => (
        <span style={{ color: record.type === 'DEDUCT' ? 'red' : 'green' }}>
          {record.type === 'DEDUCT' ? '-' : '+'}{val.toFixed(2)}
        </span>
      )
    },
    {
      title: '变动后余额',
      dataIndex: 'balanceAfter',
      render: (val: number) => `¥${val.toFixed(2)}`
    },
    {
      title: '关联单号',
      dataIndex: 'relatedOrderNo',
    },
    {
      title: '备注',
      dataIndex: 'remark',
    },
    {
      title: '操作人',
      dataIndex: 'createdBy',
    },
    {
      title: '时间',
      dataIndex: 'createTime',
    }
  ];

  return (
    <Card 
      title="预付款账户" 
      extra={<Button type="primary" onClick={() => setIsModalVisible(true)}>充值</Button>}
      variant="borderless"
      style={{ marginTop: 24 }}
    >
      <Table 
        dataSource={logs} 
        columns={columns} 
        rowKey="id" 
        loading={loading}
        pagination={{ pageSize: 10 }}
      />

      <Modal
        title="预付款充值"
        open={isModalVisible}
        onOk={handleCharge}
        onCancel={() => setIsModalVisible(false)}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="amount" label="充值金额" rules={[{ required: true, message: '请输入金额' }]}>
            <InputNumber style={{ width: '100%' }} prefix="¥" min={0.01} precision={2} />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default SupplierPrepaymentLog;
