import React, { useState } from 'react';
import { Table, Button, Input, Select, Space, Tag, Modal, Form, message, Row, Col, Breadcrumb, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, EditOutlined, StopOutlined, CheckCircleOutlined, ExportOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import PageDoc from '../../components/PageDoc';
import { useExport } from '../../utils/exportUtils';

interface BundleDataType {
  key: string;
  bundleId: string;
  bundleName: string;
  saleType: string;
  defaultCost: number;
  status: 'PendingSelection' | 'Selected' | 'OnShelf' | 'OffShelf';
  subProducts: {
      name: string;
      spec: string;
      qty: number;
      unitCost: number;
      totalCost: number;
      supplier: string;
  }[];
}

const mockBundles: BundleDataType[] = [
  {
    key: '1',
    bundleId: 'BDL001',
    bundleName: '开学大礼包A',
    saleType: '打包售卖',
    defaultCost: 45.00,
    status: 'OnShelf',
    subProducts: [
        { name: '晨光A4打印纸', spec: '70g/500张/包', qty: 1, unitCost: 18.00, totalCost: 18.00, supplier: '晨光文具' },
        { name: '得力黑色中性笔', spec: '0.5mm/12支/盒', qty: 2, unitCost: 12.50, totalCost: 25.00, supplier: '得力集团' },
        { name: '橡皮擦', spec: '20块/盒', qty: 1, unitCost: 2.00, totalCost: 2.00, supplier: '晨光文具' },
    ]
  },
  {
    key: '2',
    bundleId: 'BDL002',
    bundleName: '办公耗材月度包',
    saleType: '打包售卖',
    defaultCost: 120.50,
    status: 'PendingSelection',
    subProducts: [
        { name: '惠普打印纸', spec: '80g/500张/包', qty: 5, unitCost: 24.10, totalCost: 120.50, supplier: '惠普中国' },
    ]
  },
];

const BundleList: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<BundleDataType[]>(mockBundles);

  const handleAction = (key: string, action: 'OnShelf' | 'OffShelf') => {
    const newData = data.map(item => {
      if (item.key === key) {
        return { ...item, status: action };
      }
      return item;
    });
    setData(newData);
    message.success(`组合商品已${action === 'OnShelf' ? '上架' : '下架'}`);
  };

  const { handleExport, exporting, progress } = useExport<BundleDataType>({
    filenamePrefix: '组合商品列表',
    fetchData: () => data,
    columns: [
        { title: '组合商品ID', dataIndex: 'bundleId' },
        { title: '组合商品名称', dataIndex: 'bundleName' },
        { title: '售卖方式', dataIndex: 'saleType' },
        { title: '默认成本价', dataIndex: 'defaultCost', render: (val) => val.toFixed(2) },
        { title: '状态', dataIndex: 'status', render: (val) => {
            const map: any = { 'PendingSelection': '待选品', 'Selected': '已选品', 'OnShelf': '已上架', 'OffShelf': '已下架' };
            return map[val] || val;
        } },
    ]
  });

  const columns: ColumnsType<BundleDataType> = [
    { title: '组合商品ID', dataIndex: 'bundleId', key: 'bundleId' },
    { title: '组合商品名称', dataIndex: 'bundleName', key: 'bundleName' },
    { 
       title: '包含子商品种类', 
       key: 'subProductCount', 
       render: (_, record) => (
          <Tooltip 
             title={
                <div style={{ padding: '4px' }}>
                   {record.subProducts.map((sub, idx) => (
                      <div key={idx} style={{ marginBottom: idx === record.subProducts.length - 1 ? 0 : 8, borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: 4 }}>
                         <div><strong>{sub.name}</strong></div>
                         <div style={{ fontSize: '12px', color: '#ccc' }}>{sub.spec}</div>
                         <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                            <span>x {sub.qty}</span>
                            <span>¥{sub.unitCost.toFixed(2)}</span>
                         </div>
                         <div style={{ fontSize: '12px', marginTop: 2 }}>供: {sub.supplier}</div>
                      </div>
                   ))}
                   <div style={{ marginTop: 8, paddingTop: 4, borderTop: '1px solid #fff', textAlign: 'right' }}>
                      成本合计: ¥{record.subProducts.reduce((sum, item) => sum + item.totalCost, 0).toFixed(2)}
                   </div>
                </div>
             }
             overlayInnerStyle={{ backgroundColor: 'rgba(0, 0, 0, 0.85)', maxWidth: 300 }}
             mouseEnterDelay={0.2}
          >
             <span style={{ cursor: 'pointer', borderBottom: '1px dashed #999' }}>{record.subProducts.length}</span>
          </Tooltip>
       ),
       sorter: (a, b) => a.subProducts.length - b.subProducts.length,
    },
    { title: '售卖方式', dataIndex: 'saleType', key: 'saleType' },
    { 
       title: '默认成本价', 
       dataIndex: 'defaultCost', 
       key: 'defaultCost',
       render: (val) => `¥${val.toFixed(2)}`
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const statusMap: Record<string, { color: string, text: string }> = {
           PendingSelection: { color: 'default', text: '待选品' },
           Selected: { color: 'processing', text: '已选品' },
           OnShelf: { color: 'success', text: '已上架' },
           OffShelf: { color: 'error', text: '已下架' },
        };
        const { color, text } = statusMap[status] || { color: 'default', text: status };
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Button type="link" icon={<EditOutlined />} onClick={() => navigate(`/supply-chain/bundle/edit/${record.key}`)}>编辑</Button>
          {record.status === 'Selected' && (
             <Button type="link" icon={<CheckCircleOutlined />} onClick={() => handleAction(record.key, 'OnShelf')}>上架</Button>
          )}
          {record.status === 'OnShelf' && (
             <Button type="link" danger icon={<StopOutlined />} onClick={() => handleAction(record.key, 'OffShelf')}>下架</Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ background: '#fff', padding: 24, minHeight: 360 }}>
      <PageDoc 
        pageTitle="供应链管理 > 组合商品管理"
        description={`组合商品管理页面为组合商品列表页。

1. **列表字段**：
   - 组合商品名称、组合商品ID。
   - **包含子商品种类**：显示组合商品包含的子商品种类数量。
     - **交互**：鼠标悬停于数字上方（延迟200ms）显示黑底半透明浮窗。
     - **浮窗内容**：包含所有子商品的名称、规格、数量、默认成本单价、默认供应商及成本合计。
   - 售卖方式（本期仅支持打包方式）。
   - 默认成本价（所包含商品规格成本价之和）。
   - 状态（待选品、已选品、已上架、已下架）。
   - **排序功能**：支持按"包含子商品种类"列进行排序。

2. **状态说明**：
   - **待选品**：必填字段不全。
   - **已选品**：必填字段全但未上架。
   - **已上架**：已选品且已上架，出现在运营平台商品池。
   - **已下架**：已上架且执行下架操作，从运营平台移除。

3. **操作功能**：
   - **编辑**：修改组合商品信息。
   - **上架**：仅“已选品”状态展示。
   - **下架**：仅“已上架”状态展示。
   - **新增组合商品**：跳转至新增页面（不展示在菜单栏）。
   - **批量导出**：支持导出当前筛选结果。

4. **搜索功能**：
   - 支持搜索：商品信息（名称/ID）、售卖方式、状态（多选）。

5. **异常处理**：
   - **列表加载失败**：提示“获取列表数据失败，请刷新重试”。
   - **操作失败**：上架/下架操作失败时，提示具体错误原因（如“商品信息不完整，无法上架”）。
   - **导出超时**：数据量过大导致导出超时，提示“导出请求已提交，请稍后在下载中心查看”。`}
        fields={[
          { name: 'bundleId', type: 'String', length: '32', required: true, unique: true, desc: '组合商品ID' },
          { name: 'bundleName', type: 'String', length: '200', required: true, unique: false, desc: '组合商品名称' },
          { name: 'salesMode', type: 'Enum', required: true, defaultValue: 'Package', desc: '售卖方式：Package(打包)' },
          { name: 'status', type: 'Enum', required: true, defaultValue: 'PendingSelection', desc: '状态' },
        ]}
      />
      <Form layout="inline" style={{ marginBottom: 24 }}>
         <Row gutter={[16, 16]}>
            <Col>
              <Form.Item label="商品信息">
                 <Input placeholder="名称/ID" />
              </Form.Item>
            </Col>
            <Col>
              <Form.Item label="状态">
                 <Select placeholder="请选择" mode="multiple" style={{ width: 200 }}>
                    <Select.Option value="PendingSelection">待选品</Select.Option>
                    <Select.Option value="Selected">已选品</Select.Option>
                    <Select.Option value="OnShelf">已上架</Select.Option>
                    <Select.Option value="OffShelf">已下架</Select.Option>
                 </Select>
              </Form.Item>
            </Col>
            <Col>
               <Space>
                  <Button type="primary">查询</Button>
                  <Button>重置</Button>
               </Space>
            </Col>
         </Row>
      </Form>

      <div style={{ marginBottom: 16, textAlign: 'right' }}>
         <Space>
           <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/supply-chain/bundle/add')}>
             新增组合商品
           </Button>
           <Tooltip title="支持Excel/CSV格式导出，最大支持10000条数据">
             <Button icon={<ExportOutlined />} onClick={handleExport} loading={exporting}>
               {exporting ? `导出中 ${progress}%` : '批量导出'}
             </Button>
           </Tooltip>
         </Space>
      </div>

      <Table columns={columns} dataSource={data} />
    </div>
  );
};

export default BundleList;
