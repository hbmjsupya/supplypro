import React, { useState } from 'react';
import { Layout, Menu, theme, Avatar, Dropdown, Space, Tabs } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  UserOutlined,
  ShopOutlined,
  AppstoreOutlined,
  ShoppingOutlined,
  FileTextOutlined,
  AccountBookOutlined,
  PayCircleOutlined,
  DownOutlined,
  DownloadOutlined,
  UploadOutlined,
  BarChartOutlined
} from '@ant-design/icons';
import { logout, getCurrentUser } from '../services/authService';

const { Header, Sider, Content } = Layout;

const MainLayout: React.FC = () => {
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const user = getCurrentUser();

  const handleMenuClick = ({ key }: { key: string }) => {
    if (key === 'logout') {
      logout();
    }
  };

  const menuItems = [
    {
      key: 'supply-chain',
      label: '供应链管理',
      icon: <AppstoreOutlined />,
      children: [
        { key: '/supply-chain/brand', label: '品牌管理', icon: <ShopOutlined /> },
        { key: '/supply-chain/supplier', label: '供应商管理', icon: <UserOutlined /> },
        { key: '/supply-chain/logistics-provider', label: '物流供应商管理', icon: <ShopOutlined /> },
        { key: '/supply-chain/product-pool', label: '商品池管理', icon: <ShoppingOutlined /> },
        { key: '/supply-chain/bundle', label: '组合商品管理', icon: <AppstoreOutlined /> },
        { key: '/supply-chain/platform-confirm', label: '平台订单采购确认', icon: <FileTextOutlined /> },
        { key: '/supply-chain/purchase-order', label: '采购单列表', icon: <FileTextOutlined /> },
        { key: '/supply-chain/price-adjustment', label: '采购调价单列表', icon: <AccountBookOutlined /> },
        { key: '/supply-chain/settlement/pending', label: '待结算采购单列表', icon: <PayCircleOutlined /> },
        { key: '/supply-chain/settlement/delivery', label: '待结算配送单列表', icon: <PayCircleOutlined /> },
        { key: '/supply-chain/settlement/supplier', label: '供应商结算单列表', icon: <PayCircleOutlined /> },
      ]
    },
    {
      key: 'warehouse-management',
      label: '仓储管理',
      icon: <ShopOutlined />,
      children: [
        { key: '/supply-chain/warehouse', label: '分仓管理', icon: <AppstoreOutlined /> },
        { key: '/supply-chain/inbound', label: '采购入库', icon: <DownloadOutlined /> },
        { key: '/supply-chain/outbound', label: '库存发货', icon: <UploadOutlined /> },
        { key: '/supply-chain/stock-flow', label: '出入库流水', icon: <FileTextOutlined /> },
        { key: '/supply-chain/inventory-report', label: '库存报表', icon: <BarChartOutlined /> },
      ]
    }
  ];

  // Helper to determine selected key for sub-pages
  const getSelectedKey = (pathname: string) => {
      // Direct matches
      if (menuItems[0].children.some(item => item.key === pathname)) {
          return pathname;
      }
      // Sub-page mapping
      if (pathname.startsWith('/supply-chain/brand')) return '/supply-chain/brand';
      if (pathname.startsWith('/supply-chain/supplier')) return '/supply-chain/supplier';
      if (pathname.startsWith('/supply-chain/logistics-provider')) return '/supply-chain/logistics-provider';
      if (pathname.startsWith('/supply-chain/product-pool')) return '/supply-chain/product-pool';
      if (pathname.startsWith('/supply-chain/bundle')) return '/supply-chain/bundle';
      if (pathname.startsWith('/supply-chain/purchase-order')) return '/supply-chain/purchase-order';
      if (pathname.startsWith('/supply-chain/price-adjustment')) return '/supply-chain/price-adjustment';
      if (pathname.startsWith('/supply-chain/settlement/supplier')) return '/supply-chain/settlement/supplier';
      if (pathname.startsWith('/supply-chain/settlement/pending')) return '/supply-chain/settlement/pending';
      if (pathname.startsWith('/supply-chain/settlement/delivery')) return '/supply-chain/settlement/delivery';
      
      // Warehouse Mapping
      if (pathname.startsWith('/supply-chain/warehouse')) return '/supply-chain/warehouse';
      if (pathname.startsWith('/supply-chain/warehouse-product')) return '/supply-chain/warehouse-product';
      if (pathname.startsWith('/supply-chain/inbound')) return '/supply-chain/inbound';
      if (pathname.startsWith('/supply-chain/outbound')) return '/supply-chain/outbound';
      if (pathname.startsWith('/supply-chain/inventory-report')) return '/supply-chain/inventory-report';

      return pathname;
  };

  const selectedKeys = [getSelectedKey(location.pathname)];
  const openKeys = ['supply-chain', 'warehouse-management'];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', padding: '0 24px', boxShadow: '0 1px 4px rgba(0,21,41,0.08)', zIndex: 1 }}>
        <div className="logo" style={{ fontSize: '18px', fontWeight: 'bold', color: '#1677ff' }}>
          SupplyPro Supply Chain
        </div>
        <div className="user-profile" style={{ display: 'flex', alignItems: 'center' }}>
           <span style={{ marginRight: 8 }}>{user ? user.username : 'User'}</span>
           <div style={{ width: 1, height: 24, background: '#f0f0f0', margin: '0 16px' }} />
           <Dropdown menu={{ items: [{ key: 'logout', label: '退出登录' }], onClick: handleMenuClick }}>
             <Space style={{ cursor: 'pointer' }}>
               <Avatar icon={<UserOutlined />} />
               <DownOutlined />
             </Space>
           </Dropdown>
        </div>
      </Header>
      <Layout>
        <Sider width={250} collapsible collapsed={collapsed} onCollapse={(value) => setCollapsed(value)} theme="light" style={{ boxShadow: '2px 0 8px 0 rgba(29,35,41,0.05)' }}>
          <Menu
            mode="inline"
            defaultOpenKeys={openKeys}
            selectedKeys={selectedKeys}
            style={{ height: '100%', borderRight: 0 }}
            items={menuItems}
            onClick={({ key }) => navigate(key)}
          />
        </Sider>
        <Layout style={{ padding: '0 24px 24px' }}>
          <div style={{ margin: '16px 0' }}>
             <Tabs
               type="editable-card"
               hideAdd
               activeKey={location.pathname}
               items={[
                 { label: 'Current Page', key: location.pathname, closable: false }
               ]}
               onTabClick={(key) => navigate(key)}
             />
          </div>
          <Content
            style={{
              padding: 24,
              margin: 0,
              minHeight: 280,
              background: colorBgContainer,
              borderRadius: borderRadiusLG,
              overflow: 'auto'
            }}
          >
            <Outlet />
          </Content>
        </Layout>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
