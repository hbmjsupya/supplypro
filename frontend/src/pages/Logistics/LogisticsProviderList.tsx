import React, { useState, useEffect } from 'react';
import { Table, Card, Button, Space, Tag, message, Modal, Switch, Form, Input, Select, Row, Col } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import PageDoc from '../../components/PageDoc';
import request from '../../utils/request';
import { LogisticsProvider } from '../../types/logistics';
import { getLogisticsProviders, deleteLogisticsProvider, toggleLogisticsProviderStatus } from '../../services/logisticsService';

const LogisticsProviderList: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<LogisticsProvider[]>([]);
  const [userList, setUserList] = useState<any[]>([]);
  const [form] = Form.useForm();

  const loadData = async (params: any = {}) => {
    setLoading(true);
    try {
      const list = await getLogisticsProviders(params);
      setData(list);
    } catch (error) {
      message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchUser = async (value: string) => {
    if (value) {
      try {
        const res: any = await request.get('/users/list', { params: { username: value } });
        setUserList(res.content || []);
      } catch (error) {
        console.error(error);
      }
    }
  };

  useEffect(() => {
    loadData();
  }, [location.key]);

  const handleSearch = () => {
    form.validateFields().then(values => {
      // Map values to backend params
      let settlementPeriod;
      if (values.settlementCycle === 'Daily') settlementPeriod = 1;
      else if (values.settlementCycle === 'Weekly') settlementPeriod = 7;
      else if (values.settlementCycle === 'Monthly') settlementPeriod = 30;

      const params = {
        name: values.name,
        contactInfo: values.contactInfo,
        settlementType: values.settlementType,
        settlementPeriod,
        purchaserId: values.purchaserId
      };
      loadData(params);
    });
  };

  const handleReset = () => {
    form.resetFields();
    loadData();
  };

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除该物流供应商吗？此操作不可恢复。',
      onOk: async () => {
        try {
          await deleteLogisticsProvider(id);
          message.success('删除成功');
          loadData();
        } catch (error) {
          message.error('删除失败');
        }
      },
    });
  };

  const handleStatusChange = async (id: string, checked: boolean) => {
      try {
          await toggleLogisticsProviderStatus(id, checked ? 'enabled' : 'disabled');
          message.success(`已${checked ? '启用' : '禁用'}`);
          loadData();
      } catch (error) {
          message.error('状态更新失败');
      }
  };

  const columns = [
    {
      title: '物流供应商名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '联系人',
      dataIndex: 'contactPerson',
      key: 'contactPerson',
    },
    {
      title: '联系电话',
      dataIndex: 'contactPhone',
      key: 'contactPhone',
    },
    {
      title: '采购负责人',
      dataIndex: 'purchaserName',
      key: 'purchaserName',
      sorter: (a: any, b: any) => (a.purchaserName || a.procurementOwner || '').localeCompare(b.purchaserName || b.procurementOwner || ''),
      render: (text: string, record: any) => {
          const name = text || record.procurementOwner;
          return name ? `${name}/${record.purchaserId}` : '-';
      }
    },
    {
      title: '结算方式',
      key: 'settlement',
      render: (_: any, record: LogisticsProvider) => {
          return record.settlementType === 'CASH' ? '现付' : (record.settlementType === 'PREPAYMENT' ? '预付' : '-');
      }
    },
    {
      title: '结算周期',
      dataIndex: 'settlementPeriod',
      key: 'settlementPeriod',
      render: (val: number) => {
          if (val === 1) return '日结';
          if (val === 7) return '周结';
          if (val === 30) return '月结';
          return val ? `${val}天` : '-';
      }
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string, record: LogisticsProvider) => (
        <Switch
            checked={status === 'ACTIVE' || status === 'enabled'}
            onChange={(checked) => handleStatusChange(record.id, checked)}
            checkedChildren="启用"
            unCheckedChildren="禁用"
        />
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: LogisticsProvider) => (
        <Space size="middle">
          <Button 
            type="link" 
            icon={<EditOutlined />} 
            onClick={() => navigate(`/supply-chain/logistics-provider/detail/${record.id}`)}
          >
            编辑
          </Button>
          <Button 
            type="link" 
            danger 
            icon={<DeleteOutlined />} 
            onClick={() => handleDelete(record.id)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <PageDoc 
        pageTitle="供应链管理 > 物流供应商管理" 
        description="管理系统接入的物流服务商，维护基础信息及结算账户。" 
      />
      
      <Card variant="borderless">
        <div style={{ marginBottom: 16 }}>
            <Form form={form} layout="inline" onFinish={handleSearch}>
                <Form.Item name="name" label="供应商名称">
                    <Input placeholder="请输入供应商名称" />
                </Form.Item>
                <Form.Item name="contactInfo" label="联系人信息">
                    <Input placeholder="姓名/电话" />
                </Form.Item>
                <Form.Item name="purchaserId" label="采购负责人">
                    <Select
                        showSearch
                        placeholder="请选择"
                        style={{ width: 150 }}
                        allowClear
                        filterOption={false}
                        onSearch={handleSearchUser}
                        notFoundContent={null}
                        options={(userList || []).map(d => ({
                            value: d.id,
                            label: d.username,
                        }))}
                    />
                </Form.Item>
                <Form.Item name="settlementType" label="结算方式">
                    <Select placeholder="请选择" style={{ width: 120 }} allowClear>
                        <Select.Option value="CASH">现付</Select.Option>
                        <Select.Option value="PREPAYMENT">预付</Select.Option>
                    </Select>
                </Form.Item>
                <Form.Item name="settlementCycle" label="结算周期">
                    <Select placeholder="请选择" style={{ width: 120 }} allowClear>
                        <Select.Option value="Daily">日结</Select.Option>
                        <Select.Option value="Weekly">周结</Select.Option>
                        <Select.Option value="Monthly">月结</Select.Option>
                    </Select>
                </Form.Item>
                <Form.Item>
                    <Space>
                        <Button type="primary" htmlType="submit">查询</Button>
                        <Button onClick={handleReset}>重置</Button>
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/supply-chain/logistics-provider/create')}>
                          新增
                        </Button>
                    </Space>
                </Form.Item>
            </Form>
        </div>
        
        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
        />
      </Card>
    </div>
  );
};

export default LogisticsProviderList;
