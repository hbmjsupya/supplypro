
export const StatusMap: Record<string, string> = {
  'PENDING': '待处理',
  'CONFIRMED': '待发货',
  'TO_SHIP': '待发货',
  'SHIPPED': '已发货',
  'RECEIVED': '已收货',
  'COMPLETED': '已完成',
  'CANCELLED': '已取消',
  'INBOUNDGENERATED': '已生成入库单',
  'PENDING_SETTLEMENT': '待结算',
  'SETTLED': '已结算'
};

export const formatBeijingTime = (dateStr: string | undefined | null): string => {
  if (!dateStr) return '-';
  
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '-';
    
    const beijingOffset = 8 * 60;
    const localOffset = date.getTimezoneOffset();
    const beijingTime = new Date(date.getTime() + (beijingOffset + localOffset) * 60 * 1000);
    
    const year = beijingTime.getFullYear();
    const month = String(beijingTime.getMonth() + 1).padStart(2, '0');
    const day = String(beijingTime.getDate()).padStart(2, '0');
    const hours = String(beijingTime.getHours()).padStart(2, '0');
    const minutes = String(beijingTime.getMinutes()).padStart(2, '0');
    const seconds = String(beijingTime.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  } catch {
    return '-';
  }
};

export const ReceivingStatusMap: Record<string, string> = {
  'PENDING': '待处理',
  'TO_SHIP': '待发货',
  'SHIPPED': '已发货',
  'RECEIVED': '已收货',
  'DELIVERED': '已送达'
};

export const SettlementStatusMap: Record<string, string> = {
  'UNSETTLED': '未结算',
  'PARTIALLY_SETTLED': '部分结算',
  'SETTLED': '已结算'
};

export const OutboundStatusMap: Record<string, string> = {
  'PENDING': '待发货',
  'SHIPPED': '已发货',
  'RECEIVED': '已收货',
  'COMPLETED': '已完成',
  'CANCELLED': '已取消'
};

export const AuditStatusMap: Record<string, string> = {
  'PENDING': '待审批',
  'APPROVED': '已通过',
  'REJECTED': '已拒绝',
  'PAID': '已支付',
  'COMPLETED': '已完成',
  'SETTLED': '已结算'
};

export const LogisticsStatusMap: Record<string, string> = {
  '0': '无轨迹',
  '1': '已揽收',
  '2': '在途中',
  '3': '已签收',
  '4': '问题件'
};

export const StatusColorMap: Record<string, string> = {
  'PENDING': '#faad14',
  'CONFIRMED': '#722ed1',
  'TO_SHIP': '#722ed1',
  'SHIPPED': '#13c2c2',
  'RECEIVED': '#52c41a',
  'COMPLETED': '#52c41a',
  'CANCELLED': '#ff4d4f',
  'INBOUNDGENERATED': '#2f54eb',
  'PENDING_SETTLEMENT': '#2f54eb',
  'SETTLED': '#52c41a',
  
  // Shipping Status Colors (use prefix to avoid conflict with order status)
  'SHIPPING_PENDING': 'default',
  'SHIPPING_TO_SHIP': 'orange',
  // SHIPPED, RECEIVED reuse above
  'DELIVERED': 'green',
  
  // Settlement Status Colors
  'UNSETTLED': 'red',
  'PARTIALLY_SETTLED': 'orange',
  // SETTLED reuses above
  
  // Logistics Status Colors
  'LOGISTICS_0': 'default',
  'LOGISTICS_1': 'processing',
  'LOGISTICS_2': 'processing',
  'LOGISTICS_3': 'success',
  'LOGISTICS_4': 'error'
};

export const getStatusText = (status: string, type: 'order' | 'shipping' | 'settlement' | 'outbound' | 'audit' | 'logistics' = 'order'): string => {
  if (!status) return '-';
  
  // Handle mixed case or raw values if necessary, though backend should return uppercase enums
  const upperStatus = status.toUpperCase();
  
  if (type === 'shipping') {
    return ReceivingStatusMap[upperStatus] || status;
  } else if (type === 'settlement') {
    return SettlementStatusMap[upperStatus] || status;
  } else if (type === 'outbound') {
    return OutboundStatusMap[upperStatus] || status;
  } else if (type === 'audit') {
    return AuditStatusMap[upperStatus] || status;
  } else if (type === 'logistics') {
    return LogisticsStatusMap[status] || status;
  } else {
    // Order status
    // Handle legacy frontend mappings if any
    if (upperStatus === 'TOSHIP') return StatusMap['CONFIRMED'];
    return StatusMap[upperStatus] || status;
  }
};

export const getStatusColor = (status: string, type?: 'order' | 'shipping' | 'settlement' | 'outbound' | 'audit' | 'logistics'): string => {
  if (!status) return 'default';
  const upperStatus = status.toUpperCase();
  
  if (type === 'shipping') {
    if (upperStatus === 'PENDING') return 'default';
    if (upperStatus === 'TO_SHIP') return 'orange';
    if (upperStatus === 'SHIPPED') return 'blue';
    if (upperStatus === 'RECEIVED') return 'green';
    if (upperStatus === 'DELIVERED') return 'green';
  }
  
  if (type === 'outbound') {
    if (upperStatus === 'SHIPPED') return 'blue';
    if (upperStatus === 'PENDING') return 'orange';
    if (upperStatus === 'RECEIVED') return 'green';
    if (upperStatus === 'COMPLETED') return 'green';
    if (upperStatus === 'CANCELLED') return 'red';
  }
  
  if (type === 'audit') {
     if (['APPROVED', 'PAID', 'COMPLETED', 'SETTLED'].includes(upperStatus)) return 'green';
     if (upperStatus === 'PENDING') return 'blue';
     if (upperStatus === 'REJECTED') return 'red';
  }
  
  if (type === 'logistics') {
      return StatusColorMap[`LOGISTICS_${status}`] || 'default';
  }

  // Handle legacy frontend mappings if any
  if (upperStatus === 'TOSHIP') return StatusColorMap['CONFIRMED'];
  return StatusColorMap[upperStatus] || 'default';
};

export const getShippingStatusInfo = (shippingStatus?: string, orderStatus?: string) => {
    // Logic: Prioritize order status if it is COMPLETED
    if (orderStatus === 'COMPLETED') {
        return {
            text: getStatusText('COMPLETED'),
            color: getStatusColor('COMPLETED')
        };
    }

    // Logic: Prioritize shipping status if valid and not 'UNSHIPPED' (unless order is confirmed/shipped), 
    // or just show shipping status if it's explicitly asked for.
    // The requirement is to show "Shipping Status".
    
    // If only shippingStatus is provided
    if (shippingStatus) {
        return {
            text: getStatusText(shippingStatus, 'shipping'),
            color: getStatusColor(shippingStatus)
        };
    }
    
    // Fallback to order status if shipping status is missing
    if (orderStatus) {
        return {
            text: getStatusText(orderStatus, 'order'),
            color: getStatusColor(orderStatus)
        };
    }
    
    return { text: '-', color: 'default' };
};

export const getStatusInfo = (status?: string) => {
    if (!status) {
        return { text: '-', color: 'default' };
    }
    return {
        text: getStatusText(status, 'order'),
        color: getStatusColor(status)
    };
};
