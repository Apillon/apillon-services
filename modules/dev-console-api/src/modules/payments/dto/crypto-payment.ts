export interface CryptoPayment {
  payment_id: number;
  parent_payment_id: number;
  invoice_id: null | string;
  payment_status:
    | 'waiting'
    | 'confirming'
    | 'confirmed'
    | 'finished'
    | 'sending'
    | 'partially_paid'
    | 'failed';
  pay_address: string;
  payin_extra_id: null | string;
  price_amount: number;
  price_currency: string;
  pay_amount: number;
  actually_paid: number;
  actually_paid_at_fiat: number;
  pay_currency: string;
  order_id: null | string;
  order_description: null | string;
  purchase_id: string;
  outcome_amount: number;
  outcome_currency: string;
  payment_extra_ids: null | string;
  fee: {
    currency: string;
    depositFee: number;
    withdrawalFee: number;
    serviceFee: number;
  };
}

export interface CryptoPaymentInvoice {
  id: string;
  token_id: string;
  order_id: string;
  order_description: string;
  price_amount: string;
  price_currency: string;
  pay_currency: string;
  ipn_callback_url: string;
  invoice_url: string;
  success_url: string;
  cancel_url: string;
  partially_paid_url: string | null;
  payout_currency: string | null;
  created_at: string;
  updated_at: string;
  is_fixed_rate: boolean;
  is_fee_paid_by_user: boolean;
}
