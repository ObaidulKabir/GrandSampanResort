import { Injectable } from '@nestjs/common';

@Injectable()
export class SuitesService {
  list() {
    return [
      { id: 'S-101', floor: 1, type: 'Standard', size: '28m²', view: 'Ocean', totalPrice: 120000 },
      { id: 'S-202', floor: 2, type: 'Deluxe', size: '32m²', view: 'Ocean', totalPrice: 160000 }
    ];
  }
}

