import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Space, Tag, message, Modal, Form, Input, Select, Dropdown } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { MenuProps } from 'antd';
import { PlusOutlined, EditOutlined, StopOutlined, CheckCircleOutlined, EyeOutlined, ExportOutlined, AccountBookOutlined, DownOutlined, BankOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import PageDoc from '../../components/PageDoc';
import SearchFormLayout from '../../components/SearchFormLayout';
import { useExport } from '../../utils/exportUtils';
import { LogisticsProvider } from '../../types/logistics';
import { getLogisticsProviders, deleteLogisticsProvider, toggleLogisticsProviderStatus } from '../../services/logisticsService';
import request from '../../utils/request';

interface LogisticsProviderDataType {
  key: string;
  name: string;
  contactPerson: string;
  contactPhone: string;
  purchaserInfo: string;
  purchaserId?: number;
  settlementType: 'CASH' | 'PREPAYMENT' | 'PERIOD';
  settlementPeriod: number;
  status: 'Enabled' | 'Disabled';
}

const LogisticsProviderList: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<LogisticsProviderDataType[]>([]);
  const [userOptions, setUserOptions] = useState<{label: string, value: number}[]>([]);
  const [form] = Form.useForm();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res: any = await request.get('/users/list');
        if (res && res.content) {
          setUserOptions(res.content.map((u: any) => ({ label: u.username, value: u.id })));
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchUsers();
  }, []);

  const loadData = useCallback(async (params: Record<string, unknown> = {}) => {
    setLoading(true);
    try {
      const list = await getLogisticsProviders(params, false);
      const mappedData: LogisticsProviderDataType[] = (list || []).map((item: LogisticsProvider) => ({
        key: String(item.id),
        name: item.name,
        contactPerson: item.contactPerson || '-',
        contactPhone: item.contactPhone || '-',
        purchaserInfo: item.purchaserName || item.procurementOwner || '-',
        purchaserId: item.purchaserId,
        settlementType: item.settlementType,
        settlementPeriod: item.settlementPeriod,
        status: item.status === 'ACTIVE' || item.status === 'enabled' ? 'Enabled' : 'Disabled',
      }));
      setData(mappedData);
    } catch {
      message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [location.key, loadData]);

  const handleSearch = () => {
    form.validateFields().then(values => {
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

  const handleStatusChange = async (key: string, newStatus: 'Enabled' | 'Disabled') => {
    try {
      await toggleLogisticsProviderStatus(key, newStatus === 'Enabled' ? 'enabled' : 'disabled');
      message.success(`物流供应商状态已更新为 ${newStatus === 'Enabled' ? '已启用' : '已禁用'}`);
      loadData();
    } catch {
      message.error('状态更新失败');
    }
  };

  const handleDelete = (key: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除该物流供应商吗？此操作不可恢复。',
      onOk: async () => {
        try {
          await deleteLogisticsProvider(key);
          message.success('删除成功');
          loadData();
        } catch {
          message.error('删除失败');
        }
      },
    });
  };

  const { handleExport, exporting, progress } = useExport<LogisticsProviderDataType>({
    filenamePrefix: '物流供应商列表',
    fetchData: () => data,
    columns: [
      { title: '物流供应商名称', dataIndex: 'name' },
      { title: '联系人', dataIndex: 'contactPerson' },
      { title: '联系电话', dataIndex: 'contactPhone' },
      { title: '采购负责人', dataIndex: 'purchaserInfo' },
      { title: '结算方式', dataIndex: 'settlementType', render: (val) => val === 'PREPAYMENT' ? '预付' : val === 'CASH' ? '现付' : '-' },
      { title: '状态', dataIndex: 'status', render: (val) => val === 'Enabled' ? '已启用' : '已禁用' },
    ]
  });

  const columns: ColumnsType<LogisticsProviderDataType> = [
    { title: '物流供应商名称', dataIndex: 'name', key: 'name' },
    { title: '联系人', dataIndex: 'contactPerson', key: 'contactPerson' },
    { title: '联系电话', dataIndex: 'contactPhone', key: 'contactPhone' },
    { title: '采购负责人', dataIndex: 'purchaserInfo', key: 'purchaserInfo' },
    {
      title: '结算方式',
      dataIndex: 'settlementType',
      key: 'settlementType',
      render: (type) => (
        <Tag color={type === 'PREPAYMENT' ? 'gold' : 'blue'}>
          {type === 'PREPAYMENT' ? '预付' : type === 'CASH' ? '现付' : '-'}
        </Tag>
      ),
    },
    {
      title: '结算周期',
      dataIndex: 'settlementPeriod',
      key: 'settlementPeriod',
      render: (val, record) => {
        if (record.settlementType === 'PREPAYMENT') {
          return null;
        }
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
      render: (status) => (
        <Tag color={status === 'Enabled' ? 'success' : 'error'}>
          {status === 'Enabled' ? '已启用' : '已禁用'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_, record) => {
        const items: MenuProps['items'] = [
          {
            key: 'view',
            label: '查看',
            icon: <EyeOutlined />,
            onClick: () => navigate(`/supply-chain/logistics-provider/detail/${record.key}`),
          },
          ...(record.settlementType === 'PREPAYMENT' ? [{
            key: 'prepayment',
            label: '预付款管理',
            icon: <BankOutlined />,
            onClick: () => navigate(`/supply-chain/logistics-provider/prepayment-list/${record.key}`),
          }] : []),
          ...(record.settlementType === 'PREPAYMENT' ? [{
            key: 'log',
            label: '预付款流水',
            icon: <AccountBookOutlined />,
            onClick: () => navigate(`/supply-chain/logistics-provider/prepayment-log/${record.key}`),
          }] : []),
          {
            key: 'edit',
            label: '编辑',
            icon: <EditOutlined />,
            onClick: () => navigate(`/supply-chain/logistics-provider/detail/${record.key}`),
          },
          {
            key: 'status',
            label: record.status === 'Enabled' ? '禁用' : '启用',
            icon: record.status === 'Enabled' ? <StopOutlined /> : <CheckCircleOutlined />,
            danger: record.status === 'Enabled',
            onClick: () => handleStatusChange(record.key, record.status === 'Enabled' ? 'Disabled' : 'Enabled'),
          },
        ];

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
        pageTitle="供应链管理 > 物流供应商管理"
        description={`物流供应商管理页面为物流供应商列表页。

1. **列表字段**：
   - 物流供应商名称、联系人、联系电话。
   - 采购负责人信息（姓名）。
   - **结算方式**（现付/预付）、**结算周期**（仅现付显示）。
   - 物流供应商状态。

2. **状态说明**：
   - **已启用**：启用状态物流供应商可在其他业务操作页面中被选择。
   - **已禁用**：禁用状态不可被选择。

3. **搜索与筛选**：
   - 支持搜索：物流供应商名称、联系人信息、采购负责人信息。
   - 支持筛选：结算方式、结算周期。

4. **高级功能**：
   - **批量导出**：导出所有搜索结果到Excel。
   - **新增物流供应商**：跳转至新增详情页。`}
        fields={[
          { name: 'name', type: 'String', length: '200', required: true, unique: false, desc: '物流供应商名称' },
          { name: 'contactPerson', type: 'String', length: '50', required: true, unique: false, desc: '联系人' },
          { name: 'contactPhone', type: 'String', length: '20', required: true, unique: false, desc: '联系电话' },
        ]}
      />
      <SearchFormLayout 
        onFinish={handleSearch} 
        onReset={handleReset} 
        form={form}
      >
        <Form.Item name="name" label="供应商名称" style={{ marginBottom: 0 }}>
          <Input placeholder="请输入" />
        </Form.Item>
        <Form.Item name="contactInfo" label="联系人信息" style={{ marginBottom: 0 }}>
          <Input placeholder="姓名/电话" />
        </Form.Item>
        <Form.Item name="purchaserId" label="采购负责人" style={{ marginBottom: 0 }}>
          <Select placeholder="请选择" allowClear options={userOptions} />
        </Form.Item>
        <Form.Item name="settlementType" label="结算方式" style={{ marginBottom: 0 }}>
          <Select placeholder="请选择" allowClear>
            <Select.Option value="PREPAYMENT">预付</Select.Option>
            <Select.Option value="CASH">现付</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item name="settlementCycle" label="结算周期" style={{ marginBottom: 0 }}>
          <Select placeholder="请选择" allowClear>
            <Select.Option value="Daily">日结</Select.Option>
            <Select.Option value="Weekly">周结</Select.Option>
            <Select.Option value="Monthly">月结</Select.Option>
          </Select>
        </Form.Item>
      </SearchFormLayout>

      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/supply-chain/logistics-provider/create')}>
            新增物流供应商
          </Button>
        </Space>
        <Space>
          <Button icon={<ExportOutlined />} onClick={handleExport} loading={exporting}>
            {exporting ? `导出中 ${progress}%` : '批量导出'}
          </Button>
        </Space>
      </div>

      <Table columns={columns} dataSource={data} scroll={{ x: 1100 }} loading={loading} />
    </div>
  );
};

export default LogisticsProviderList;
