import { Injectable } from '@nestjs/common';
import { Ams, Lmas, LogType } from '@apillon/lib';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }
}
