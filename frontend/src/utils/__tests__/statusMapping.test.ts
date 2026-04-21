
import { describe, it, expect } from 'vitest';
import { getStatusText, getStatusColor, StatusMap, ReceivingStatusMap, AuditStatusMap, OutboundStatusMap } from '../statusMapping';

describe('statusMapping Utility', () => {
    describe('getStatusText', () => {
        it('should map standard Order Statuses', () => {
            expect(getStatusText('PENDING')).toBe('待处理');
            expect(getStatusText('CONFIRMED')).toBe('待发货');
            expect(getStatusText('SHIPPED')).toBe('已发货');
            expect(getStatusText('RECEIVED')).toBe('已收货');
            expect(getStatusText('COMPLETED')).toBe('已完成');
            expect(getStatusText('CANCELLED')).toBe('已取消');
            expect(getStatusText('INBOUNDGENERATED')).toBe('已生成入库单');
            expect(getStatusText('PENDING_SETTLEMENT')).toBe('待结算');
            expect(getStatusText('SETTLED')).toBe('已结算');
        });

        it('should map legacy Order Statuses', () => {
            expect(getStatusText('ToShip')).toBe('待发货');
            expect(getStatusText('Pending')).toBe('待处理');
            expect(getStatusText('Confirmed')).toBe('待发货');
            expect(getStatusText('Cancelled')).toBe('已取消');
        });

        it('should map Shipping Statuses', () => {
            expect(getStatusText('UNSHIPPED', 'shipping')).toBe('未发货');
            expect(getStatusText('SHIPPED', 'shipping')).toBe('已发货');
            expect(getStatusText('RECEIVED', 'shipping')).toBe('已收货');
            expect(getStatusText('DELIVERED', 'shipping')).toBe('已送达');
            expect(getStatusText('PARTIAL', 'shipping')).toBe('部分发货');
        });

        it('should map new Shipping Statuses', () => {
            expect(getStatusText('PENDING', 'shipping')).toBe('待处理');
            expect(getStatusText('TO_SHIP', 'shipping')).toBe('待发货');
            expect(getStatusText('SHIPPED', 'shipping')).toBe('已发货');
            expect(getStatusText('RECEIVED', 'shipping')).toBe('已收货');
        });

        it('should map legacy/mixed-case Shipping Statuses', () => {
            expect(getStatusText('Pending', 'shipping')).toBe('待处理');
            expect(getStatusText('To_Ship', 'shipping')).toBe('待发货');
            expect(getStatusText('Shipped', 'shipping')).toBe('已发货');
            expect(getStatusText('Received', 'shipping')).toBe('已收货');
        });

        it('should map Audit Statuses', () => {
            expect(getStatusText('PENDING', 'audit')).toBe('待审批');
            expect(getStatusText('APPROVED', 'audit')).toBe('已通过');
            expect(getStatusText('REJECTED', 'audit')).toBe('已拒绝');
            expect(getStatusText('PAID', 'audit')).toBe('已支付');
            expect(getStatusText('COMPLETED', 'audit')).toBe('已完成');
            expect(getStatusText('SETTLED', 'audit')).toBe('已结算');
        });

        it('should map Outbound Statuses', () => {
            expect(getStatusText('PENDING', 'outbound')).toBe('待发货');
            expect(getStatusText('SHIPPED', 'outbound')).toBe('已发货');
        });

        it('should return original text for unknown status', () => {
            expect(getStatusText('UNKNOWN')).toBe('UNKNOWN');
            expect(getStatusText('UNKNOWN', 'shipping')).toBe('UNKNOWN');
        });

        it('should handle null/undefined/empty', () => {
            // @ts-ignore
            expect(getStatusText(null)).toBe('-');
            // @ts-ignore
            expect(getStatusText(undefined)).toBe('-');
            expect(getStatusText('')).toBe('-');
        });
    });

    describe('getStatusColor', () => {
        it('should return correct colors for Order Statuses', () => {
            expect(getStatusColor('PENDING')).toBe('orange');
            expect(getStatusColor('CONFIRMED')).toBe('cyan');
            expect(getStatusColor('SHIPPED')).toBe('blue');
            expect(getStatusColor('RECEIVED')).toBe('purple');
            expect(getStatusColor('COMPLETED')).toBe('green');
            expect(getStatusColor('CANCELLED')).toBe('red');
            expect(getStatusColor('INBOUNDGENERATED')).toBe('geekblue');
            expect(getStatusColor('PENDING_SETTLEMENT')).toBe('geekblue');
            expect(getStatusColor('SETTLED')).toBe('green');
        });

        it('should return correct colors for legacy Order Statuses', () => {
            expect(getStatusColor('ToShip')).toBe('cyan');
            expect(getStatusColor('Pending')).toBe('orange');
        });

        it('should return correct colors for Shipping Statuses', () => {
            expect(getStatusColor('SHIPPED', 'shipping')).toBe('blue');
            expect(getStatusColor('RECEIVED', 'shipping')).toBe('purple');
            expect(getStatusColor('DELIVERED', 'shipping')).toBe('green');
        });

        it('should return correct colors for Audit Statuses', () => {
            expect(getStatusColor('PENDING', 'audit')).toBe('blue');
            expect(getStatusColor('APPROVED', 'audit')).toBe('green');
            expect(getStatusColor('REJECTED', 'audit')).toBe('red');
            expect(getStatusColor('PAID', 'audit')).toBe('green');
            expect(getStatusColor('COMPLETED', 'audit')).toBe('green');
            expect(getStatusColor('SETTLED', 'audit')).toBe('green');
        });

        it('should return correct colors for Outbound Statuses', () => {
            expect(getStatusColor('PENDING', 'outbound')).toBe('orange');
            expect(getStatusColor('SHIPPED', 'outbound')).toBe('green');
        });

        it('should return default for unknown status', () => {
            expect(getStatusColor('UNKNOWN')).toBe('default');
        });

        it('should handle null/undefined/empty', () => {
            // @ts-ignore
            expect(getStatusColor(null)).toBe('default');
            // @ts-ignore
            expect(getStatusColor(undefined)).toBe('default');
            expect(getStatusColor('')).toBe('default');
        });
    });

    describe('Maps Consistency', () => {
        it('StatusMap should have all keys', () => {
            const keys = Object.keys(StatusMap);
            expect(keys).toContain('PENDING');
            expect(keys).toContain('CONFIRMED');
            expect(keys).toContain('SHIPPED');
            expect(keys).toContain('RECEIVED');
            expect(keys).toContain('COMPLETED');
            expect(keys).toContain('CANCELLED');
            expect(keys).toContain('INBOUNDGENERATED');
            expect(keys).toContain('PENDING_SETTLEMENT');
            expect(keys).toContain('SETTLED');
        });

        it('ReceivingStatusMap should have all keys', () => {
            const keys = Object.keys(ReceivingStatusMap);
            expect(keys).toContain('PENDING');
            expect(keys).toContain('TO_SHIP');
            expect(keys).toContain('SHIPPED');
            expect(keys).toContain('RECEIVED');
            expect(keys).toContain('DELIVERED');
        });

        it('AuditStatusMap should have all keys', () => {
            const keys = Object.keys(AuditStatusMap);
            expect(keys).toContain('PENDING');
            expect(keys).toContain('APPROVED');
            expect(keys).toContain('REJECTED');
            expect(keys).toContain('PAID');
            expect(keys).toContain('COMPLETED');
            expect(keys).toContain('SETTLED');
        });

        it('OutboundStatusMap should have all keys', () => {
            const keys = Object.keys(OutboundStatusMap);
            expect(keys).toContain('PENDING');
            expect(keys).toContain('SHIPPED');
        });
    });
});
