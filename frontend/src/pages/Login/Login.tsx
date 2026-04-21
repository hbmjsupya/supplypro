import React, { useState } from 'react';
import { Form, Input, Button, Card, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { login } from '../../services/authService';

const Login: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response: any = await login(values);
      // Backend returns: ApiResponse.data which is JwtResponse { token, id, username, email }
      // request.ts interceptor unwraps ApiResponse and returns response.data
      if (response.token) {
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response));
        message.success('Login successful');
        navigate('/');
      } else {
         message.error('Login failed: No token received');
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error('Login error:', error);
      // Only show error if it's a 401 (Interceptor doesn't show message for 401)
      if (error.response && error.response.status === 401) {
        message.error('登录失败，请检查用户名和密码');
      } else if (!error.response) {
        // Network error (Interceptor shows 'Network Error', but we can be more specific if needed)
        // Usually interceptor handles all 'response' errors. 
        // If error.response is missing, it might be network timeout.
      }
      // For 500/503, interceptor already showed the specific server message.
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh', 
      backgroundColor: '#f0f2f5' 
    }}>
      <Card title="SupplyPro Login" style={{ width: 350 }}>
        <Form
          name="login"
          initialValues={{ remember: true }}
          onFinish={onFinish}
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: 'Please input your Username!' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="Username" />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Please input your Password!' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Password" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" style={{ width: '100%' }} loading={loading}>
              Log in
            </Button>
          </Form.Item>
          <div style={{textAlign: 'center', color: '#888'}}>
            Default: admin / 123456
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default Login;
