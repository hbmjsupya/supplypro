import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Card, Space, Select, Table, Row, Col, message, Modal, Radio, Switch, Tag, InputNumber } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import PageDoc from '../../components/PageDoc';
import request from '../../utils/request';
import SupplierFileManager from '../Supplier/SupplierFileManager';
import BankSelect from '../../components/Bank/BankSelect';

const LogisticsProviderDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isCreate = !id || id === 'new';
  const [form] = Form.useForm();
  
  // Account State
  const [accounts, setAccounts] = useState<any[]>([]);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [accountForm] = Form.useForm();
  const [deletedAccountIds, setDeletedAccountIds] = useState<number[]>([]);
  const [bankList, setBankList] = useState<any[]>([]);
  const [userList, setUserList] = useState<any[]>([]);

  // File Upload State for New Provider
  const [qualFiles, setQualFiles] = useState<any[]>([]);
  const [contractFiles, setContractFiles] = useState<any[]>([]);

  useEffect(() => {
    handleSearchBank('');
  }, []);

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

  const handleSearchBank = async (value: string) => {
    try {
      const res: any = await request.get('/banks', { params: { name: value } });
      setBankList(res.content || []);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (!isCreate && id) {
      loadData(id);
    }
  }, [id, isCreate]);

  const loadData = async (providerId: string) => {
    try {
      const res: any = await request.get(`/logistics/${providerId}`);
      const data = res; // Assuming request interceptor returns data

      // Map settlement period to cycle
      if (data.settlementPeriod === 1) data.settlementCycle = 'Daily';
      else if (data.settlementPeriod === 7) data.settlementCycle = 'Weekly';
      else if (data.settlementPeriod === 30) data.settlementCycle = 'Monthly';
      else if (data.settlementPeriod === 90) {
         data.settlementCycle = 'Monthly'; 
         data.settlementPeriod = 30; // Auto-correct data
      }
      else if (data.settlementPeriod === 365) {
         data.settlementCycle = 'Monthly';
         data.settlementPeriod = 30; // Auto-correct data
      }

      // Map purchaser
      data.purchaser = data.purchaserId;
      if (data.purchaserId && data.purchaserName) {
         setUserList([{ id: data.purchaserId, username: data.purchaserName }]);
      }

      form.setFieldsValue(data);

      const accountsRes: any = await request.get(`/logistics/${providerId}/accounts`);
      if (Array.isArray(accountsRes)) {
         setAccounts(accountsRes.map((a: any, index: number) => ({ ...a, key: a.id || index })));
      }
    } catch (error) {
      console.error(error);
      message.error('加载数据失败');
      navigate('/supply-chain/logistics-provider');
    }
  };

  const onFinish = async (values: any) => {
    // Validate accounts
    if (accounts.length === 0) {
        message.warning('请至少添加一个结算账户');
        return;
    }
    const defaultAccount = accounts.find(a => a.isDefault);
    if (!defaultAccount) {
        message.warning('请设置一个默认结算账户');
        return;
    }

    try {
      const payload = {
        name: values.name,
        contactPerson: values.contactPerson,
        contactPhone: values.contactPhone,
        status: 'ACTIVE',
        settlementType: values.settlementType,
        settlementPeriod: values.settlementType === 'CASH' ? (
             values.settlementCycle === 'Daily' ? 1 :
             values.settlementCycle === 'Weekly' ? 7 :
             values.settlementCycle === 'Monthly' ? 30 : 30 // Default to Monthly if unknown
        ) : undefined,
        prepaymentWarning: values.settlementType === 'PREPAYMENT' ? values.prepaymentWarning : undefined,
        purchaserId: values.purchaser,
        newFiles: isCreate ? [...qualFiles, ...contractFiles].map(f => {
            if (f.response && f.response.data) {
                // Temp file uploaded
                return {
                    ...f.response.data,
                    category: f.category || (qualFiles.includes(f) ? 'QUALIFICATION' : 'CONTRACT'),
                    description: f.name
                };
            }
            return null;
        }).filter(Boolean) : undefined
      };

      let providerId = id;
      if (!isCreate && id) {
         await request.put(`/logistics/${id}`, payload);
         message.success('更新成功');
      } else {
         const res: any = await request.post('/logistics', payload);
         if (res && res.id) {
             providerId = res.id;
         } else {
             throw new Error('创建失败: 未返回ID');
         }
      }

      if (providerId) {
          // Handle Accounts
          const accountPromises = accounts.map(acc => {
             const accountPayload = {
                 type: acc.type,
                 name: acc.name,
                 bank: acc.bank,
                 account: acc.account,
                 isDefault: acc.isDefault,
                 status: acc.status
             };
             
             if (acc.id) {
                 return request.post(`/logistics/${providerId}/accounts`, { ...accountPayload, id: acc.id });
             } else {
                 return request.post(`/logistics/${providerId}/accounts`, accountPayload);
             }
          });
          
          const deletePromises = deletedAccountIds.map(accId => 
             request.delete(`/logistics/${providerId}/accounts/${accId}`)
          );
          
          await Promise.all([...deletePromises, ...accountPromises]);
      }

      message.success('保存成功');
      navigate('/supply-chain/logistics-provider');
    } catch (error: any) {
      console.error(error);
      message.error('保存失败');
    }
  };

  const handleAddAccount = () => {
    accountForm.validateFields().then(values => {
       const newKey = Date.now();
       const isFirst = accounts.length === 0;
       
       setAccounts([...accounts, { 
          key: newKey, 
          type: values.type, 
          name: values.name, 
          bank: values.bankName || values.bank, 
          bankId: values.bankId,
          account: values.account,
          isDefault: isFirst,
          status: true
       }]);
       setIsAccountModalOpen(false);
       accountForm.resetFields();
    });
  };

  const handleSetDefault = (key: number) => {
    const newAccounts = accounts.map(acc => ({
      ...acc,
      isDefault: acc.key === key
    }));
    setAccounts(newAccounts);
    message.success('默认账户已更新');
  };

  const handleToggleStatus = (key: number, checked: boolean) => {
     const newAccounts = accounts.map(acc => {
        if (acc.key === key) {
           return { ...acc, status: checked };
        }
        return acc;
     });
     setAccounts(newAccounts);
     message.success(`账户已${checked ? '启用' : '禁用'}`);
  };

  const handleDeleteAccount = (key: number) => {
     const accountToDelete = accounts.find(acc => acc.key === key);
     if (accountToDelete && accountToDelete.id) {
         setDeletedAccountIds([...deletedAccountIds, accountToDelete.id]);
     }
     
     const newAccounts = accounts.filter(acc => acc.key !== key);
     if (accountToDelete?.isDefault && newAccounts.length > 0) {
         newAccounts[0] = { ...newAccounts[0], isDefault: true };
     }
     setAccounts(newAccounts);
  };

  return (
    <div>
      <PageDoc 
        pageTitle={`供应链管理 > 物流供应商管理 > ${isCreate ? '新增' : '编辑'}物流供应商`}
        description="填写物流供应商基础信息及结算账户信息。"
      />
      
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Card title="基础信息" variant="borderless" style={{ marginBottom: 24 }}>
          <Row gutter={24}>
            <Col span={8}>
              <Form.Item 
                name="name" 
                label="物流供应商名称" 
                rules={[{ required: true, message: '请输入供应商名称' }]}
              >
                <Input placeholder="请输入供应商名称" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item 
                name="contactPerson" 
                label="联系人" 
                rules={[{ required: true, message: '请输入联系人' }]}
              >
                <Input placeholder="请输入联系人" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item 
                name="contactPhone" 
                label="联系电话" 
                rules={[{ required: true, message: '请输入联系电话' }]}
              >
                <Input placeholder="请输入联系电话" />
              </Form.Item>
            </Col>
          </Row>
          
          <Row gutter={24}>
            <Col span={8}>
               <Form.Item 
                 name="purchaser" 
                 label="采购负责人" 
                 rules={[{ required: true, message: '请选择采购负责人' }]}
               >
                 <Select
                   showSearch
                   placeholder="请输入或选择采购负责人"
                   defaultActiveFirstOption={false}
                   filterOption={false}
                   onSearch={handleSearchUser}
                   notFoundContent={null}
                   options={(userList || []).map(d => ({
                     value: d.id,
                     label: d.username,
                   }))}
                 />
               </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="settlementType" label="结算类型" initialValue="CASH" rules={[{ required: true }]}>
                <Select>
                  <Select.Option value="CASH">现付</Select.Option>
                  <Select.Option value="PREPAYMENT">预付</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item 
                noStyle 
                shouldUpdate={(prev, curr) => prev.settlementType !== curr.settlementType}
              >
                {({ getFieldValue }) => {
                  const type = getFieldValue('settlementType');
                  if (type === 'CASH') {
                     return (
                       <Row gutter={24}>
                          <Col span={8}>
                             <Form.Item name="settlementCycle" label="结算周期" rules={[{ required: true }]}>
                               <Select onChange={(value) => {
                                 let period = 0;
                                 if (value === 'Daily') period = 1;
                                 else if (value === 'Weekly') period = 7;
                                 else if (value === 'Monthly') period = 30;
                                 form.setFieldsValue({ settlementPeriod: period });
                               }}>
                                 <Select.Option value="Daily">日结</Select.Option>
                                 <Select.Option value="Weekly">周结</Select.Option>
                                 <Select.Option value="Monthly">月结</Select.Option>
                               </Select>
                             </Form.Item>
                          </Col>
                          <Col span={0}>
                             <Form.Item name="settlementPeriod" label="周期天数" hidden>
                               <InputNumber />
                             </Form.Item>
                          </Col>
                       </Row>
                     );
                  } else if (type === 'PREPAYMENT') {
                      return (
                        <Form.Item name="prepaymentWarning" label="预付款余额预警值" rules={[{ required: true, message: '请输入预警值' }]}>
                          <InputNumber style={{ width: '100%' }} min={0} precision={2} />
                        </Form.Item>
                      );
                  }
                  return null;
                }}
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <Card title="资质与合同" variant="borderless" style={{ marginBottom: 24 }}>
           <Row gutter={24}>
              <Col span={12}>
                 <Form.Item label="公司资质图片">
                    <SupplierFileManager 
                        supplierId={!isCreate && id ? Number(id) : undefined} 
                        category="QUALIFICATION" 
                        isView={false} 
                        onFilesChange={setQualFiles}
                        apiPrefix="/logistics-files"
                    />
                 </Form.Item>
              </Col>
              <Col span={12}>
                 <Form.Item label="合同文件">
                    <SupplierFileManager 
                        supplierId={!isCreate && id ? Number(id) : undefined} 
                        category="CONTRACT" 
                        isView={false} 
                        onFilesChange={setContractFiles}
                        apiPrefix="/logistics-files"
                    />
                 </Form.Item>
              </Col>
           </Row>
        </Card>

        <Card title="结算账户" variant="borderless" style={{ marginBottom: 24 }}>
           <Button type="dashed" onClick={() => {
              accountForm.resetFields();
              const providerName = form.getFieldValue('name');
              accountForm.setFieldsValue({ 
                  type: 'COMPANY',
                  name: providerName 
              });
              setIsAccountModalOpen(true);
           }} style={{ marginBottom: 16 }}>
             新增账户
           </Button>
           <Table
             dataSource={accounts}
             pagination={false}
             columns={[
               { title: '账户类型', dataIndex: 'type', render: (val) => (val === 'COMPANY' || val === 'Company') ? '公司' : '个人' },
               { title: '账户名称', dataIndex: 'name' },
               { title: '开户行', dataIndex: 'bank' },
               { title: '收款账户', dataIndex: 'account' },
               { 
                  title: '默认账户', 
                  dataIndex: 'isDefault', 
                  render: (isDefault, record) => (
                    <Radio 
                       checked={isDefault} 
                       onClick={() => handleSetDefault(record.key!)}
                       disabled={!record.status}
                    >
                       设为默认
                    </Radio>
                  )
               },
               { 
                  title: '状态', 
                  dataIndex: 'status', 
                  render: (val, record) => (
                    <Switch 
                       size="small" 
                       checked={val} 
                       onChange={(c) => handleToggleStatus(record.key!, c)} 
                       checkedChildren="启用"
                       unCheckedChildren="禁用"
                       disabled={record.isDefault && val}
                    />
                  ) 
               },
               { 
                  title: '操作', 
                  render: (_, record) => (
                    <Button 
                       type="text" 
                       danger 
                       icon={<DeleteOutlined />} 
                       onClick={() => handleDeleteAccount(record.key!)} 
                       disabled={record.isDefault}
                    />
                  ) 
               }
             ]}
           />
        </Card>

        <div style={{ textAlign: 'center' }}>
           <Space size="large">
              <Button onClick={() => navigate('/supply-chain/logistics-provider')}>取消</Button>
              <Button type="primary" htmlType="submit">保存</Button>
           </Space>
        </div>
      </Form>

      <Modal
        title="新增结算账户"
        open={isAccountModalOpen}
        onOk={handleAddAccount}
        onCancel={() => setIsAccountModalOpen(false)}
      >
        <Form 
          form={accountForm} 
          layout="vertical"
          onValuesChange={(changedValues) => {
            if (changedValues.type === 'COMPANY') {
               const providerName = form.getFieldValue('name');
               if (providerName) {
                  accountForm.setFieldsValue({ name: providerName });
               }
            } else if (changedValues.type === 'PERSONAL') {
               accountForm.setFieldsValue({ name: '' });
            }
          }}
        >
           <Form.Item name="type" label="账户类型" initialValue="COMPANY" rules={[{ required: true }]}>
              <Radio.Group>
                 <Radio value="COMPANY">公司</Radio>
                 <Radio value="PERSONAL">个人</Radio>
              </Radio.Group>
           </Form.Item>
           <Form.Item name="name" label="开户名称" rules={[{ required: true, message: '请输入开户名称' }]}>
              <Input placeholder="请输入开户名称" />
           </Form.Item>
           <Form.Item name="bankId" label="开户银行" rules={[{ required: true, message: '请选择开户银行' }]}>
              <BankSelect onChange={(val, bank) => {
                  accountForm.setFieldValue('bankName', bank.name);
              }} />
           </Form.Item>
           <Form.Item name="bankName" hidden>
              <Input />
           </Form.Item>
           <Form.Item name="account" label="银行账号" rules={[{ required: true, message: '请输入银行账号' }]}>
              <Input placeholder="请输入银行账号" />
           </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default LogisticsProviderDetail;
