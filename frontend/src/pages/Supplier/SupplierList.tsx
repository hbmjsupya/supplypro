import React, { useState, useEffect } from 'react';
import { Table, Button, Input, Select, Space, Tag, message, Row, Col, Form, Dropdown, Modal } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, EditOutlined, StopOutlined, CheckCircleOutlined, EyeOutlined, ExportOutlined, AccountBookOutlined, DownOutlined, BankOutlined, WarningOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import PageDoc from '../../components/PageDoc';
import SearchFormLayout from '../../components/SearchFormLayout';
import { useExport } from '../../utils/exportUtils';
import { getSuppliers, SupplierDTO } from '../../services/supplierService';
import request from '../../utils/request';

interface SupplierDataType {
  key: string;
  supplierName: string;
  supplierId: string;
  contact: string;
  brands: string[];
  contactInfo: string;
  purchaserInfo: string;
  status: 'Enabled' | 'Disabled';
  createTime: string;
  coopEndTime: string;
  settlementType?: 'Cash' | 'Prepayment' | 'Period';
  settlementCycle?: string;
  orgCode?: string;
  purchaserId?: number;
  [key: string]: unknown;
}

const SupplierList: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [showExpiring, setShowExpiring] = useState(false);
  const [suppliers, setSuppliers] = useState<SupplierDataType[]>([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [userOptions, setUserOptions] = useState<{label: string, value: number}[]>([]);

  // Fetch users for purchaser filter
  useEffect(() => {
    const fetchUsers = async () => {
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const res: any = await request.get('/users/list');
            if (res && res.content) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                setUserOptions(res.content.map((u: any) => ({ label: u.username, value: u.id })));
            }
        } catch (e) {
            console.error(e);
        }
    };
    fetchUsers();
  }, []);

  const fetchSuppliers = React.useCallback(async (page = 1, size = 10) => {
    setLoading(true);
    try {
      const values = form.getFieldsValue();
      const res = await getSuppliers({ 
        page: page - 1, 
        size,
        name: values.supplierName,
        settlementType: values.settlementType,
        settlementPeriod: values.settlementPeriod,
        purchaserId: values.purchaserId,
        contactInfo: values.contactInfo,
        expiringSoon: showExpiring
      });
      const mappedData: SupplierDataType[] = res.content.map((item: SupplierDTO) => ({
        key: item.id.toString(),
        supplierName: item.name,
        supplierId: item.supplierNo,
        contact: item.contactPerson,
        brands: item.brandNames || [],
        contactInfo: `${item.contactPhone || ''} / ${item.address || ''}`,
        purchaserInfo: item.purchaserName || '-',
        status: item.status === 'ACTIVE' ? 'Enabled' : 'Disabled',
        createTime: item.createdAt,
        coopEndTime: item.coopEndTime ? item.coopEndTime.substring(0, 10) : '-',
        settlementType: item.settlementType === 'PREPAYMENT' ? 'Prepayment' : item.settlementType === 'CASH' ? 'Cash' : 'Period',
        settlementCycle: item.settlementPeriod === 1 ? 'Daily' :
                         item.settlementPeriod === 7 ? 'Weekly' :
                         item.settlementPeriod === 30 ? 'Monthly' : 
                         item.settlementPeriod === 90 ? 'Quarterly' :
                         item.settlementPeriod ? `${item.settlementPeriod} Days` : '-',
        orgCode: item.orgCode,
        purchaserId: item.purchaserId
      }));
      setSuppliers(mappedData);
      setPagination(prev => ({ ...prev, current: page, total: res.totalElements }));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [form, showExpiring]);

  useEffect(() => {
    fetchSuppliers(pagination.current, pagination.pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchSuppliers, pagination.current, pagination.pageSize, location.key]);

  const handleStatusChange = async (key: string, newStatus: 'Enabled' | 'Disabled') => {
    try {
      const status = newStatus === 'Enabled' ? 'ACTIVE' : 'INACTIVE';
      await request.put(`/suppliers/${key}/status?status=${status}`);
      message.success(`供应商状态已更新为 ${newStatus === 'Enabled' ? '已启用' : '已禁用'}`);
      fetchSuppliers(pagination.current, pagination.pageSize);
    } catch (error) {
      console.error(error);
      message.error('状态更新失败');
    }
  };

  // Filtered data is now handled by backend via showExpiring state triggering fetch
  const filteredData = suppliers;

  const { handleExport, exporting, progress } = useExport<SupplierDataType>({
    filenamePrefix: '供应商列表',
    fetchData: () => filteredData,
    columns: [
      { title: '供应商ID', dataIndex: 'supplierId' },
      { title: '供应商全称', dataIndex: 'supplierName' },
      { title: '主要联系人', dataIndex: 'contact' },
      { title: '联系电话', dataIndex: 'contactInfo', render: (val) => val.split(' / ')[0] || val },
      { title: '采购员信息', dataIndex: 'purchaserInfo' },
      { title: '状态', dataIndex: 'status', render: (val) => val === 'Enabled' ? '已启用' : '已禁用' },
      { title: '创建时间', dataIndex: 'createTime' },
      { title: '合作结束时间', dataIndex: 'coopEndTime' },
    ]
  });

  const columns: ColumnsType<SupplierDataType> = [
    { title: '供应商ID', dataIndex: 'supplierId', key: 'supplierId', width: 100 },
    { title: '供应商名称', dataIndex: 'supplierName', key: 'supplierName' },
    {
      title: '联系人信息',
      key: 'contactInfo',
      render: (_, record) => {
         const phone = record.contactInfo.split(' / ')[0];
         return `${record.contact} (${phone})`;
      }
    },
    {
      title: '合作品牌',
      dataIndex: 'brands',
      key: 'brands',
      render: (brands: string[]) => (
        <Space wrap>
          {brands && brands.map((b) => <Tag key={b}>{b}</Tag>)}
        </Space>
      ),
    },
    { title: '采购负责人', dataIndex: 'purchaserInfo', key: 'purchaserInfo' },
    {
      title: '结算类型',
      dataIndex: 'settlementType',
      key: 'settlementType',
      width: 100,
      render: (type) => (
        <Tag color={type === 'Prepayment' ? 'gold' : 'blue'}>
          {type === 'Prepayment' ? '预付' : '现付'}
        </Tag>
      ),
    },
    {
      title: '结算周期',
      dataIndex: 'settlementCycle',
      key: 'settlementCycle',
      width: 100,
      render: (text, record) => {
        if (record.settlementType === 'Prepayment') {
           return null;
        }
        const cycleMap: Record<string, string> = {
           'Monthly': '月结',
           'Weekly': '周结',
           'Quarterly': '季结',
           'Daily': '日结'
        };
        return cycleMap[text] || text || '-';
      }
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status) => (
        <Tag color={status === 'Enabled' ? 'success' : 'error'}>
          {status === 'Enabled' ? '已启用' : '已禁用'}
        </Tag>
      ),
    },
    { 
        title: '合作截止时间', 
        dataIndex: 'coopEndTime', 
        key: 'coopEndTime', 
        width: 120,
        render: (text) => {
             // Check if expiring soon logic needed for display
             if (text === '-') return text;
             const endDate = new Date(text);
             const today = new Date();
             const diffTime = endDate.getTime() - today.getTime();
             const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
             const isExpiring = diffDays <= 30 && diffDays >= 0;
             return isExpiring ? <Tag color="error" icon={<WarningOutlined />}>{text} (临期)</Tag> : text;
        }
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_, record) => {
        const items = [
          {
            key: 'view',
            label: '查看',
            icon: <EyeOutlined />,
            onClick: () => navigate(`/supply-chain/supplier/view/${record.key}`),
          },
          ...(record.settlementType === 'Prepayment' ? [{
            key: 'prepayment',
            label: '预付款管理',
            icon: <BankOutlined />,
            onClick: () => navigate(`/supply-chain/supplier/prepayment-list/${record.key}`),
          }] : []),
          ...(record.settlementType === 'Prepayment' ? [{
            key: 'log',
            label: '预付款流水',
            icon: <AccountBookOutlined />,
            onClick: () => navigate(`/supply-chain/supplier/prepayment-log/${record.key}`),
          }] : []),
          {
            key: 'edit',
            label: '编辑',
            icon: <EditOutlined />,
            onClick: () => navigate(`/supply-chain/supplier/edit/${record.key}`),
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
        pageTitle="供应链管理 > 供应商管理"
        description={`供应商管理页面为供应商列表页。

1. **列表字段**：
   - 供应商名称、供应商ID、联系人。
   - 品牌名称（可展示多个）、联系人信息（手机号、地址）、采购负责人信息（姓名、手机号）。
   - **结算类型**（现付/预付）、**结算周期**（仅现付显示）。
   - 供应商状态、创建时间、合作截止时间。
   - 操作列：查看、启用（禁用状态时显示）、禁用（启用状态时显示）、编辑。

2. **数据来源说明**：
   - **品牌信息**：调用[品牌管理]模块数据（更新频率：实时；权限：读取）。
   - **采购负责人**：调用[用户中心/权限系统]数据（更新频率：缓存/实时；权限：读取）。

3. **状态说明**：
   - **已启用**：启用状态供应商可在其他业务操作页面如商品管理、采购订单管理中被选择。
   - **已禁用**：禁用状态不可被选择。

4. **搜索与筛选**：
   - 支持搜索：供应商信息（名称）、品牌信息（模糊搜索/可查可选）、联系人信息（手机号/地址）、采购负责人信息。
   - 支持筛选：创建时间范围、合作截止时间范围、合作状态。

5. **高级功能**：
   - **查看临期供应商**：展示合作截止时间距离当前30天内的供应商列表。
   - **批量导出**：导出所有搜索结果到Excel。
   - **新增供应商**：跳转至新增详情页。

6. **异常处理**：
   - **加载失败**：网络异常时提示错误。
   - **无数据**：筛选无结果时展示空状态。`}
        fields={[
          { name: 'supplierId', type: 'String', length: '32', required: true, unique: true, desc: '供应商ID (SUP+...)' },
          { name: 'supplierName', type: 'String', length: '200', required: true, unique: false, desc: '供应商全称' },
          { name: 'contact', type: 'String', length: '50', required: true, unique: false, desc: '主要联系人' },
          { name: 'phone', type: 'String', length: '20', required: true, unique: false, desc: '联系电话' },
        ]}
      />
      <SearchFormLayout 
        onFinish={() => fetchSuppliers(1, pagination.pageSize)} 
        onReset={() => { form.resetFields(); fetchSuppliers(1, pagination.pageSize); }} 
        form={form}
        extraButtons={
           <Button icon={<WarningOutlined />} onClick={() => setShowExpiring(!showExpiring)} type={showExpiring ? 'primary' : 'default'} danger={showExpiring}>
              {showExpiring ? '显示全部' : '临期预警'}
           </Button>
        }
      >
         <Form.Item name="supplierName" label="供应商名称" style={{ marginBottom: 0 }}>
            <Input placeholder="请输入" />
         </Form.Item>
         <Form.Item name="contactInfo" label="联系人信息" style={{ marginBottom: 0 }}>
            <Input placeholder="姓名/电话/邮箱" />
         </Form.Item>
         <Form.Item name="purchaserId" label="采购负责人" style={{ marginBottom: 0 }}>
            <Select placeholder="请选择" allowClear options={userOptions} />
         </Form.Item>
         <Form.Item name="settlementType" label="结算类型" style={{ marginBottom: 0 }}>
            <Select placeholder="请选择" allowClear>
               <Select.Option value="PREPAYMENT">预付</Select.Option>
               <Select.Option value="CASH">现付</Select.Option>
               <Select.Option value="PERIOD">账期</Select.Option>
            </Select>
         </Form.Item>
         <Form.Item name="settlementPeriod" label="结算周期" style={{ marginBottom: 0 }}>
            <Select placeholder="请选择" allowClear>
               <Select.Option value={1}>日结</Select.Option>
               <Select.Option value={7}>周结</Select.Option>
               <Select.Option value={30}>月结</Select.Option>
               <Select.Option value={90}>季结</Select.Option>
            </Select>
         </Form.Item>
      </SearchFormLayout>

      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
         <Space>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/supply-chain/supplier/add')}>
               新增供应商
            </Button>
         </Space>
         <Space>
            <Button icon={<ExportOutlined />} onClick={handleExport} loading={exporting}>
                {exporting ? `导出中 ${progress}%` : '批量导出'}
            </Button>
         </Space>
      </div>

      <Table columns={columns} dataSource={filteredData} scroll={{ x: 1300 }} loading={loading} />
    </div>
  );
};

export default SupplierList;