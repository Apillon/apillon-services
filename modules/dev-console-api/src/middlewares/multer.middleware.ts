import { Injectable, NestMiddleware } from '@nestjs/common';
import * as multer from 'multer';

@Injectable()
export class MulterMiddleware implements NestMiddleware {
  private readonly upload = multer().any();

  use(req: any, res: any, next: (arg?: any) => void) {
    this.upload(req, res, (err: any) => {
      if (err) {
        return next(err);
      }
      next();
    });
  }
}
