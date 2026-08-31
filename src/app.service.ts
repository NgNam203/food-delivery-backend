import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getAppInfo(): { service: string; docs: string } {
    return {
      service: 'food-delivery-backend',
      docs: '/api',
    };
  }
}
