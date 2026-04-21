import React, { useState, useEffect } from 'react';
import { Table, Button, Input, Select, Space, Tag, Form, Row, Col, Tooltip, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { EyeOutlined, ExportOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import PageDoc from '../../components/PageDoc';
import SearchFormLayout from '../../components/SearchFormLayout';
import { useExport } from '../../utils/exportUtils';
import { listAdjustments, CostAdjustmentSheet } from '../../services/costAdjustmentService';

const { Option } = Select;

interface PriceAdjustType {
  key: string;
  id: number;
  sheetNo: string;
  productCount: number;
  poCount: number;
  supplierName: string;
  applicant: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REVOKED';
  applyTime: string;
  totalDiff: number;
  [key: string]: unknown;
}

const PriceAdjustmentList: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PriceAdjustType[]>([]);
  const [total, setTotal] = useState(0);
  const [params, setParams] = useState<{ sheetNo?: string; status?: string; page: number; size: number }>({
    page: 0,
    size: 10
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await listAdjustments({
        sheetNo: params.sheetNo,
        status: params.status,
        page: params.page,
        size: params.size
      });
      
      const list = res.data || [];
      setData(list.map((item: CostAdjustmentSheet) => ({
        key: String(item.id),
        id: item.id,
        sheetNo: item.sheetNo,
        productCount: item.totalQuantity || item.itemCount || 1,
        poCount: 1,
        supplierName: item.supplierName || '-',
        applicant: item.createdBy || '-',
        status: item.status,
        applyTime: item.createdAt || '-',
        totalDiff: item.totalDiff || 0
      })));
      setTotal(res.totalElements || 0);
    } catch (error) {
      console.error('获取调价单列表失败', error);
      message.error('获取调价单列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [params]);

  const { handleExport, exporting, progress } = useExport<PriceAdjustType>({
    filenamePrefix: '采购调价单列表',
    fetchData: async () => {
      const res = await listAdjustments({ page: 0, size: 1000 });
      const list = res.data || [];
      return list.map((item: CostAdjustmentSheet) => ({
        key: String(item.id),
        id: item.id,
        sheetNo: item.sheetNo,
        productCount: item.totalQuantity || item.itemCount || 1,
        poCount: 1,
        supplierName: item.supplierName || '-',
        applicant: item.createdBy || '-',
        status: item.status,
        applyTime: item.createdAt || '-',
        totalDiff: item.totalDiff || 0
      }));
    },
    columns: [
        { title: '调价单号', dataIndex: 'sheetNo' },
        { title: '商品数量', dataIndex: 'productCount' },
        { title: '采购单数', dataIndex: 'poCount' },
        { title: '商品供应商', dataIndex: 'supplierName' },
        { title: '调价差额', dataIndex: 'totalDiff', render: (v: number) => `¥${(v || 0).toFixed(2)}` },
        { title: '申请人', dataIndex: 'applicant' },
        { title: '申请时间', dataIndex: 'applyTime' },
        { title: '审批状态', dataIndex: 'status', render: (val: string) => {
            const map: Record<string, string> = { 'PENDING': '待审批', 'APPROVED': '已审批', 'REJECTED': '已驳回', 'REVOKED': '已撤销' };
            return map[val] || val;
        } },
    ]
  });

  const columns: ColumnsType<PriceAdjustType> = [
    { title: '调价单号', dataIndex: 'sheetNo', key: 'sheetNo' },
    { title: '商品数量', dataIndex: 'productCount', key: 'productCount' },
    { title: '采购单数', dataIndex: 'poCount', key: 'poCount' },
    { title: '商品供应商', dataIndex: 'supplierName', key: 'supplierName' },
    { 
      title: '调价差额', 
      dataIndex: 'totalDiff', 
      key: 'totalDiff',
      render: (v: number) => {
        const color = (v || 0) >= 0 ? '#52c41a' : '#ff4d4f';
        return <span style={{ color }}>{(v || 0) >= 0 ? '+' : ''}¥{(v || 0).toFixed(2)}</span>;
      }
    },
    { title: '申请人', dataIndex: 'applicant', key: 'applicant' },
    { title: '申请时间', dataIndex: 'applyTime', key: 'applyTime' },
    { 
       title: '审批状态', 
       dataIndex: 'status', 
       key: 'status',
       render: (status) => {
          const map: Record<string, { text: string; color: string }> = {
             PENDING: { text: '待审批', color: 'blue' },
             APPROVED: { text: '已审批', color: 'green' },
             REJECTED: { text: '已驳回', color: 'red' },
             REVOKED: { text: '已撤销', color: 'default' }
          };
          const info = map[status] || { text: status, color: 'default' };
          return <Tag color={info.color}>{info.text}</Tag>;
       }
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Button type="link" icon={<EyeOutlined />} onClick={() => navigate(`/supply-chain/price-adjustment/detail/${record.sheetNo}`)}>查看</Button>
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
      <SearchFormLayout onFinish={(values: any) => {
        setParams(prev => ({ ...prev, ...values, page: 0 }));
      }} onReset={() => {
        setParams({ page: 0, size: 10 });
      }}>
         <Form.Item label="调价单号" name="sheetNo" style={{ marginBottom: 0 }}>
            <Input placeholder="请输入" />
         </Form.Item>
         <Form.Item label="状态" name="status" style={{ marginBottom: 0 }}>
            <Select placeholder="请选择" allowClear>
               <Option value="PENDING">待审批</Option>
               <Option value="APPROVED">已审批</Option>
               <Option value="REJECTED">已驳回</Option>
               <Option value="REVOKED">已撤销</Option>
            </Select>
         </Form.Item>
      </SearchFormLayout>

      <div style={{ marginBottom: 16, textAlign: 'right' }}>
         <Tooltip title="支持Excel/CSV格式导出，最大支持10000条数据">
            <Button icon={<ExportOutlined />} onClick={handleExport} loading={exporting}>
               {exporting ? `导出中 ${progress}%` : '批量导出'}
            </Button>
         </Tooltip>
      </div>

      <Table 
        columns={columns} 
        dataSource={data} 
        loading={loading}
        pagination={{
          current: params.page + 1,
          pageSize: params.size,
          total: total,
          onChange: (page, size) => {
            setParams(prev => ({ ...prev, page: page - 1, size }));
          }
        }}
      />
    </div>
  );
};

export default PriceAdjustmentList;
