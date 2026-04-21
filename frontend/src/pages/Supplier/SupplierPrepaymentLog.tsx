import React, { useState, useEffect } from 'react';
import { Table, Button, Tag, Descriptions, Space, Breadcrumb, Progress, Spin } from 'antd';
import { FileTextOutlined, DownloadOutlined } from '@ant-design/icons';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import PageDoc from '../../components/PageDoc';
import { useExport } from '../../utils/exportUtils';
import { PrepaymentLogItem } from '../../types/supplier';
import request from '../../utils/request';
import { formatTimeFull } from '../../utils/dateFormatter';

const SupplierPrepaymentLog: React.FC = () => {
  const { id: supplierId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const isLogistics = location.pathname.includes('/logistics-provider/prepayment-log');
  const [logs, setLogs] = useState<PrepaymentLogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [supplierInfo, setSupplierInfo] = useState<{
    name: string;
    prepaymentWarning: number;
    prepaymentBalance: number;
  }>({ name: '', prepaymentWarning: 0, prepaymentBalance: 0 });

  const isAllSuppliers = supplierId === 'all';

  useEffect(() => {
    if (supplierId) {
      if (supplierId !== 'all') {
        fetchSupplierInfo();
      }
      fetchLogs();
    }
  }, [supplierId]);

  const fetchSupplierInfo = async () => {
    try {
      if (isLogistics) {
        const res: any = await request.get(`/logistics/${supplierId}`);
        const data = res.data || res;
        setSupplierInfo({
          name: data.name || '',
          prepaymentWarning: data.prepaymentWarning ?? 0,
          prepaymentBalance: data.prepaymentBalance ?? 0,
        });
      } else {
        const res: any = await request.get(`/suppliers/${supplierId}`);
        const data = res.data || res;
        setSupplierInfo({
          name: data.name || '',
          prepaymentWarning: data.prepaymentWarning ?? 0,
          prepaymentBalance: data.prepaymentBalance ?? 0,
        });
      }
    } catch {}
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let apiUrl: string;
      if (isLogistics) {
        apiUrl = `/prepayment-approvals/logs/logistics/${supplierId}`;
      } else if (supplierId === 'all') {
        apiUrl = '/prepayment-approvals/logs/all';
      } else {
        apiUrl = `/suppliers/${supplierId}/prepayment/logs`;
      }
      const res: any = await request.get(apiUrl);
      const records = Array.isArray(res) ? res : (res?.records || res?.data || []);
      const mapped: PrepaymentLogItem[] = records.map((item: any) => {
        const typeMap: Record<string, { type: 'Income' | 'Expense'; label: string }> = {
          CHARGE: { type: 'Income', label: '充值' },
          DEDUCT: { type: 'Expense', label: '消费' },
          REFUND: { type: 'Expense', label: '退回' },
        };
        const mappedType = typeMap[item.type] || { type: 'Expense', label: item.type };
        const amount = Number(item.amount) || 0;
        
        let displayId = item.relatedOrderNo;
        if (!displayId && item.remark) {
          const match = item.remark.match(/审批单号:\s*(YF\d+)/);
          if (match) {
            displayId = match[1];
          }
        }
        if (!displayId) {
          displayId = String(item.id);
        }
        
        return {
          key: String(item.id),
          id: displayId,
          numericId: item.id,
          type: mappedType.type,
          approvedAmount: amount,
          actualAmount: mappedType.type === 'Income' ? amount : -amount,
          date: formatTimeFull(item.createdAt),
          status: 'Approved',
          note: item.remark || '',
          supplierName: item.supplierName || item.logisticsProviderName || '',
          ownerType: item.ownerType || (item.logisticsProviderId ? 'LOGISTICS' : 'SUPPLIER'),
        };
      });
      setLogs(mapped);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const { totalPrepayment, totalSettlement, currentBalance } = React.useMemo(() => {
    let prepay = 0;
    let settle = 0;
    logs.forEach(log => {
      if (log.type === 'Income') {
        prepay += log.actualAmount;
      } else if (log.type === 'Expense') {
        settle += Math.abs(log.actualAmount);
      }
    });
    return {
      totalPrepayment: prepay,
      totalSettlement: settle,
      currentBalance: supplierInfo.prepaymentBalance,
    };
  }, [logs, supplierInfo.prepaymentBalance]);

  const { handleExport, exporting, progress } = useExport({
    filenamePrefix: isLogistics ? '物流供应商预付款结算明细' : '预付款结算明细',
    fetchData: async () => {
      const apiUrl = isLogistics
        ? `/prepayment-approvals/logs/logistics/${supplierId}`
        : `/suppliers/${supplierId}/prepayment/logs`;
      const res: any = await request.get(apiUrl);
      const records = Array.isArray(res) ? res : (res?.records || res?.data || []);
      return records.map((item: any) => {
        const typeMap: Record<string, string> = { CHARGE: '充值', DEDUCT: '消费', REFUND: '退回' };
        const amount = Number(item.amount) || 0;
        return {
          type: typeMap[item.type] || item.type,
          amount: item.type === 'CHARGE' ? amount : -amount,
          balanceAfter: item.balanceAfter,
          relatedOrderNo: item.relatedOrderNo || '',
          remark: item.remark || '',
          createdAt: formatTimeFull(item.createdAt),
        };
      });
    },
    columns: [
      { title: '收支类型', dataIndex: 'type' },
      { title: '金额', dataIndex: 'amount' },
      { title: '变动后余额', dataIndex: 'balanceAfter' },
      { title: '关联单号', dataIndex: 'relatedOrderNo' },
      { title: '备注', dataIndex: 'remark' },
      { title: '日期', dataIndex: 'createdAt' },
    ]
  });

  const columns: ColumnsType<PrepaymentLogItem> = [
    { title: '单号', dataIndex: 'id', key: 'id' },
    ...(isAllSuppliers ? [{
      title: isLogistics ? '物流供应商' : '供应商',
      dataIndex: 'supplierName',
      key: 'supplierName',
    }] : []),
    {
      title: '收支类型',
      dataIndex: 'type',
      key: 'type',
      render: (type) => (
        <Tag color={type === 'Income' ? 'green' : 'blue'}>
          {type === 'Income' ? '新增预付款' : isLogistics ? '物流供应商结算' : '供应商结算'}
        </Tag>
      )
    },
    {
      title: '审批金额',
      dataIndex: 'approvedAmount',
      key: 'approvedAmount',
      render: (val) => `¥${val.toLocaleString()}`
    },
    {
      title: '实际金额',
      dataIndex: 'actualAmount',
      key: 'actualAmount',
      render: (val) => (
        <span style={{ color: val >= 0 ? 'green' : 'red', fontWeight: 'bold' }}>
          {val >= 0 ? '+' : ''}{val.toLocaleString()}
        </span>
      )
    },
    { title: '变动时间', dataIndex: 'date', key: 'date' },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const colors: Record<string, string> = { Pending: 'orange', Approved: 'green', Rejected: 'red' };
        const texts: Record<string, string> = { Pending: '待审批', Approved: '已生效', Rejected: '已驳回' };
        return <Tag color={colors[status]}>{texts[status]}</Tag>;
      }
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => {
        const isRecordLogistics = record.ownerType === 'LOGISTICS';
        const isSettlement = record.id && record.id.startsWith('JS');
        const detailPath = isSettlement
          ? `/supply-chain/settlement/supplier/detail/${record.id}`
          : (isRecordLogistics
            ? `/supply-chain/logistics-provider/prepayment-detail/${record.id}`
            : `/supply-chain/supplier/prepayment-detail/${record.id}`);
        return (
          <Button type="link" size="small" icon={<FileTextOutlined />} onClick={() => navigate(detailPath)}>查看详情</Button>
        );
      }
    }
  ];

  return (
    <Spin spinning={loading}>
      <div style={{ background: '#fff', padding: 24, minHeight: 360 }}>
        <PageDoc
          pageTitle={isLogistics ? "供应链管理 > 物流供应商管理 > 预付款流水" : "供应链管理 > 供应商管理 > 预付款流水"}
          description={`${isLogistics ? '物流供应商' : '供应商'}预付款资金流水记录页面。
1. **列表字段**：
   - **单号**：业务单据编号。
   - **收支类型**：
     - **新增预付款**：企业向${isLogistics ? '物流供应商' : '供应商'}打款充值（收入，正数）。
     - **${isLogistics ? '物流供应商结算' : '供应商结算'}**：使用预付款支付货款（支出，负数）。
   - **金额信息**：审批金额（申请时金额）、实际金额（实际发生金额）。
   - **变动时间**：资金实际变动的时间。

2. **操作功能**：
   - **余额预警**：当预付款余额低于设定阈值时，系统自动发送企业微信消息提醒采购负责人。
   - *注：新增预付款功能已迁移至[预付款管理]模块。*

3. **数据权限**：
   - 仅"预付"类型的${isLogistics ? '物流供应商' : '供应商'}可见此页面。`}
          fields={[
            { name: 'amount', type: 'Decimal', required: true, desc: '充值金额' },
          ]}
        />

        <Breadcrumb style={{ marginBottom: 16 }} items={[
          { title: '供应链管理' },
          { title: <a onClick={() => navigate(isLogistics ? '/supply-chain/logistics-provider' : '/supply-chain/supplier')}>{isLogistics ? '物流供应商管理' : '供应商管理'}</a> },
          { title: '预付款流水' }
        ]} />

        {isAllSuppliers ? (
          <Descriptions title="预付款流水汇总" bordered column={2} style={{ marginBottom: 24 }}>
            <Descriptions.Item label="查看范围">{isLogistics ? '全部物流供应商' : '全部供应商'}</Descriptions.Item>
            <Descriptions.Item label="余额预警值">-</Descriptions.Item>

            <Descriptions.Item label="累计预付金额">
              <span style={{ color: '#52c41a', fontWeight: 'bold' }}>
                ¥{totalPrepayment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </Descriptions.Item>
            <Descriptions.Item label="累计结算金额">
              <span style={{ color: '#faad14', fontWeight: 'bold' }}>
                ¥{totalSettlement.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </Descriptions.Item>
            <Descriptions.Item label="预付款余额" span={2}>
              <span style={{ color: '#1677ff', fontSize: 18, fontWeight: 'bold' }}>
                ¥{(totalPrepayment - totalSettlement).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </Descriptions.Item>
          </Descriptions>
        ) : (
          <Descriptions title={isLogistics ? '物流供应商信息' : '供应商信息'} bordered column={2} style={{ marginBottom: 24 }}>
            <Descriptions.Item label={isLogistics ? '物流供应商名称' : '供应商名称'}>{supplierInfo.name}</Descriptions.Item>
            <Descriptions.Item label="余额预警值">¥{supplierInfo.prepaymentWarning.toLocaleString()}</Descriptions.Item>

            <Descriptions.Item label="累计预付金额">
              <span style={{ color: '#52c41a', fontWeight: 'bold' }}>
                ¥{totalPrepayment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </Descriptions.Item>
            <Descriptions.Item label="累计结算金额">
              <span style={{ color: '#faad14', fontWeight: 'bold' }}>
                ¥{totalSettlement.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </Descriptions.Item>
            <Descriptions.Item label="预付款余额" span={2}>
              <span style={{ color: currentBalance < supplierInfo.prepaymentWarning ? '#ff4d4f' : '#1677ff', fontSize: 18, fontWeight: 'bold' }}>
                ¥{currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              {currentBalance < supplierInfo.prepaymentWarning && <Tag color="error" style={{ marginLeft: 8 }}>低于预警值</Tag>}
            </Descriptions.Item>
          </Descriptions>
        )}

        <div style={{ marginBottom: 16 }}>
          <Space>
            <Button
              icon={<DownloadOutlined />}
              onClick={handleExport}
              loading={exporting}
            >
              {exporting ? `正在导出 (${progress}%)` : '导出结算明细'}
            </Button>
          </Space>
        </div>

        {exporting && (
          <div style={{ marginBottom: 16 }}>
            <Progress percent={progress} status="active" />
          </div>
        )}

        <Table columns={columns} dataSource={logs} />
      </div>
    </Spin>
  );
};

export default SupplierPrepaymentLog;
