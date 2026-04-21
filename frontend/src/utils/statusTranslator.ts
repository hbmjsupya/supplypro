export const StatusTranslator = {
  orderStatusMap: new Map<string, string>([
    ['PENDING', '待处理'],
    ['CONFIRMED', '已确认'],
    ['SHIPPED', '已发货'],
    ['RECEIVED', '已收货'],
    ['CANCELLED', '已取消'],
    ['COMPLETED', '已完成'],
    ['PENDING_SETTLEMENT', '待结算'],
    ['PARTIAL_SETTLED', '部分结算'],
    ['SETTLED', '已结算'],
  ]),

  shippingStatusMap: new Map<string, string>([
    ['PENDING', '待发货'],
    ['SHIPPED', '已发货'],
    ['IN_TRANSIT', '运输中'],
    ['DELIVERED', '已送达'],
    ['RECEIVED', '已收货'],
    ['RETURNED', '已退货'],
  ]),

  inboundStatusMap: new Map<string, string>([
    ['PENDING', '待处理'],
    ['SHIPPED', '已发货'],
    ['RECEIVED', '已收货'],
    ['CANCELLED', '已取消'],
  ]),

  translateStatus(statusName: string | null | undefined): string {
    if (!statusName || statusName === 'NULL' || statusName === 'None') return '无';
    
    let translated = this.orderStatusMap.get(statusName);
    if (translated) return translated;
    
    translated = this.shippingStatusMap.get(statusName);
    if (translated) return translated;
    
    translated = this.inboundStatusMap.get(statusName);
    if (translated) return translated;
    
    return statusName;
  },

  translateOrderStatus(status: string | null | undefined): string {
    if (!status || status === 'NULL') return '未知';
    return this.orderStatusMap.get(status) || status;
  },

  translateShippingStatus(status: string | null | undefined): string {
    if (!status || status === 'NULL') return '未知';
    return this.shippingStatusMap.get(status) || status;
  },

  translateInboundStatus(status: string | null | undefined): string {
    if (!status || status === 'NULL') return '未知';
    return this.inboundStatusMap.get(status) || status;
  },
};

export default StatusTranslator;
