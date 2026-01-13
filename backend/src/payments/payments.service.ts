import { Injectable } from '@nestjs/common';

@Injectable()
export class PaymentsService {
  mockPayment(payload: any) {
    return {
      status: 'captured',
      method: payload?.method ?? 'card',
      amount: payload?.amount ?? 0,
      gatewayRef: 'TEST-' + Math.random().toString(36).slice(2, 8)
    };
  }
}

