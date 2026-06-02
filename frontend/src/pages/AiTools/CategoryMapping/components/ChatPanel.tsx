import React from 'react';
import { Input, Button, Tag, Space } from 'antd';
import { RobotOutlined, LoadingOutlined } from '@ant-design/icons';

interface ChatMessage {
  role: string;
  content: string;
}

interface ChatPanelProps {
  messages: ChatMessage[];
  loading: boolean;
  inputValue: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onClear: () => void;
  placeholder?: string;
  title?: string;
  subtitle?: string;
  maxHeight?: number;
  emptyHint?: string;
  userLabel?: string;
  aiLabel?: string;
  loadingText?: string;
}

/**
 * Reusable AI chat panel component.
 * Used for: parse chat, mapping chat, prompt chat.
 */
const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  loading,
  inputValue,
  onInputChange,
  onSend,
  onClear,
  placeholder = '输入消息...',
  title,
  subtitle,
  maxHeight = 200,
  emptyHint = '输入消息开始对话',
  userLabel = '你',
  aiLabel = 'AI小助手',
  loadingText = '正在分析...',
}) => {
  return (
    <div style={{ marginTop: 16, borderTop: '2px solid #1677ff', paddingTop: 16, background: '#f6f8ff', borderRadius: 8, padding: 16 }}>
      {title && (
        <div style={{ fontWeight: 600, marginBottom: 8, color: '#1677ff', fontSize: 14 }}>
          <RobotOutlined style={{ marginRight: 6 }} />
          {title}
          {subtitle && (
            <span style={{ fontWeight: 400, fontSize: 12, color: '#999', marginLeft: 8 }}>
              {subtitle}
            </span>
          )}
        </div>
      )}

      {messages.length > 0 && (
        <div style={{
          maxHeight, overflowY: 'auto', border: '1px solid #d9d9d9',
          borderRadius: 8, padding: 12, marginBottom: 12, background: '#fff',
        }}>
          {messages.map((m, i) => (
            <div key={i} style={{ marginBottom: 8, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <Tag color={m.role === 'user' ? 'blue' : 'green'} style={{ flexShrink: 0 }}>
                {m.role === 'user' ? userLabel : aiLabel}
              </Tag>
              <span style={{ fontSize: 13, lineHeight: '22px', wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>{m.content}</span>
            </div>
          ))}
        </div>
      )}

      {messages.length === 0 && emptyHint && (
        <div style={{
          maxHeight: 60, overflowY: 'auto', border: '1px solid #f0f0f0',
          borderRadius: 8, padding: 12, marginBottom: 12, background: '#fafafa',
          minHeight: 40,
        }}>
          <div style={{ color: '#999', fontSize: 13, textAlign: 'center', lineHeight: '40px' }}>
            {emptyHint}
          </div>
        </div>
      )}

      {loading && (
        <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Tag color="green">{aiLabel}</Tag>
          <LoadingOutlined style={{ fontSize: 14 }} />
          <span style={{ fontSize: 13, color: '#999' }}>{loadingText}</span>
        </div>
      )}

      <Space.Compact style={{ width: '100%' }}>
        <Input
          value={inputValue}
          onChange={e => onInputChange(e.target.value)}
          onPressEnter={onSend}
          placeholder={placeholder}
          disabled={loading}
        />
        <Button
          type="primary"
          icon={loading ? <LoadingOutlined /> : <RobotOutlined />}
          onClick={onSend}
          loading={loading}
        >
          发送
        </Button>
        {messages.length > 0 && (
          <Button onClick={onClear} disabled={loading}>清空</Button>
        )}
      </Space.Compact>
    </div>
  );
};

export default ChatPanel;
