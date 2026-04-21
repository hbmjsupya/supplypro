import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Card, Space, Select, Table, DatePicker, Row, Col, message, Breadcrumb, Modal, Radio, Switch, Tag, InputNumber, Cascader, Spin } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import PageDoc from '../../components/PageDoc';
import SupplierPrepaymentLog from './SupplierPrepaymentLog';
import SupplierFileManager from './SupplierFileManager';
import BankSelect from '../../components/Bank/BankSelect';
import request from '../../utils/request';
import dayjs from 'dayjs';

// Default address options as fallback
const defaultAddressOptions = [
  {
    value: 'shanghai',
    label: '上海市',
    children: [
      {
        value: 'shanghai',
        label: '上海市',
        children: [
            { value: 'pudong', label: '浦东新区' },
            { value: 'minhang', label: '闵行区' },
            { value: 'xuhui', label: '徐汇区' },
        ],
      },
    ],
  },
  {
    value: 'zhejiang',
    label: '浙江省',
    children: [
      {
        value: 'hangzhou',
        label: '杭州市',
        children: [
          { value: 'xihu', label: '西湖区' },
          { value: 'binjiang', label: '滨江区' },
        ],
      },
    ],
  },
];

const { RangePicker } = DatePicker;

const SupplierDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  
  // Debug logging for 404 issue
  useEffect(() => {
    console.log('SupplierDetail rendered. ID from params:', id);
  }, [id]);

  const location = useLocation();
  const isView = location.pathname.includes('/view/');
  const [form] = Form.useForm();
  
  const [settlementType, setSettlementType] = useState('CASH');
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [accountForm] = Form.useForm();
  
  // Brand Association State
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
  const [selectedBrandIds, setSelectedBrandIds] = useState<string[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [brandList, setBrandList] = useState<any[]>([]);
  const [brandLoading, setBrandLoading] = useState(false);
  
  // File Upload State for New Supplier
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [qualFiles, setQualFiles] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [contractFiles, setContractFiles] = useState<any[]>([]);

  // Address State
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [addressOptions, setAddressOptions] = useState<any[]>(defaultAddressOptions);
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [associatedBrands, setAssociatedBrands] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [accounts, setAccounts] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [userList, setUserList] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
  const [bankList, setBankList] = useState<any[]>([]);

  // Fetch address data
  useEffect(() => {
    const fetchAddress = async () => {
      try {
        // Using local data for China address data
        const res = await fetch('/data/china_regions.json');
        if (res.ok) {
           const data = await res.json();
           // Transform data to Antd Cascader format if needed (the source structure usually matches or needs slight tweak)
           // Assuming data is [{code, name, children: [...]}]
           // eslint-disable-next-line @typescript-eslint/no-explicit-any
           const transform = (node: any) => ({
             value: node.code || node.name,
             label: node.name,
             children: node.children ? node.children.map(transform) : undefined
           });
           const transformedData = data.map(transform);
           // Add Nationwide option
           const nationwide = { value: 'nationwide', label: '全国', isLeaf: true };
           setAddressOptions([nationwide, ...transformedData]);
        } else {
           // Silently fail to fallback
           console.warn('Failed to fetch address data, using fallback');
        }
      } catch {
         console.warn('Network error fetching address data, using fallback');
      }
    };
    fetchAddress();
  }, []);

  // Load existing data
  useEffect(() => {
    if (id && !id.startsWith('new')) {
        const fetchData = async () => {
             // Reset states before fetching to avoid accumulation
             setAssociatedBrands([]);
             setAccounts([]);

             try {
                 // 1. Supplier Basic Info
                 // eslint-disable-next-line @typescript-eslint/no-explicit-any
                 const res: any = await request.get(`/suppliers/${id}`);
                 const data = res; // Assuming response interceptor returns data directly
                 
                 // Transform dates
                 if (data.coopStartTime && data.coopEndTime) {
                     data.coopTime = [dayjs(data.coopStartTime), dayjs(data.coopEndTime)];
                 }
                 
                 // Map address region
                 if (data.provinceCode) {
                     data.addressRegion = [data.provinceCode, data.cityCode, data.districtCode].filter(Boolean);
                 }
                 
                 // Map address detail
                 data.addressDetail = data.address;

                 // Map other fields to form names
                 data.supplierName = data.name;
                 data.contact = data.contactPerson;
                 data.phone = data.contactPhone;
                 data.purchaser = data.purchaserId;

                 // Map settlement cycle
                 if (data.settlementPeriod === 1) data.settlementCycle = 'Daily';
                 else if (data.settlementPeriod === 7) data.settlementCycle = 'Weekly';
                 else if (data.settlementPeriod === 30) data.settlementCycle = 'Monthly';
                 
                 // Map prepayment warning
                 // data.prepaymentWarning is assumed to be in data if backend returns it

                 
                 // Pre-populate user list for purchaser display
                 if (data.purchaserId && data.purchaserName) {
                     setUserList([{ id: data.purchaserId, username: data.purchaserName }]);
                 }

                 form.setFieldsValue(data);
                 setSettlementType(data.settlementType || 'CASH');

                 // 2. Brands
                 // eslint-disable-next-line @typescript-eslint/no-explicit-any
                 const brandsRes: any = await request.get(`/brands/supplier/${id}`);
                 if (Array.isArray(brandsRes)) {
                     // Deduplicate brands based on ID just in case
                     // eslint-disable-next-line @typescript-eslint/no-explicit-any
                     const uniqueBrands = Array.from(new Map(brandsRes.map((b: any) => [b.id, b])).values());
                     // eslint-disable-next-line @typescript-eslint/no-explicit-any
                     setAssociatedBrands(uniqueBrands.map((b: any) => ({ ...b, key: b.id })));
                 }
                 
                 // 3. Accounts
                 // eslint-disable-next-line @typescript-eslint/no-explicit-any
                 const accountsRes: any = await request.get(`/suppliers/${id}/accounts`);
                 if (Array.isArray(accountsRes)) {
                     // Deduplicate accounts based on ID just in case
                     // eslint-disable-next-line @typescript-eslint/no-explicit-any
                     const uniqueAccounts = Array.from(new Map(accountsRes.map((a: any) => [a.id, a])).values());
                     // eslint-disable-next-line @typescript-eslint/no-explicit-any
                     setAccounts(uniqueAccounts.map((a: any, index: number) => ({ ...a, key: index, status: a.status === 'ACTIVE' || a.status === true }))); 
                 }

             } catch (error) {
                 console.error(error);
                 message.error('加载供应商信息失败');
             }
        };
        fetchData();
    }
  }, [id, form]);

  const handleSearchUser = async (value: string) => {
    if (value) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const res: any = await request.get('/users/list', { params: { username: value } });
        setUserList(res.content || []);
      } catch (error) {
        console.error(error);
      }
    }
  };

  const handleSearchBank = async (value: string) => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const res: any = await request.get('/banks', { params: { name: value } });
        setBankList(res.content || []);
      } catch (error) {
        console.error(error);
      }
  };

  // Keep track of full brand objects for selected IDs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedBrandObjects, setSelectedBrandObjects] = useState<any[]>([]);

  const handleSearchBrand = async (value: string) => {
    setBrandLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res: any = await request.get('/brands', { 
        params: { 
            name: value,
            status: 'ENABLED',
            size: 50 // Fetch more to be safe
        } 
      });
      setBrandList(res.records || []);
    } catch (error) {
      console.error(error);
    } finally {
      setBrandLoading(false);
    }
  };

  useEffect(() => {
     handleSearchBank('');
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onFinish = async (values: any) => {
    try {
        const region = values.addressRegion || [];
        const payload = {
            supplierNo: id ? undefined : `SUP${Date.now()}`,
            name: values.supplierName,
            contactPerson: values.contact,
            contactPhone: values.phone,
            purchaserId: values.purchaser,
            address: values.addressDetail,
            receiverName: values.receiverName,
            receiverPhone: values.receiverPhone,
            provinceCode: region[0],
            cityCode: region[1],
            districtCode: region[2],
            settlementType: values.settlementType,
            settlementPeriod: values.settlementType === 'CASH' ? (
                values.settlementCycle === 'Daily' ? 1 :
                values.settlementCycle === 'Weekly' ? 7 : 30
            ) : undefined,
            prepaymentWarning: values.settlementType === 'PREPAYMENT' ? values.prepaymentWarning : undefined,
            coopStartTime: values.coopTime ? values.coopTime[0].format('YYYY-MM-DDTHH:mm:ss') : null,
            coopEndTime: values.coopTime ? values.coopTime[1].format('YYYY-MM-DDTHH:mm:ss') : null,
            brandIds: associatedBrands.map(b => b.id),
            status: 'ACTIVE',
            newFiles: (!id || id.startsWith('new')) ? [...qualFiles, ...contractFiles] : undefined
        };

        console.log('Submitting Supplier Payload:', payload);

        let supplierId = id;
        if (id && !String(id).startsWith('new')) { // Handle potential "new" id if logic differs
             await request.put(`/suppliers/${id}`, payload);
             message.success('更新成功');
        } else {
             // eslint-disable-next-line @typescript-eslint/no-explicit-any
             const res: any = await request.post('/suppliers', payload);
             if (res && res.id) {
                 supplierId = res.id;
             } else {
                 throw new Error('创建失败: 未返回供应商ID');
             }
        }

        if (supplierId) {
             // Save Brands - Removed manual POST calls as backend syncs brands via DTO.brandIds

             // Save Accounts
             // 1. Identify deleted accounts (present in original but not in current)
             // We need to fetch original accounts first or store them in state. 
             // Assuming accounts loaded via 'fetchData' are the "original" state before edits.
             // But 'accounts' state is mutable.
             // Strategy: 
             // - Accounts with 'id' are existing (update).
             // - Accounts without 'id' are new (create).
             // - Missing accounts? We don't track "deleted" explicitly here easily without original list.
             //   However, if we assume the UI list is the *final* list, we should delete any account not in this list.
             //   BUT we don't have the full list of IDs on server easily without fetching.
             //   SIMPLIFICATION: Just handle Create/Update for now. Deletion is tricky without "deletedIds" tracking.
             //   If the user deletes an account in UI, we should track it.
             
             // Since we don't have a 'deletedAccountIds' state, let's just fix the duplication on Create/Update.
             // If we really want to fix duplication, we MUST NOT create new accounts for existing ones.
             
             const accountPromises = accounts.map(acc => {
                 const accountPayload = {
                     type: acc.type === 'Company' ? 'COMPANY' : 'PERSONAL',
                     name: acc.name,
                     bank: acc.bank,
                     bankId: acc.bankId,
                     account: acc.account,
                     isDefault: acc.isDefault,
                     status: acc.status
                 };
                 
                 if (acc.id) {
                     // Update existing
                     // Assuming we have a PUT endpoint or we reuse POST with ID logic if backend supports it.
                     // But backend addAccount (POST /{id}/accounts) does 'save(account)', which updates if ID is present.
                     // We just need to ensure ID is sent.
                     return request.post(`/suppliers/${supplierId}/accounts`, { ...accountPayload, id: acc.id });
                 } else {
                     // Create new
                     return request.post(`/suppliers/${supplierId}/accounts`, accountPayload);
                 }
             });
             
             // Handle deleted accounts:
             const deletePromises = deletedAccountIds.map(accId => 
                 request.delete(`/suppliers/${supplierId}/accounts/${accId}`)
             );
             await Promise.all(deletePromises);
             
             await Promise.all(accountPromises);
        }

        message.success('供应商信息保存成功');
        navigate('/supply-chain/supplier');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        console.error('Save failed:', error);
        // Extract detailed error message if available
        const errorMsg = error.response?.data?.message || error.message || '保存失败';
        message.error(`保存失败: ${errorMsg}`);
    }
  };

  const handleAddBrand = () => {
     setIsBrandModalOpen(true);
     setSelectedBrandIds([]);
     setSelectedBrandObjects([]);
     handleSearchBrand('');
  };

  const handleDeleteBrand = (key: number) => {
     setAssociatedBrands(associatedBrands.filter(b => b.key !== key));
  };

  const handleConfirmAddBrand = () => {
     if (selectedBrandIds.length === 0) {
        message.warning('请至少选择一个品牌');
        return;
     }

     // Limit the total number of associated brands to 50
     if (associatedBrands.length + selectedBrandIds.length > 50) {
         message.warning('关联品牌数量不能超过 50 个');
         return;
     }

     // eslint-disable-next-line @typescript-eslint/no-explicit-any
     const newBrands: any[] = [];
     let duplicateCount = 0;

     selectedBrandIds.forEach(id => {
        if (associatedBrands.some(b => b.id === id)) {
           duplicateCount++;
        } else {
           // Find from selectedBrandObjects (which we maintain via onChange)
           // Fallback to brandList if needed (e.g. if just selected from current view)
           const brand = selectedBrandObjects.find(b => b.id === id) || brandList.find(b => b.id === id);
           
           if (brand) {
              newBrands.push({ ...brand, key: Date.now() + Math.random() });
           }
        }
     });

     if (newBrands.length > 0) {
        setAssociatedBrands([...associatedBrands, ...newBrands]);
        message.success(`成功添加 ${newBrands.length} 个品牌`);
     }

     if (duplicateCount > 0) {
        message.warning(`${duplicateCount} 个品牌已存在，已自动过滤`);
     }
     
     setIsBrandModalOpen(false);
  };

  const handleAddAccount = () => {
     accountForm.validateFields().then(values => {
        const newKey = Date.now();
        // If this is the first account, make it default automatically
        const isFirst = accounts.length === 0;
        
        setAccounts([...accounts, { 
           key: newKey, 
           type: values.type, 
           name: values.name, 
           bank: values.bankName || values.bank, // Fallback if bankName not set (e.g. manual entry if allowed)
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

  // Track deleted accounts for deletion
  const [deletedAccountIds, setDeletedAccountIds] = useState<number[]>([]);

  const handleDeleteAccount = (key: number) => {
     // Find account to delete
     const accountToDelete = accounts.find(acc => acc.key === key);
     if (accountToDelete && accountToDelete.id) {
         setDeletedAccountIds([...deletedAccountIds, accountToDelete.id]);
     }
     
     // Remove from UI
     const newAccounts = accounts.filter(acc => acc.key !== key);
     
     // If we deleted the default account, set the first remaining one as default
     if (accountToDelete?.isDefault && newAccounts.length > 0) {
         newAccounts[0] = { ...newAccounts[0], isDefault: true };
     }
     
     setAccounts(newAccounts);
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

  return (
    <div>
      <PageDoc 
        pageTitle="供应链管理 > 供应商管理 > 供应商详情"
        description={`新增/编辑供应商详情页。

1. **基础信息（必填）**：
   - 供应商基本信息：供应商名称、联系人、手机号。
   - 采购员信息：姓名、手机号。
   - 合作期限：起止时间。

2. **数据来源说明**：
   - **品牌信息**：调用[品牌管理]模块数据（更新频率：实时；权限：读取）。
   - **采购负责人**：调用[用户中心/权限系统]数据（更新频率：缓存/实时；权限：读取）。

3. **关联信息（非必填）**：
   - 关联品牌列表：支持新增、删除品牌（品牌名称、品牌ID）。
   - 资质文件：支持上传合作协议、营业执照或身份证。

4. **结算信息**：
   - **结算类型 (settlementType)**：
     - **现付 (CASH)**：即时结清货款。
       - *业务逻辑*：选择此类型时，**必须**配置“结算周期”。
       - *适用场景*：大部分标准供应商，需按账期（如月结）对账打款。
     - **预付 (PREPAYMENT)**：需预先充值到平台资金池。
       - *业务逻辑*：选择此类型时，**必须**配置“预付款余额预警值”，且**无需**配置结算周期。
       - *适用场景*：强势供应商或需即时到账的充值类业务。
   - **结算周期 (settlementCycle)**：单选（日结/周结/月结），仅在结算类型为“现付”时可见且必填。
   - **预付款余额预警值 (prepaymentWarning)**：数值类型，仅在结算类型为“预付”时可见且必填。低于此值时系统将发送预警通知。
   - **结算账户**：支持新增多条账户信息（个人/公司）。
     - 账户类型为公司时带入供应商名称。
     - 必须设置一个默认账户，自动带入结算申请。
     - 支持启用/禁用结算账户。

5. **操作按钮**：
   - **提交**：保存所有信息并返回列表。
   - **取消**：放弃修改并返回列表。

6. **异常处理**：
   - **必填校验**：提交时校验所有必填项，失败则提示并定位到错误字段。
   - **账户规则**：至少需要一个结算账户。

7. **数据字典 (结算类型)**：
   - **枚举名称**：\`SettlementTypeEnum\`
   - **枚举值定义**：
     - \`Cash\` (现付)：货到付款或按周期定期结算。
     - \`Prepayment\` (预付)：先充值后消费，从预付款余额中扣除。
   - **历史兼容性**：
     - v1.0 版本仅支持 \`Cash\` 模式（默认为空或隐含为 Cash）。
     - v1.2 版本引入 \`Prepayment\`，旧数据需通过脚本批量刷为 \`Cash\`。
   - **接口规范**：
     - 后端接收参数类型：String
     - 异常处理：传入非法枚举值时，接口应返回 \`400 Bad Request\`，错误码 \`INVALID_SETTLEMENT_TYPE\`。`}
        fields={[
          { name: 'supplierName', type: 'String', length: '200', required: true, desc: '供应商名称' },
          { name: 'contact', type: 'String', length: '50', required: true, desc: '联系人' },
          { name: 'phone', type: 'String', length: '20', required: true, desc: '手机号' },
          { name: 'settlementType', type: 'Enum', length: '20', required: true, defaultValue: 'CASH', desc: '结算类型 (CASH/PREPAYMENT)。决定后续字段的显隐。' },
          { name: 'settlementCycle', type: 'Enum', length: '10', required: true, defaultValue: 'Monthly', desc: '结算周期 (Daily/Weekly/Monthly)。仅 CASH 类型必填。' },
          { name: 'prepaymentWarning', type: 'Decimal', length: '10,2', required: true, defaultValue: '-', desc: '预付款余额预警值。仅 PREPAYMENT 类型必填。' },
        ]}
      />
      <Breadcrumb style={{ marginBottom: 16 }} items={[
         { title: '供应链管理' },
         { title: <a onClick={() => navigate('/supply-chain/supplier')}>供应商管理</a> },
         { title: id ? (isView ? '查看供应商' : '编辑供应商') : '新增供应商' }
      ]} />
      
      <Form form={form} layout="vertical" onFinish={onFinish} disabled={isView}>
        <Card title="基础信息" variant="borderless" style={{ marginBottom: 24 }}>
           <Row gutter={24}>
              <Col span={12}>
                 <Form.Item name="supplierName" label="供应商名称" rules={[{ required: true }]}>
                    <Input placeholder="请输入供应商名称" />
                 </Form.Item>
              </Col>
              <Col span={12}>
                 <Form.Item name="contact" label="联系人" rules={[{ required: true }]}>
                    <Input placeholder="请输入联系人姓名" />
                 </Form.Item>
              </Col>
              <Col span={12}>
                 <Form.Item name="phone" label="联系人手机号" rules={[{ required: true }]}>
                    <Input placeholder="请输入手机号" />
                 </Form.Item>
              </Col>
              <Col span={12}>
                 <Form.Item name="purchaser" label="采购负责人" rules={[{ required: true }]}>
                    <Select
                        showSearch
                        placeholder="请输入姓名或ID搜索"
                        defaultActiveFirstOption={false}
                        suffixIcon={null}
                        filterOption={false}
                        onSearch={handleSearchUser}
                        notFoundContent={null}
                        options={(userList || []).map(d => ({
                            value: d.id,
                            label: `${d.username} - ${d.id}`,
                        }))}
                    />
                 </Form.Item>
              </Col>
              <Col span={24}>
                 <Form.Item name="coopTime" label="合作期限" rules={[{ required: true }]}>
                    <RangePicker style={{ width: '100%' }} placeholder={['开始日期', '结束日期']} format="YYYY年MM月DD日" />
                 </Form.Item>
              </Col>
           </Row>
        </Card>

        <Card title="关联信息" variant="borderless" style={{ marginBottom: 24 }}>
           <Row gutter={24}>
              <Col span={12}>
                 <Form.Item label="公司资质图片">
                    <SupplierFileManager 
                        supplierId={id && !id.startsWith('new') ? Number(id) : undefined} 
                        category="QUALIFICATION" 
                        isView={isView} 
                        onFilesChange={setQualFiles}
                    />
                 </Form.Item>
              </Col>
              <Col span={12}>
                 <Form.Item label="合同文件">
                    <SupplierFileManager 
                        supplierId={id && !id.startsWith('new') ? Number(id) : undefined} 
                        category="CONTRACT" 
                        isView={isView} 
                        onFilesChange={setContractFiles}
                    />
                 </Form.Item>
              </Col>
           </Row>
           
           <div style={{ marginBottom: 16, fontWeight: 'bold' }}>关联品牌列表</div>
           {!isView && (
              <Button type="dashed" icon={<PlusOutlined />} onClick={handleAddBrand} style={{ marginBottom: 16 }}>
                 新增关联品牌
              </Button>
           )}
           <Table
              dataSource={associatedBrands}
              pagination={false}
              columns={[
                 { title: '品牌名称', dataIndex: 'name' },
                 { title: '品牌ID', dataIndex: 'id' },
                 {
                    title: '操作',
                    render: (_, record) => !isView && (
                       <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDeleteBrand(record.key)} />
                    )
                 }
              ]}
           />
        </Card>

        <Card title="结算信息" variant="borderless" style={{ marginBottom: 24 }}>
           <Form.Item name="settlementType" label="结算类型" initialValue="CASH" rules={[{ required: true }]}>
              <Radio.Group onChange={(e) => setSettlementType(e.target.value)}>
                 <Radio value="CASH">现付</Radio>
                 <Radio value="PREPAYMENT">预付</Radio>
              </Radio.Group>
           </Form.Item>

           {settlementType === 'CASH' ? (
             <Form.Item name="settlementCycle" label="结算周期" rules={[{ required: true }]}>
                <Select placeholder="请选择结算周期">
                   <Select.Option value="Daily">日结</Select.Option>
                   <Select.Option value="Weekly">周结</Select.Option>
                   <Select.Option value="Monthly">月结</Select.Option>
                </Select>
             </Form.Item>
           ) : (
             <>
               <Form.Item name="prepaymentWarning" label="预付款余额预警值" rules={[{ required: true, message: '请输入预警值' }]}>
                   <InputNumber prefix="¥" style={{ width: '100%' }} min={0} placeholder="余额低于此值时提醒" />
               </Form.Item>
             </>
           )}
           
           {settlementType === 'PREPAYMENT' && isView && id && (
             <SupplierPrepaymentLog />
           )}
           
           {!isView && (
              <Button type="dashed" onClick={() => setIsAccountModalOpen(true)} style={{ marginBottom: 16 }}>
                 新增结算账户
              </Button>
           )}
           
           <Table 
              pagination={false}
              dataSource={accounts}
              columns={[
                 { title: '账户类型', dataIndex: 'type', render: t => (t === 'COMPANY' || t === 'Company') ? '公司' : '个人' },
                 { title: '账户名称', dataIndex: 'name' },
                 { title: '开户行', dataIndex: 'bank' },
                 { title: '收款账户', dataIndex: 'account' },
                 { 
                    title: '默认账户', 
                    dataIndex: 'isDefault', 
                    render: (isDefault, record) => (
                       isView ? (isDefault ? <Tag color="green">是</Tag> : '否') : (
                          <Radio 
                             checked={isDefault} 
                             onClick={() => handleSetDefault(record.key)}
                             disabled={!record.status} // Cannot set disabled account as default
                          >
                             设为默认
                          </Radio>
                       )
                    )
                 },
                 {
                    title: '状态',
                    dataIndex: 'status',
                    render: (status, record) => (
                       <Switch 
                          checked={status} 
                          disabled={isView || (record.isDefault && status)} // Cannot disable default account
                          onChange={(checked) => handleToggleStatus(record.key, checked)} 
                          checkedChildren="启用" 
                          unCheckedChildren="禁用" 
                       />
                    )
                 },
                 {
                    title: '操作',
                    render: (_, record) => !isView && (
                       <Button 
                          type="text" 
                          danger 
                          icon={<DeleteOutlined />} 
                          disabled={record.isDefault} // Cannot delete default account
                          onClick={() => handleDeleteAccount(record.key)} 
                       />
                    )
                 }
              ]}
           />
        </Card>

        <Card title="默认收货地址信息" variant="borderless" style={{ marginBottom: 24 }}>
           <Row gutter={24}>
              <Col span={12}>
                 <Form.Item 
                    name="receiverName" 
                    label="收货人姓名" 
                    rules={[
                       { required: true, message: '请输入收货人姓名' },
                       { max: 50, message: '字符限制50字以内' }
                    ]}
                 >
                    <Input placeholder="请输入收货人姓名" />
                 </Form.Item>
              </Col>
              <Col span={12}>
                 <Form.Item 
                    name="receiverPhone" 
                    label="收货人联系方式" 
                    rules={[
                       { required: true, message: '请输入联系方式' },
                       { pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号' }
                    ]}
                 >
                    <Input placeholder="请输入11位手机号" />
                 </Form.Item>
              </Col>
           </Row>
           <Row gutter={24}>
              <Col span={12}>
                 <Form.Item 
                    name="addressRegion" 
                    label="省/市/区县" 
                    rules={[{ required: true, message: '请选择省/市/区县' }]}
                 >
                    <Cascader options={addressOptions} placeholder="请选择" showSearch />
                 </Form.Item>
              </Col>
              <Col span={12}>
                 <Form.Item 
                    name="addressDetail" 
                    label="详细地址" 
                    rules={[
                       { required: true, message: '请输入详细地址' },
                       { max: 200, message: '字符限制200字以内' }
                    ]}
                 >
                    <Input placeholder="请输入详细地址" />
                 </Form.Item>
              </Col>
           </Row>
        </Card>


        <div style={{ textAlign: 'center', paddingBottom: 24 }}>
           <Space size="large">
              <Button onClick={() => navigate('/supply-chain/supplier')}>
                 {isView ? '返回' : '取消'}
              </Button>
              {!isView && <Button type="primary" htmlType="submit">提交</Button>}
           </Space>
        </div>
      </Form>

      {/* Add Account Modal */}
      <Modal
         title="新增结算账户"
         open={isAccountModalOpen}
         onOk={handleAddAccount}
         onCancel={() => setIsAccountModalOpen(false)}
      >
         <Form form={accountForm} layout="vertical" onValuesChange={(changedValues) => {
             if (changedValues.type === 'Company') {
                 accountForm.setFieldValue('name', form.getFieldValue('supplierName'));
             }
         }}>
            <Form.Item name="type" label="账户类型" rules={[{ required: true }]}>
               <Select>
                  <Select.Option value="Company">公司</Select.Option>
                  <Select.Option value="Personal">个人</Select.Option>
               </Select>
            </Form.Item>
            <Form.Item name="name" label="账户名称" rules={[{ required: true }]}>
               <Input />
            </Form.Item>
            <Form.Item name="bankId" label="开户行" rules={[{ required: true, message: '请选择开户行' }]}>
               <BankSelect onChange={(val, bank) => {
                   accountForm.setFieldValue('bankName', bank.name);
               }} />
            </Form.Item>
            <Form.Item name="bankName" hidden>
               <Input />
            </Form.Item>
            <Form.Item name="account" label="收款账户" rules={[{ required: true }]}>
               <Input />
            </Form.Item>
         </Form>
      </Modal>

      {/* Add Brand Modal */}
      <Modal
        title="选择关联品牌"
        open={isBrandModalOpen}
        onOk={handleConfirmAddBrand}
        onCancel={() => setIsBrandModalOpen(false)}
        width={600}
      >
        <Form layout="vertical">
          <Form.Item label="选择已启用品牌" required help="支持多选，可输入品牌名称搜索">
            <Select
              mode="multiple"
              showSearch
              placeholder="请选择品牌"
              style={{ width: '100%' }}
              filterOption={false}
              onSearch={handleSearchBrand}
              notFoundContent={brandLoading ? <Spin size="small" /> : null}
              value={selectedBrandIds}
              onChange={(values, options) => {
                  setSelectedBrandIds(values);
                  if (Array.isArray(options)) {
                      const newObjects = values.map(id => {
                          const existing = selectedBrandObjects.find(o => o.id === id);
                          if (existing) return existing;
                          const fromList = brandList.find(b => b.id === id);
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          const fromOption = (options.find((o: any) => o.value === id) as any)?.data;
                          return fromList || fromOption;
                      }).filter(Boolean);
                      setSelectedBrandObjects(newObjects);
                  }
              }}
              options={[...brandList, ...selectedBrandObjects]
                  .filter((v, i, a) => a.findIndex(t => t.id === v.id) === i)
                  .map(b => ({
                      value: b.id,
                      label: b.name,
                      data: b
                  }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SupplierDetail;