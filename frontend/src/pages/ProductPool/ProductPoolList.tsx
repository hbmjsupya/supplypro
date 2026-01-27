import React, { useState } from 'react';
import { Table, Button, Input, Select, Space, Tag, Modal, Upload, message, Form, Row, Col, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, EditOutlined, UploadOutlined, StopOutlined, CheckCircleOutlined, ExportOutlined, ImportOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import PageDoc from '../../components/PageDoc';
import { useExport } from '../../utils/exportUtils';

interface ProductDataType {
  key: string;
  productId: string;
  productName: string;
  specName: string;
  specId: string;
  defaultSupplier: string;
  defaultCost: string; // Range for display
  status: 'PendingSelection' | 'Selected' | 'OnShelf' | 'OffShelf';
  brand: string;
}

const mockProducts: ProductDataType[] = [
  {
    key: '1',
    productId: 'PROD001',
    productName: '晨光A4打印纸',
    specName: '70g/500张/包',
    specId: 'SPEC001',
    defaultSupplier: '晨光文具',
    defaultCost: '18.00-20.00',
    status: 'OnShelf',
    brand: '晨光',
  },
  {
    key: '2',
    productId: 'PROD002',
    productName: '得力黑色中性笔',
    specName: '0.5mm/12支/盒',
    specId: 'SPEC002',
    defaultSupplier: '得力集团',
    defaultCost: '12.50',
    status: 'PendingSelection',
    brand: '得力',
  },
  {
    key: '3',
    productId: 'PROD003',
    productName: '惠普激光打印机',
    specName: 'M126a/台',
    specId: 'SPEC003',
    defaultSupplier: '惠普中国',
    defaultCost: '1200.00',
    status: 'Selected',
    brand: '惠普',
  },
  {
    key: '4',
    productId: 'PROD004',
    productName: '佳能喷墨打印机',
    specName: 'G3800/台',
    specId: 'SPEC004',
    defaultSupplier: '佳能中国',
    defaultCost: '850.00',
    status: 'OffShelf',
    brand: '佳能',
  },
];

const ProductPoolList: React.FC = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<ProductDataType[]>(mockProducts);
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const { handleExport, exporting, progress } = useExport<ProductDataType>({
    filenamePrefix: '商品池列表',
    fetchData: () => products,
    columns: [
        { title: '商品ID', dataIndex: 'productId' },
        { title: '商品名称', dataIndex: 'productName' },
        { title: '规格ID', dataIndex: 'specId' },
        { title: '规格名称', dataIndex: 'specName' },
        { title: '品牌', dataIndex: 'brand' },
        { title: '默认供应商', dataIndex: 'defaultSupplier' },
        { title: '默认成本价', dataIndex: 'defaultCost' },
        { title: '状态', dataIndex: 'status', render: (val) => {
            const map: any = { 'PendingSelection': '待选品', 'Selected': '已选品', 'OnShelf': '已上架', 'OffShelf': '已下架' };
            return map[val] || val;
        } },
    ]
  });

  const handleAction = (key: string, action: string) => {
    let newStatus = '';
    let msg = '';

    switch (action) {
      case 'Select': // Submit for selection (Pending -> Selected)
        newStatus = 'Selected';
        msg = '选品完成';
        break;
      case 'OnShelf': // Selected -> OnShelf
        newStatus = 'OnShelf';
        msg = '上架成功';
        break;
      case 'OffShelf': // OnShelf -> OffShelf
        newStatus = 'OffShelf';
        msg = '下架成功';
        break;
      case 'ReShelf': // OffShelf -> OnShelf
        newStatus = 'OnShelf';
        msg = '重新上架成功';
        break;
      default:
        return;
    }

    const newProducts = products.map(item => 
      item.key === key ? { ...item, status: newStatus as ProductDataType['status'] } : item
    );
    setProducts(newProducts);
    message.success(`商品 ${key} ${msg}`);
  };

  const handleImport = (file: any) => {
    // Mock validation
    message.loading('正在校验文件...', 1).then(() => {
        // Mock error
        // message.error('导入失败：第3行 "新成本价" 必须大于0');
        message.success('导入成功：成功更新 15 条商品价格');
        setIsImportModalOpen(false);
    });
    return false; // Prevent upload
  };

  const columns: ColumnsType<ProductDataType> = [
    { title: '商品ID', dataIndex: 'productId', key: 'productId' },
    { title: '商品名称', dataIndex: 'productName', key: 'productName' },
    { title: '规格ID', dataIndex: 'specId', key: 'specId' },
    { title: '规格名称', dataIndex: 'specName', key: 'specName' },
    { title: '默认供应商', dataIndex: 'defaultSupplier', key: 'defaultSupplier' },
    { 
      title: '默认成本价', 
      dataIndex: 'defaultCost', 
      key: 'defaultCost',
      render: (text) => (
         <a onClick={() => setIsPriceModalOpen(true)}>{text}</a>
      )
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
          <Button type="link" icon={<EditOutlined />} onClick={() => navigate(`/supply-chain/product-pool/edit/${record.key}`)}>编辑</Button>
          
          {record.status === 'PendingSelection' && (
             <Button type="link" onClick={() => handleAction(record.key, 'Select')}>确认选品</Button>
          )}

          {record.status === 'Selected' && (
             <Button type="link" icon={<CheckCircleOutlined />} onClick={() => handleAction(record.key, 'OnShelf')}>上架</Button>
          )}
          
          {record.status === 'OnShelf' && (
             <Button type="link" danger icon={<StopOutlined />} onClick={() => handleAction(record.key, 'OffShelf')}>下架</Button>
          )}

          {record.status === 'OffShelf' && (
             <Button type="link" icon={<CheckCircleOutlined />} onClick={() => handleAction(record.key, 'ReShelf')}>上架</Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ background: '#fff', padding: 24, minHeight: 360 }}>
      <PageDoc 
        pageTitle="供应链管理 > 商品池管理"
        description={`商品池管理页面为商品池列表页。

1. **列表字段**：
   - 商品名称、商品ID。
   - 规格名称、规格ID。
   - 各规格默认供应商及默认成本价。
   - 状态（待选品、已选品、已上架、已下架）。

2. **状态说明**：
   - **待选品**：商品必填字段不全。
   - **已选品**：必填字段全但未执行上架操作。
   - **已上架**：已选品且执行上架操作，出现在运营平台商品池。
   - **已下架**：已上架且执行下架操作，从运营平台移除。

3. **操作功能**：
   - **编辑**：修改商品信息。
   - **上架**：仅“已选品”状态展示。
   - **下架**：仅“已上架”状态展示。
   - **新增商品**：跳转至新增页面（不展示在菜单栏）。

4. **高级功能**：
   - **搜索**：商品信息（名称）、默认供应商（模糊搜索）、商品状态（多选）。
   - **批量导出**：导出商品及规格信息（Excel）。
   - **变价导入**：批量调价（Excel导入，需校验成本价>0）。
   - **成本价调整**：列表展示成本价范围，点击可弹窗调整各规格成本价。

5. **异常处理**：
   - **导入错误**：导入文件格式错误或数据校验失败（如成本价<=0）时，提示具体错误行号和原因。
   - **操作限制**：未选品商品不可上架。`}
        fields={[
          { name: 'productId', type: 'String', length: '32', required: true, unique: true, desc: '商品ID' },
          { name: 'productName', type: 'String', length: '200', required: true, unique: false, desc: '商品名称' },
          { name: 'defaultCost', type: 'Decimal', length: '10,2', required: true, unique: false, defaultValue: '0.00', desc: '默认成本价' },
          { name: 'status', type: 'Enum', required: true, defaultValue: 'PendingSelection', desc: '状态：PendingSelection, Selected, OnShelf, OffShelf' },
        ]}
      />
      <Form layout="inline" style={{ marginBottom: 24 }}>
         <Row gutter={[16, 16]}>
            <Col>
              <Form.Item label="商品名称">
                 <Input placeholder="请输入" />
              </Form.Item>
            </Col>
            <Col>
              <Form.Item label="供应商">
                 <Input placeholder="请输入" />
              </Form.Item>
            </Col>
            <Col>
              <Form.Item label="状态">
                 <Select placeholder="请选择" style={{ width: 120 }}>
                    <Select.Option value="PendingSelection">待选品</Select.Option>
                    <Select.Option value="OnShelf">已上架</Select.Option>
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

      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
         <Space>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/supply-chain/product-pool/add')}>新增商品</Button>
            <Button icon={<ImportOutlined />} onClick={() => setIsImportModalOpen(true)}>变价导入</Button>
         </Space>
         <Tooltip title="支持Excel/CSV格式导出，最大支持10000条数据">
            <Button icon={<ExportOutlined />} onClick={handleExport} loading={exporting}>
               {exporting ? `导出中 ${progress}%` : '批量导出'}
            </Button>
         </Tooltip>
      </div>

      <Table columns={columns} dataSource={products} />
      
      <Modal 
         title="各规格成本价详情" 
         open={isPriceModalOpen} 
         onCancel={() => setIsPriceModalOpen(false)}
         footer={null}
      >
         <Table 
            dataSource={[
               { spec: '红色', cost: 18.00 },
               { spec: '蓝色', cost: 20.00 }
            ]}
            columns={[
               { title: '规格', dataIndex: 'spec' },
               { title: '成本价', dataIndex: 'cost', render: (val) => `¥${val}` }
            ]}
            pagination={false}
         />
      </Modal>

      <Modal
        title="批量变价导入"
        open={isImportModalOpen}
        onCancel={() => setIsImportModalOpen(false)}
        footer={null}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
            <p>请下载模板，填写后上传。注意：<b>新成本价必须大于0</b>。</p>
            <Button type="link">下载模板</Button>
            <Upload.Dragger beforeUpload={handleImport} maxCount={1}>
                <p className="ant-upload-drag-icon">
                    <ImportOutlined />
                </p>
                <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
            </Upload.Dragger>
        </Space>
      </Modal>
    </div>
  );
};

export default ProductPoolList;
