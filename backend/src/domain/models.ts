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

export type Booking = {
  id: string;
  suiteId: string;
  planId?: string;
  investorId?: string;
  start: string;
  end: string;
  status: string;
  amountTotal?: number;
  schedule?: PaymentScheduleItem[];
  currency?: 'BDT';
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

