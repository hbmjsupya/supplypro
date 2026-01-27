import React, { useState, useEffect } from 'react';
import { Table, Card, Button, Space, Tag, message, Modal, Switch } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import PageDoc from '../../components/PageDoc';
import { LogisticsProvider } from '../../types/logistics';
import { getLogisticsProviders, deleteLogisticsProvider, toggleLogisticsProviderStatus } from '../../services/logisticsService';

const LogisticsProviderList: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<LogisticsProvider[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const list = await getLogisticsProviders();
      setData(list);
    } catch (error) {
      message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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
      dataIndex: 'contactName',
      key: 'contactName',
    },
    {
      title: '联系电话',
      dataIndex: 'contactPhone',
      key: 'contactPhone',
    },
    {
      title: '结算方式',
      key: 'settlement',
      render: (_: any, record: LogisticsProvider) => {
          return record.settlementType === 'Period' ? '周期结算' : '现付';
      }
    },
    {
      title: '结算周期',
      dataIndex: 'settlementCycle',
      key: 'settlementCycle',
      filters: [
          { text: '日结', value: 'Daily' },
          { text: '周结', value: 'Weekly' },
          { text: '月结', value: 'Monthly' },
      ],
      onFilter: (value: any, record: LogisticsProvider) => record.settlementCycle === value,
      render: (val: string) => {
          const map: any = { 'Daily': '日结', 'Weekly': '周结', 'Monthly': '月结' };
          return map[val] || '-';
      }
    },
    {
      title: '账户类型',
      key: 'accountType',
      render: (_: any, record: LogisticsProvider) => {
          const defaultAccount = record.accounts.find(a => a.isDefault);
          return defaultAccount ? (defaultAccount.type === 'Company' ? '公司' : '个人') : '-';
      }
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string, record: LogisticsProvider) => (
        <Switch
            checked={status === 'enabled'}
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
      
      <Card bordered={false}>
        <div style={{ marginBottom: 16 }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/supply-chain/logistics-provider/create')}>
            新增物流供应商
          </Button>
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
