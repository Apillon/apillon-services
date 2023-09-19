import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { AdvancedSQLModel, SerializeFor } from '@apillon/lib';
import { map, Observable } from 'rxjs';
import { IRequest } from '@apillon/modules-lib';
import { keysToCamel } from '../utils/snake-to-camel-case-keys';

/**
 * API response type definition.
 */
export interface ApiResponse {
  id: string;
  status: number;
  data?: any;
  meta?: any;
}

/**
 * Response interceptor used for formatting every response from the API.
 */
@Injectable()
export class ApillonApiResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map(async (data) => {
        const req = context.switchToHttp().getRequest<IRequest>();
        const res = context.switchToHttp().getResponse<IRequest>() as any;

        const response: ApiResponse = {
          id: req?.context?.requestId,
          status: res.statusCode,
        };

        let responseData = data;
        if (data?.meta && data?.data) {
          responseData = data.data;
          response.meta = data.meta;
        }

        response.data = keysToCamel(responseData);

        return response;
      }),
    );
  }
}
