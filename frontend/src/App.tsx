import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/es/locale/zh_CN';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import MainLayout from './layouts/MainLayout';

dayjs.locale('zh-cn');

// Purchase
import BrandList from './pages/Brand/BrandList';
import BrandDetail from './pages/Brand/BrandDetail';
import SupplierList from './pages/Supplier/SupplierList';
import SupplierDetail from './pages/Supplier/SupplierDetail';
import SupplierPrepaymentList from './pages/Supplier/SupplierPrepaymentList';
import SupplierPrepaymentDetail from './pages/Supplier/SupplierPrepaymentDetail';
import SupplierPrepaymentLog from './pages/Supplier/SupplierPrepaymentLog';
import ProductPoolList from './pages/ProductPool/ProductPoolList';
import ProductAdd from './pages/ProductPool/ProductAdd';
import PurchaseOrderList from './pages/PurchaseOrder/PurchaseOrderList';
import PurchaseOrderCreate from './pages/PurchaseOrder/PurchaseOrderCreate';
import InboundOrderCreate from './pages/PurchaseOrder/InboundOrderCreate';
import PurchaseOrderDetail from './pages/PurchaseOrder/PurchaseOrderDetail';
import PurchaseOrderLogistics from './pages/PurchaseOrder/PurchaseOrderLogistics';
import PlatformConfirmList from './pages/PurchaseOrder/PlatformConfirmList';

// Price Adjustment
import PriceAdjustmentList from './pages/PriceAdjustment/PriceAdjustmentList';
import PriceAdjustmentDetail from './pages/PriceAdjustment/PriceAdjustmentDetail';

// Bundle
import BundleList from './pages/Bundle/BundleList';
import BundleAdd from './pages/Bundle/BundleAdd';

// Warehouse Management
import WarehouseList from './pages/Warehouse/WarehouseList';
import WarehouseProductList from './pages/Warehouse/WarehouseProductList';
import InboundOrderList from './pages/Warehouse/InboundOrderList';
import InboundOrderDetail from './pages/Warehouse/InboundOrderDetail';
import OutboundOrderList from './pages/Warehouse/OutboundOrderList';
import OutboundOrderDetail from './pages/Warehouse/OutboundOrderDetail';
import OutboundOrderLogistics from './pages/Warehouse/OutboundOrderLogistics';
import StockFlowList from './pages/Warehouse/StockFlowList';
import InventoryReport from './pages/Warehouse/InventoryReport';

// Logistics
import LogisticsProviderList from './pages/Logistics/LogisticsProviderList';
import LogisticsProviderDetail from './pages/Logistics/LogisticsProviderDetail';
import LogisticsTrackingDetail from './pages/Logistics/LogisticsTrackingDetail';

// Refund
import RefundOrderList from './pages/Refund/RefundOrderList';
import RefundOrderDetail from './pages/Refund/RefundOrderDetail';

// Delivery
import DeliveryOrderDetail from './pages/Delivery/DeliveryOrderDetail';

// Settlement
import PendingSettlementList from './pages/Settlement/PendingSettlementList';
import PendingDeliverySettlementList from './pages/Settlement/PendingDeliverySettlementList';
import SupplierSettlementList from './pages/Settlement/SupplierSettlementList';
import SupplierSettlementDetail from './pages/Settlement/SupplierSettlementDetail';
import SupplierPrepaymentSettlementDetail from './pages/Settlement/SupplierPrepaymentSettlementDetail';

import Login from './pages/Login/Login';

// AI Tools
import AiConfig from './pages/AiTools/AiConfig';
import CategoryMapping from './pages/AiTools/CategoryMapping';

