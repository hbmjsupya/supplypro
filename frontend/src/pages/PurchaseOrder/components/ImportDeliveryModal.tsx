import React, { useState } from 'react';
import { Modal, Upload, Button, Space, Typography, Alert, Divider, Progress, Table, message, Statistic, Row, Col } from 'antd';
import { ImportOutlined, UploadOutlined, DownloadOutlined, FileExcelOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import { importDeliveryOrders, DeliveryImportResponse } from '../../../services/deliveryExportService';
import { useFileUpload } from '../../../utils/hooks/useFileUpload';

const { Text, Title } = Typography;

interface ImportDeliveryModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
}

const ImportDeliveryModal: React.FC<ImportDeliveryModalProps> = ({
  open,
  onCancel,
  onSuccess
}) => {
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<DeliveryImportResponse | null>(null);

  const { beforeUpload: validateBeforeUpload } = useFileUpload({
    allowedExtensions: ['xlsx', 'xls'],
    allowedMimeTypes: [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ],
    maxSize: 10 * 1024 * 1024,
    customErrorMessage: '只支持 Excel 文件 (.xlsx, .xls)',
  });

  const handleBeforeUpload = (file: UploadFile) => {
    const isValid = validateBeforeUpload(file as unknown as File, []);
    if (!isValid) {
      return false;
    }
    setFileList([file]);
    setImportResult(null);
    return false;
  };

  const handleImport = async () => {
    if (fileList.length === 0) {
      message.warning('请先选择要导入的文件');
      return;
    }

    const file = fileList[0].originFileObj || (fileList[0] as any);
    if (!file) {
      message.error('文件读取失败，请重新选择文件');
      return;
    }

    if (!(file instanceof File) && !(file instanceof Blob)) {
      message.error('文件格式无效，请重新选择文件');
      return;
    }

    setImporting(true);
    setImportResult(null);

    try {
      const result = await importDeliveryOrders(file as File);
      setImportResult(result);
      
      if (result.successCount > 0) {
        message.success(`导入完成: 成功 ${result.successCount} 条`);
        onSuccess();
      }
    } catch (error: any) {
      console.error('Import failed:', error);
      message.error(error.message || '导入失败，请检查文件格式');
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        '采购单号': 'PO20240101001',
        '物流公司': '顺丰速运',
        '运单号': 'SF1234567890',
        '发货时间': '2024-01-01 10:00:00'
      }
    ];

    const ws = new Blob(
      [
        Object.keys(templateData[0]).join(',') + '\n' +
        Object.values(templateData[0]).join(',')
      ],
      { type: 'text/csv;charset=utf-8;' }
    );
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(ws);
    link.download = '发货单导入模板.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    message.success('模板下载成功');
  };

  const handleClose = () => {
    setFileList([]);
    setImportResult(null);
    onCancel();
  };

  const handleRemoveFile = () => {
    setFileList([]);
    setImportResult(null);
  };

  return (
    <Modal
      title={
        <Space>
          <ImportOutlined />
          <span>导入发货单</span>
        </Space>
      }
      open={open}
      onCancel={handleClose}
      width={600}
      footer={[
        <Button key="cancel" onClick={handleClose}>
          关闭
        </Button>,
        <Button
          key="import"
          type="primary"
          icon={<ImportOutlined />}
          loading={importing}
          onClick={handleImport}
          disabled={fileList.length === 0}
        >
          开始导入
        </Button>
      ]}
    >
      <Alert
        message="导入说明"
        description="请按照模板格式填写发货信息，系统将自动更新采购单的物流信息。支持 .xlsx 和 .xls 格式。"
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <div style={{ marginBottom: 16 }}>
        <Button
          icon={<DownloadOutlined />}
          onClick={handleDownloadTemplate}
        >
          下载导入模板
        </Button>
      </div>

      <Divider style={{ margin: '16px 0' }} />

      <Upload
        beforeUpload={handleBeforeUpload}
        fileList={fileList}
        onRemove={handleRemoveFile}
        accept=".xlsx,.xls"
        maxCount={1}
      >
        <Button icon={<UploadOutlined />} block>
          选择文件
        </Button>
      </Upload>

      {fileList.length > 0 && (
        <div style={{ marginTop: 16, padding: 12, background: '#fafafa', borderRadius: 4 }}>
          <Space>
            <FileExcelOutlined style={{ color: '#52c41a', fontSize: 20 }} />
            <Text>{fileList[0].name}</Text>
            <Text type="secondary">
              ({((fileList[0].size as number) / 1024).toFixed(2)} KB)
            </Text>
          </Space>
        </div>
      )}

      {importing && (
        <div style={{ marginTop: 16 }}>
          <Progress percent={50} status="active" />
          <Text type="secondary">正在导入，请稍候...</Text>
        </div>
      )}

      {importResult && (
        <div style={{ marginTop: 16 }}>
          <Divider>导入结果</Divider>
          
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={8}>
              <Statistic 
                title="总计导入" 
                value={importResult.totalCount} 
                suffix="条"
                valueStyle={{ color: '#1890ff' }}
              />
            </Col>
            <Col span={8}>
              <Statistic 
                title="成功导入" 
                value={importResult.successCount} 
                suffix="条"
                valueStyle={{ color: '#52c41a' }}
                prefix={<CheckCircleOutlined />}
              />
            </Col>
            <Col span={8}>
              <Statistic 
                title="导入失败" 
                value={importResult.failCount} 
                suffix="条"
                valueStyle={{ color: importResult.failCount > 0 ? '#ff4d4f' : '#52c41a' }}
                prefix={importResult.failCount > 0 ? <CloseCircleOutlined /> : <CheckCircleOutlined />}
              />
            </Col>
          </Row>

          <Alert
            message={
              importResult.failCount > 0 
                ? "部分记录导入失败，请下载结果文件查看详情" 
                : "所有记录导入成功！"
            }
            type={importResult.failCount > 0 ? 'warning' : 'success'}
            showIcon
            style={{ marginBottom: 16 }}
          />

          {importResult.errorFileUrl && (
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              href={importResult.errorFileUrl}
              download={`发货单导入结果_${new Date().toISOString().slice(0, 10)}.xlsx`}
              block
            >
              下载导入结果文件
            </Button>
          )}

          {importResult.errors && importResult.errors.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <Text strong>失败记录详情：</Text>
              <Table
                size="small"
                dataSource={importResult.errors}
                rowKey={(record) => `${record.row}-${record.poNo}`}
                columns={[
                  { title: '行号', dataIndex: 'row', width: 80 },
                  { title: '采购单号', dataIndex: 'poNo', width: 150 },
                  { title: '错误信息', dataIndex: 'message' }
                ]}
                pagination={false}
                scroll={{ y: 200 }}
                style={{ marginTop: 8 }}
              />
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};

export default ImportDeliveryModal;
