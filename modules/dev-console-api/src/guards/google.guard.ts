import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GoogleGuard extends AuthGuard('google') {
  constructor() {
    super({
      prompt: 'select_account',
    });
  }
}
