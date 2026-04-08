import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Service health check' })
  @ApiOkResponse({
    description: 'API is running',
    schema: {
      example: {
        status: 'ok',
        service: 'autoflow-api',
      },
    },
  })
  getHealth() {
    return this.appService.getHealth();
  }
}
