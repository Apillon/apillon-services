import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const Ctx = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.context;
  },
);