import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <ConfigProvider locale={zhCN}>
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/supply-chain/product-pool" replace />} />
        
        <Route element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }>
           {/* Supply Chain Management */}
           <Route path="/supply-chain/brand" element={<BrandList />} />
           <Route path="/supply-chain/brand/add" element={<BrandDetail />} />
           <Route path="/supply-chain/brand/edit/:id" element={<BrandDetail />} />
           
           <Route path="/supply-chain/supplier" element={<SupplierList />} />
           <Route path="/supply-chain/supplier/add" element={<SupplierDetail />} />
           <Route path="/supply-chain/supplier/edit/:id" element={<SupplierDetail />} />
           <Route path="/supply-chain/supplier/view/:id" element={<SupplierDetail />} />
           <Route path="/supply-chain/supplier/prepayment-list/:id" element={<SupplierPrepaymentList />} />
           <Route path="/supply-chain/supplier/prepayment-detail/:id" element={<SupplierPrepaymentDetail />} />
           <Route path="/supply-chain/supplier/prepayment-log/:id" element={<SupplierPrepaymentLog />} />
           
           <Route path="/supply-chain/logistics-provider" element={<LogisticsProviderList />} />
           <Route path="/supply-chain/logistics-provider/create" element={<LogisticsProviderDetail />} />
           <Route path="/supply-chain/logistics-provider/detail/:id" element={<LogisticsProviderDetail />} />
           <Route path="/supply-chain/logistics-provider/prepayment-list/:id" element={<SupplierPrepaymentList />} />
           <Route path="/supply-chain/logistics-provider/prepayment-detail/:id" element={<SupplierPrepaymentDetail />} />
           <Route path="/supply-chain/logistics-provider/prepayment-log/:id" element={<SupplierPrepaymentLog />} />
           <Route path="/supply-chain/logistics/detail/:trackingNumber" element={<LogisticsTrackingDetail />} />
           <Route path="/supply-chain/refund-order" element={<RefundOrderList />} />
           <Route path="/supply-chain/refund-order/detail/:id" element={<RefundOrderDetail />} />
           
           <Route path="/supply-chain/product-pool" element={<ProductPoolList />} />
           <Route path="/supply-chain/product-pool/add" element={<ProductAdd />} />
           <Route path="/supply-chain/product-pool/edit/:id" element={<ProductAdd />} />
           
           <Route path="/supply-chain/bundle" element={<BundleList />} />
           <Route path="/supply-chain/bundle/add" element={<BundleAdd />} />
           <Route path="/supply-chain/bundle/edit/:id" element={<BundleAdd />} />
           
           <Route path="/supply-chain/platform-confirm" element={<PlatformConfirmList />} />
           
           <Route path="/supply-chain/purchase-order" element={<PurchaseOrderList />} />
           <Route path="/supply-chain/purchase-order/create" element={<PurchaseOrderCreate />} />
           {/* Inbound Creation Route */}
           <Route path="/supply-chain/purchase-order/create-inbound" element={<InboundOrderCreate />} />
           <Route path="/supply-chain/purchase-order/detail/:id?" element={<PurchaseOrderDetail />} />
           <Route path="/supply-chain/purchase-order/logistics/:id" element={<PurchaseOrderLogistics />} />
           
           <Route path="/supply-chain/price-adjustment" element={<PriceAdjustmentList />} />
           <Route path="/supply-chain/price-adjustment/detail/:id" element={<PriceAdjustmentDetail />} />
           
           {/* Settlement */}
           <Route path="/supply-chain/settlement/pending" element={<PendingSettlementList />} /> 
           <Route path="/supply-chain/settlement/delivery" element={<PendingDeliverySettlementList />} />
           <Route path="/supply-chain/delivery/detail/:deliveryNo" element={<DeliveryOrderDetail />} />
           <Route path="/supply-chain/settlement/supplier" element={<SupplierSettlementList />} />
           <Route path="/supply-chain/settlement/supplier/detail/:id" element={<SupplierSettlementDetail />} />
           <Route path="/supply-chain/settlement/supplier/prepayment-detail/:id" element={<Navigate to="/supply-chain/settlement/supplier/detail/:id" replace />} />

          {/* Warehouse Management */}
          <Route path="/supply-chain/warehouse" element={<WarehouseList />} />
          <Route path="/supply-chain/warehouse-product" element={<WarehouseProductList />} />
          <Route path="/supply-chain/inbound" element={<InboundOrderList />} />
          <Route path="/supply-chain/inbound/detail/:id?" element={<InboundOrderDetail />} />
          <Route path="/supply-chain/outbound" element={<OutboundOrderList />} />
          <Route path="/supply-chain/outbound/detail/:id?" element={<OutboundOrderDetail />} />
          <Route path="/supply-chain/outbound/logistics/:id" element={<OutboundOrderLogistics />} />
          <Route path="/supply-chain/stock-flow" element={<StockFlowList />} />
          <Route path="/supply-chain/inventory-report" element={<InventoryReport />} />
           
          {/* AI Tools */}
          <Route path="/ai-tools/config" element={<AiConfig />} />
          <Route path="/ai-tools/category-mapping" element={<CategoryMapping />} />
        </Route>
      </Routes>
      </Router>
      </ConfigProvider>
    </ErrorBoundary>
  );
};

export default App;
