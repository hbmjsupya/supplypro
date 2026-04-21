import React, { useState, useRef } from 'react';
import { FloatButton, Tabs, Table, Typography, Card, Alert, Modal } from 'antd';
import { FileTextOutlined, DatabaseOutlined, ApartmentOutlined } from '@ant-design/icons';
import Draggable from 'react-draggable';

const { Title, Paragraph, Text } = Typography;

export interface FieldDefinition {
  name: string;
  type: string;
  length?: string;
  required?: boolean;
  unique?: boolean;
  defaultValue?: string;
  desc: string;
}

export interface PageDocProps {
  pageTitle: string;
  description: string;
  fields?: FieldDefinition[];
  flowchart?: string; // Mermaid code
  stateMachine?: string; // Mermaid code
  manual?: React.ReactNode;
}

const PageDoc: React.FC<PageDocProps> = ({
  pageTitle,
  description,
  fields,
  flowchart,
  stateMachine,
  manual
}) => {
  const [open, setOpen] = useState(false);
  const [disabled, setDisabled] = useState(true);
  const [bounds, setBounds] = useState({ left: 0, top: 0, bottom: 0, right: 0 });
  const draggleRef = useRef<HTMLDivElement>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onStart = (_event: any, uiData: any) => {
    const { clientWidth, clientHeight } = window.document.documentElement;
    const targetRect = draggleRef.current?.getBoundingClientRect();
    if (!targetRect) {
      return;
    }
    setBounds({
      left: -targetRect.left + uiData.x,
      right: clientWidth - (targetRect.right - uiData.x),
      top: -targetRect.top + uiData.y,
      bottom: clientHeight - (targetRect.bottom - uiData.y),
    });
  };

  const fieldColumns = [
    { title: '字段名称', dataIndex: 'name', key: 'name', width: 150, render: (t: string) => <Text strong>{t}</Text> },
    { title: '类型', dataIndex: 'type', key: 'type', width: 100 },
    { title: '长度', dataIndex: 'length', key: 'length', width: 80 },
    { title: '必填', dataIndex: 'required', key: 'required', width: 80, render: (v: boolean) => v ? <Text type="danger">是</Text> : '否' },
    { title: '唯一', dataIndex: 'unique', key: 'unique', width: 80, render: (v: boolean) => v ? '是' : '否' },
    { title: '默认值', dataIndex: 'defaultValue', key: 'defaultValue', width: 100 },
    { title: '描述', dataIndex: 'desc', key: 'desc' },
  ];

  const items = [
    {
      key: '1',
      label: (<span><FileTextOutlined /> 功能说明</span>),
      children: (
        <div style={{ padding: '0 8px' }}>
          <Title level={4}>{pageTitle}</Title>
          <Paragraph style={{ whiteSpace: 'pre-wrap' }}>{description}</Paragraph>
          {manual && (
            <Card title="操作指引" size="small" variant="borderless" style={{ background: '#f5f5f5', marginTop: 16 }}>
              {manual}
            </Card>
          )}
        </div>
      ),
    },
    {
      key: '2',
      label: (<span><DatabaseOutlined /> 数据字典</span>),
      children: (
        <Table 
          dataSource={fields} 
          columns={fieldColumns} 
          pagination={false} 
          size="small" 
          rowKey="name"
          scroll={{ y: 300 }}
        />
      ),
    },
    {
      key: '3',
      label: (<span><ApartmentOutlined /> 流程/状态机</span>),
      children: (
        <div style={{ padding: '0 8px' }}>
          {stateMachine && (
            <Card title="状态机 (State Diagram)" size="small" style={{ marginBottom: 16 }}>
              <Alert message="请复制以下代码至 Mermaid Live Editor 查看可视化图表" type="info" showIcon style={{ marginBottom: 8 }} />
              <pre style={{ background: '#282c34', color: '#abb2bf', padding: 12, borderRadius: 4, overflowX: 'auto' }}>
                {stateMachine}
              </pre>
            </Card>
          )}
          {flowchart && (
            <Card title="业务流程图 (Flowchart)" size="small">
              <Alert message="请复制以下代码至 Mermaid Live Editor 查看可视化图表" type="info" showIcon style={{ marginBottom: 8 }} />
              <pre style={{ background: '#282c34', color: '#abb2bf', padding: 12, borderRadius: 4, overflowX: 'auto' }}>
                {flowchart}
              </pre>
            </Card>
          )}
          {!stateMachine && !flowchart && <Paragraph type="secondary">本页面无复杂状态机或流程图。</Paragraph>}
        </div>
      ),
    }
  ];

  return (
    <>
      <FloatButton 
        icon={<FileTextOutlined />} 
        type="primary" 
        tooltip="页面文档"
        onClick={() => setOpen(true)} 
        style={{ right: 24, bottom: 24 }}
      />
      <Modal
        title={
          <div
            style={{
              width: '100%',
              cursor: 'move',
            }}
            onMouseOver={() => {
              if (disabled) {
                setDisabled(false);
              }
            }}
            onMouseOut={() => {
              setDisabled(true);
            }}
            onFocus={() => {}}
            onBlur={() => {}}
          >
            页面功能说明书
          </div>
        }
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
        width="100%"
        style={{ top: '50%', height: '50vh', padding: 0 }}
        styles={{
            body: { height: 'calc(50vh - 55px)', overflowY: 'auto' },
            mask: { backgroundColor: 'rgba(0, 0, 0, 0.45)' }
        }}
        modalRender={(modal) => (
          <Draggable
            disabled={disabled}
            bounds={bounds}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onStart={(event: any, uiData: any) => onStart(event, uiData)}
          >
            <div ref={draggleRef}>{modal}</div>
          </Draggable>
        )}
      >
        <Tabs defaultActiveKey="1" items={items} />
      </Modal>
    </>
  );
};

export default PageDoc;
