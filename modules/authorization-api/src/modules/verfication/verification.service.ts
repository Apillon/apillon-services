import {} from '@apillon/lib';
import { HttpStatus, Injectable } from '@nestjs/common';
import { AuthorizationApiContext } from '../../context';

@Injectable()
export class VerificationService {
  async sendVerificationEmail(context: AuthorizationApiContext): Promise<any> {
    return HttpStatus.OK;
  }
}
