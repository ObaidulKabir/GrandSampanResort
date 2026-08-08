export type Suite = {
  id: string;
  floor: number;
  type: string;
  size: number;
  view: string;
  totalPrice: number;
  currency?: 'BDT';
};

export type SharePlan = {
  id: string;
  name: string;
  daysPerMonth: number;
  lockIn: number;
  price: number;
  revenueEntitlement: number;
  currency?: 'BDT';
  suiteId?: string;
  planStatus?: 'Unsold' | 'Reserved' | 'Booked' | 'Resale' | 'Transferred';
  planType?: 'FULL' | 'DPM';
  timeFraction?: number;
};

export type Investor = {
  id: string;
  email: string;
  name: string;
  kyc: boolean;
};

export type DepositMethod = 'cheque' | 'cash_payorder' | 'online_transfer';

export type BookingDepositPayment = {
  depositMethod: DepositMethod;
  depositReference: string;
  depositProofUrl?: string;
  depositNote?: string;
};

export type Booking = {
  id: string;
  suiteId: string;
  planId?: string;
  investorId?: string;
  /** KYC snapshot client id for investment purchases. */
  clientId?: string;
  start: string;
  end: string;
  status: string;
  amountTotal?: number;
  depositMethod?: DepositMethod | string;
  depositReference?: string;
  depositProofUrl?: string;
  depositNote?: string;
  depositSubmittedAt?: string;
  schedule?: PaymentScheduleItem[];
  currency?: 'BDT';
};

export type BookingKyc = {
  name: string;
  fatherName: string;
  nid: string;
  dob: string;
  address: string;
  permanentAddress: string;
  contact: string;
  email: string;
  picUrl: string;
  nomineeName: string;
  nomineeNid: string;
  nomineePicUrl: string;
};

export type PaymentScheduleItem = {
  id: string;
  bookingId: string;
  type: 'deposit' | 'downpayment' | 'installment';
  dueDate: string;
  amount: number;
  status: 'due' | 'paid' | 'overdue';
  gatewayRef?: string;
  currency?: 'BDT';
};

export type Client = {
  id: string;
  name: string;
  fatherName: string;
  nid: string;
  dob: string;
  address: string;
  permanentAddress: string;
  contact: string;
  email: string;
  picUrl: string;
  nomineeName: string;
  nomineeNid: string;
  nomineePicUrl: string;
};

export type MediaAsset = {
  id: string;
  category: string;
  label?: string | null;
  suiteId?: string | null;
  url: string;
  alt?: string | null;
  order: number;
  createdAt: Date;
};

export type FaqEntry = {
  id: string;
  question: string;
  answer: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
};

export type TermsParagraph = {
  id: string;
  title: string;
  body: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
};

export type Promotion = {
  id: string;
  name: string;
  discountPct: number;
  scope: 'all' | 'category' | 'plans';
  suiteTypes: string[];
  planIds: string[];
  startsAt: Date;
  endsAt: Date;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

