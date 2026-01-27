import React, { useState } from 'react';
import { Form, Input, Button, Card, Space, Select, Table, DatePicker, Row, Col, message, Breadcrumb, Modal, Radio, Switch, Tag, InputNumber, Cascader, Upload } from 'antd';
import { PlusOutlined, DeleteOutlined, UploadOutlined } from '@ant-design/icons';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import PageDoc from '../../components/PageDoc';
import SupplierPrepaymentLog from './SupplierPrepaymentLog';

const addressOptions = [
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
  const location = useLocation();
  const isView = location.pathname.includes('/view/');
  const [form] = Form.useForm();
  
  const [settlementType, setSettlementType] = useState('Cash');
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [accountForm] = Form.useForm();
  
  // Brand Association State
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
  const [selectedBrandIds, setSelectedBrandIds] = useState<string[]>([]);
  
  const mockEnabledBrands = [
    { id: 'BR001', name: '晨光 (M&G)' },
    { id: 'BR002', name: '得力 (Deli)' },
    { id: 'BR003', name: '齐心 (Comix)' },
    { id: 'BR004', name: '广博 (GuangBo)' },
  ];

  const [associatedBrands, setAssociatedBrands] = useState([
     { key: 1, id: 'BR001', name: '晨光 (M&G)' }
  ]);

  const [accounts, setAccounts] = useState([
     { key: 1, type: 'Company', name: '上海晨光文具销售有限公司', bank: '中国工商银行', account: '622202...', isDefault: true, status: true }
  ]);

  const onFinish = (values: any) => {
    console.log('Success:', { ...values, accounts, associatedBrands });
    message.success('供应商信息保存成功');
    navigate('/supply-chain/supplier');
  };

  const handleAddBrand = () => {
     setIsBrandModalOpen(true);
     setSelectedBrandIds([]);
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

     const newBrands: any[] = [];
     let duplicateCount = 0;

     selectedBrandIds.forEach(id => {
        if (associatedBrands.some(b => b.id === id)) {
           duplicateCount++;
        } else {
           const brand = mockEnabledBrands.find(b => b.id === id);
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
        const newKey = accounts.length + 1;
        // If this is the first account, make it default automatically
        const isFirst = accounts.length === 0;
        
        setAccounts([...accounts, { 
           key: newKey, 
           type: values.type, 
           name: values.name, 
           bank: values.bank, 
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
     - **现付 (Cash)**：即时结清货款。
       - *业务逻辑*：选择此类型时，**必须**配置“结算周期”。
       - *适用场景*：大部分标准供应商，需按账期（如月结）对账打款。
     - **预付 (Prepayment)**：需预先充值到平台资金池。
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
          { name: 'settlementType', type: 'Enum', length: '20', required: true, defaultValue: 'Cash', desc: '结算类型 (Cash/Prepayment)。决定后续字段的显隐。' },
          { name: 'settlementCycle', type: 'Enum', length: '10', required: true, defaultValue: 'Monthly', desc: '结算周期 (Daily/Weekly/Monthly)。仅 Cash 类型必填。' },
          { name: 'prepaymentWarning', type: 'Decimal', length: '10,2', required: true, defaultValue: '-', desc: '预付款余额预警值。仅 Prepayment 类型必填。' },
        ]}
      />
      <Breadcrumb style={{ marginBottom: 16 }} items={[
         { title: '供应链管理' },
         { title: <a onClick={() => navigate('/supply-chain/supplier')}>供应商管理</a> },
         { title: id ? (isView ? '查看供应商' : '编辑供应商') : '新增供应商' }
      ]} />
      
      <Form form={form} layout="vertical" onFinish={onFinish} disabled={isView}>
        <Card title="基础信息" bordered={false} style={{ marginBottom: 24 }}>
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
                    <Input placeholder="请输入采购负责人姓名" />
                 </Form.Item>
              </Col>
              <Col span={24}>
                 <Form.Item name="coopTime" label="合作期限" rules={[{ required: true }]}>
                    <RangePicker style={{ width: '100%' }} />
                 </Form.Item>
              </Col>
           </Row>
        </Card>

        <Card title="关联品牌" bordered={false} style={{ marginBottom: 24 }}>
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

        <Card title="结算信息" bordered={false} style={{ marginBottom: 24 }}>
           <Form.Item name="settlementType" label="结算类型" initialValue="Cash" rules={[{ required: true }]}>
              <Radio.Group onChange={(e) => setSettlementType(e.target.value)}>
                 <Radio value="Cash">现付</Radio>
                 <Radio value="Prepayment">预付</Radio>
              </Radio.Group>
           </Form.Item>

           {settlementType === 'Cash' ? (
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
           
           {settlementType === 'Prepayment' && isView && id && (
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
                 { title: '账户类型', dataIndex: 'type', render: t => t === 'Company' ? '公司' : '个人' },
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
                          onClick={() => setAccounts(accounts.filter(a => a.key !== record.key))} 
                       />
                    )
                 }
              ]}
           />
        </Card>

        <Card title="默认收货地址信息" bordered={false} style={{ marginBottom: 24 }}>
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
                    <Cascader options={addressOptions} placeholder="请选择" />
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
         <Form form={accountForm} layout="vertical">
            <Form.Item name="type" label="账户类型" rules={[{ required: true }]}>
               <Select>
                  <Select.Option value="Company">公司</Select.Option>
                  <Select.Option value="Personal">个人</Select.Option>
               </Select>
            </Form.Item>
            <Form.Item name="name" label="账户名称" rules={[{ required: true }]}>
               <Input />
            </Form.Item>
            <Form.Item name="bank" label="开户行" rules={[{ required: true }]}>
               <Select showSearch>
                  <Select.Option value="ICBC">中国工商银行</Select.Option>
                  <Select.Option value="CMB">招商银行</Select.Option>
               </Select>
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
              optionFilterProp="children"
              onChange={(values) => setSelectedBrandIds(values)}
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={mockEnabledBrands.map(b => ({ value: b.id, label: b.name }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SupplierDetail;