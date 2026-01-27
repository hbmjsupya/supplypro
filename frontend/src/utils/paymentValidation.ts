
export type PaymentFlowType = 'Payment' | 'Receiving';

export interface PaymentStatusMap {
  [key: string]: string;
}

export const PAYMENT_STATUS_LABELS: PaymentStatusMap = {
  Pending: '待付款',
  Partial: '部分付款',
  Paid: '已付款',
};

export const RECEIVING_STATUS_LABELS: PaymentStatusMap = {
  Pending: '待收款',
  Partial: '部分收款',
  Paid: '已收款',
};

/**
 * Middleware-like validator to ensure amount symbol matches the expected logic.
 * @param amount The settlement amount
 * @returns true if valid (logic consistent), but mostly used to determine flow type.
 */
export const validateAmountSymbol = (amount: number): boolean => {
  // Basic validation: amount shouldn't be NaN
  return !isNaN(amount);
};

/**
 * Determines the flow type based on amount.
 * Positive -> Payment Flow
 * Negative -> Receiving Flow
 */
export const getPaymentFlowType = (amount: number): PaymentFlowType => {
  return amount < 0 ? 'Receiving' : 'Payment';
};

/**
 * Simulates calling /api/payment/status to get the correct status label
 * @param amount 
 * @param currentStatus 
 * @returns 
 */
export const getStatusLabel = (amount: number, currentStatus: string): string => {
  const flowType = getPaymentFlowType(amount);
  const labels = flowType === 'Receiving' ? RECEIVING_STATUS_LABELS : PAYMENT_STATUS_LABELS;
  return labels[currentStatus] || currentStatus;
};

/**
 * Returns the display amount (absolute value if negative and paid)
 * Actually, for 'Paid Amount', if the settlement is negative (receiving), 
 * the 'Paid' amount is conceptually 'Received', which is positive in cash flow 
 * but might be represented as negative to match the sign of the settlement.
 * 
 * The user requirement: "When settlement amount is negative, paid amount shows negative value (format: -XXX.XX)"
 */
export const getDisplayPaidAmount = (settlementAmount: number, paidAmount: number): string => {
  const amount = paidAmount ?? 0;
  if (settlementAmount < 0) {
    // If settlement is negative (e.g. -1000), and we received 500, paidAmount might be stored as 500.
    // Display as -500.
    return `-${Math.abs(amount).toLocaleString()}`;
  }
  return `¥${amount.toLocaleString()}`;
};
