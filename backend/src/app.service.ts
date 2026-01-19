import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  brand() {
    return {
      colors: {
        ocean: '#0E3A5A',
        gold: '#D4AF37',
        pearl: '#F8F8F6',
        sunset: '#FF7A3D'
      }
    };
  }
}

