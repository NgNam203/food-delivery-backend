import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Get application metadata' })
  @ApiOkResponse({
    description: 'Application metadata; does not check dependency readiness.',
    schema: {
      type: 'object',
      required: ['service', 'docs'],
      properties: {
        service: { type: 'string', example: 'food-delivery-backend' },
        docs: { type: 'string', example: '/api' },
      },
    },
  })
  getAppInfo() {
    return this.appService.getAppInfo();
  }
}
