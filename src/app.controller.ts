import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello() {
    return this.appService.sendMessage('Mensaje enviada a la cola');
  }

  @Get('receive-messages')
  async receiveMessages(): Promise<void> {
    return await this.appService.receiveMessage();
  }
}
