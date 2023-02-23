import { Controller, Get } from '@nestjs/common';
import { Ctx } from '@apillon/modules-lib';
import { ApillonApiContext } from '../../context';
import { AuthService } from './authentication.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Get('session')
  async getSession(@Ctx() context: ApillonApiContext) {
    return await this.authService.generateSession(context);
  }
}
