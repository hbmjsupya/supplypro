import React from 'react';
import { Table, Button, Input, Select, Space, Tag, Form, Row, Col, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { EyeOutlined, ExportOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import PageDoc from '../../components/PageDoc';
import { useExport } from '../../utils/exportUtils';

interface PriceAdjustType {
  key: string;
  adjustNo: string;
  productCount: number;
  poCount: number;
  applicant: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Revoked';
  applyTime: string;
}

const mockData: PriceAdjustType[] = [
  {
    key: '1',
    adjustNo: 'RC23102701',
    productCount: 2,
    poCount: 5,
    applicant: '张三',
    status: 'Pending',
    applyTime: '2023-10-27 10:00:00',
  },
  {
    key: '2',
    adjustNo: 'RC23102602',
    productCount: 1,
    poCount: 1,
    applicant: '李四',
    status: 'Approved',
    applyTime: '2023-10-26 15:30:00',
  },
];

const PriceAdjustmentList: React.FC = () => {
  const navigate = useNavigate();

  const { handleExport, exporting, progress } = useExport<PriceAdjustType>({
    filenamePrefix: '采购调价单列表',
    fetchData: () => mockData,
    columns: [
        { title: '调价单号', dataIndex: 'adjustNo' },
        { title: '商品数量', dataIndex: 'productCount' },
        { title: '采购单数', dataIndex: 'poCount' },
        { title: '申请人', dataIndex: 'applicant' },
        { title: '申请时间', dataIndex: 'applyTime' },
        { title: '审批状态', dataIndex: 'status', render: (val) => {
            const map: any = { 'Pending': '待审批', 'Approved': '已审批', 'Rejected': '已拒回', 'Revoked': '已撤销' };
            return map[val] || val;
        } },
    ]
  });

  const columns: ColumnsType<PriceAdjustType> = [
    { title: '调价单号', dataIndex: 'adjustNo', key: 'adjustNo' },
    { title: '商品数量', dataIndex: 'productCount', key: 'productCount' },
    { title: '采购单数', dataIndex: 'poCount', key: 'poCount' },
    { title: '申请人', dataIndex: 'applicant', key: 'applicant' },
    { title: '申请时间', dataIndex: 'applyTime', key: 'applyTime' },
    { 
       title: '审批状态', 
       dataIndex: 'status', 
       key: 'status',
       render: (status) => {
          const map: Record<string, string> = {
             Pending: '待审批',
             Approved: '已审批',
             Rejected: '已拒回',
             Revoked: '已撤销'
          };
          return <Tag>{map[status] || status}</Tag>;
       }
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Button type="link" icon={<EyeOutlined />} onClick={() => navigate(`/supply-chain/price-adjustment/detail/${record.key}`)}>查看</Button>
      ),
    },
  ];

  return (
    <div style={{ background: '#fff', padding: 24, minHeight: 360 }}>
      <PageDoc 
        pageTitle="供应链管理 > 采购调价单列表 > 采购调价单列表"
        description={`采购调价单列表页。

1. **列表字段**：
   - 调价单号、商品数量、采购单数。
   - 申请人、申请时间、审批状态。
   - 操作项：查看。

2. **数据来源说明**：
   - **数据主体**：采购成本调价单。
   - **来源诠释**：该模块是将原运营平台中的成本调价功能剥离至供应链端，并新增了独立的采购成本调价审批流。数据由采购员在采购单列表或详情页发起，经审批流（待审批 -> 审批中 -> 已审批/已拒回）流转后生成。
   - **更新频率**：实时。
   - **权限控制**：
     - **发起人**：查看自己发起的调价单。
     - **审批人**：查看待自己审批或已审批的调价单。

3. **筛选功能**：
   - 支持供应商名称、采购单号、采购单信息（下单人姓名、电话）。
   - 支持调价单号（RC+年月日时分秒+顺序两位）、商品信息（商品名称、规格名称）。
   - 支持申请时间、申请状态（待审批、审批中、已拒回、已撤销）。

4. **操作功能**：
   - **查看**：点击进入调价单详情页。

5. **异常处理**：
   - **加载异常**：列表数据请求超时，提示“加载失败，请重试”。
   - **导出异常**：批量导出失败时，提示“导出服务繁忙，请稍后再试”。
   - **空数据**：若无匹配数据，展示标准空状态提示。`}
        fields={[
          { name: 'adjustNo', type: 'String', length: '32', required: true, unique: true, desc: '调价单号 (RC+...)' },
          { name: 'status', type: 'Enum', required: true, defaultValue: 'Pending', desc: '审批状态：Pending, Approved, Rejected, Revoked' },
          { name: 'applicant', type: 'String', length: '50', required: true, unique: false, desc: '申请人姓名' },
        ]}
        flowchart={`graph TD
    A[采购员发起调价] --> B{审批}
    B -- 通过 --> C[更新采购单成本]
    B -- 拒回 --> D[流程结束]`}
      />
      <Form layout="inline" style={{ marginBottom: 24 }}>
         <Row gutter={[16, 16]}>
            <Col>
              <Form.Item label="调价单号">
                 <Input placeholder="请输入" />
              </Form.Item>
            </Col>
            <Col>
              <Form.Item label="状态">
                 <Select placeholder="请选择" style={{ width: 120 }}>
                    <Select.Option value="Pending">待审批</Select.Option>
                    <Select.Option value="Approved">已审批</Select.Option>
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
         <Tooltip title="支持Excel/CSV格式导出，最大支持10000条数据">
            <Button icon={<ExportOutlined />} onClick={handleExport} loading={exporting}>
               {exporting ? `导出中 ${progress}%` : '批量导出'}
            </Button>
         </Tooltip>
      </div>

      <Table columns={columns} dataSource={mockData} />
    </div>
  );
};

export default PriceAdjustmentList;
