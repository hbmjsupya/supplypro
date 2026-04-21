import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Result, Button, Typography } from 'antd';

const { Paragraph, Text } = Typography;

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Structured logging for monitoring tools
    console.error('[CRITICAL_FRONTEND_ERROR]', {
      timestamp: new Date().toISOString(),
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      url: window.location.href
    });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '50px', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
            <Result
                status="500"
                title="500"
                subTitle="抱歉，服务器发生了错误。"
                extra={[
                    <Button type="primary" key="reload" onClick={() => window.location.reload()}>
                        刷新页面
                    </Button>,
                    <Button key="back" onClick={() => window.history.back()}>
                        返回上一页
                    </Button>
                ]}
            >
                <div className="desc">
                    <Paragraph>
                        <Text
                            strong
                            style={{
                                fontSize: 16,
                            }}
                        >
                            错误详情:
                        </Text>
                    </Paragraph>
                    <Paragraph>
                        <Text type="secondary">{this.state.error?.message}</Text>
                    </Paragraph>
                </div>
            </Result>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
