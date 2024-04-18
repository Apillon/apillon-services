import { safeJsonParse } from '@apillon/lib';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const IpAddress = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();

    const gatewayEvent = safeJsonParse(
      decodeURI(request.headers['x-apigateway-event'] as string),
    );
    return (
      request.ip ||
      gatewayEvent?.requestContext?.identity?.sourceIp ||
      request.headers['x-forwarded-for']?.split(',')?.[0]
    );
  },
);
