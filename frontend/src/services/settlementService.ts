import request from '../utils/request';

export const getSupplierSettlements = () => {
    return request.get('/settlements', { params: {} });
};

export const paySettlement = (id: number, data: { paymentMethod: string; paymentProof?: string }) => {
    return request.post(`/settlements/${id}/pay`, data);
};

export const createPendingDeliverySettlement = (data: any) => request.post('/settlements/pending-delivery', data);

export const getPendingDeliverySettlements = (params: any = {}) => request.get('/settlements/pending-delivery', { params });

export const updatePendingDeliverySettlementStatus = (ids: any, status: string) => request.put(`/settlements/pending-delivery/status`, { ids, status });

export const createSupplierSettlement = (data: any) => request.post('/settlements/supplier', data);

export const generateSettlementId = (prefix: string = 'SET') => prefix + '-' + new Date().getTime();
