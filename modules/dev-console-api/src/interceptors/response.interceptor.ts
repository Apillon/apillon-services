import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { AdvancedSQLModel, SerializeFor } from 'at-lib';
import { map, Observable } from 'rxjs';
import { IRequest } from '../middlewares/context.middleware';

/**
 * API response type definition.
 */
export interface ApiResponse {
  status: number;
  data?: any;
  meta?: any;
}

/**
 * Response interceptor used for formatting every response from the API.
 */
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map(async (data) => {
        const req = context.switchToHttp().getRequest<IRequest>();
        const res = context.switchToHttp().getResponse<IRequest>();
        const isAdmin = true; //req.context.isAuthenticated() && (await req.context.hasRole(DefaultUserRole.SUPER_ADMIN));

        const response: ApiResponse = {
          status: res.statusCode,
        };

        let responseData = data;
        if (data?.meta && data?.data) {
          responseData = data.data;
          response.meta = data.meta;
        }

        if (responseData instanceof AdvancedSQLModel) {
          response.data = {
            ...responseData.serialize(SerializeFor.PROFILE),
            ...(isAdmin ? responseData.serialize(SerializeFor.ADMIN) : {}),
          };
        } else if (Array.isArray(responseData)) {
          response.data = responseData.map((d) =>
            d instanceof AdvancedSQLModel
              ? {
                  ...d.serialize(SerializeFor.PROFILE),
                }
              : d,
          );
        } else {
          response.data = responseData;
        }

        return response;
      }),
    );
  }
}
