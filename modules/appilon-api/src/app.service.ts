import { Injectable } from '@nestjs/common';
import { Ams, Lmas, LogType } from 'at-lib';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World from appilon-api!';
  }
}
