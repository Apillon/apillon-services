import { env } from '@apillon/lib';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { createHmac } from 'crypto';

@Injectable()
export class GithubWebhookGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request: {
      headers: {
        'x-hub-signature-256': string;
      };
      body: GithubWebhookGuard;
    } = context.switchToHttp().getRequest();

    const digest = createHmac('sha256', env.GITHUB_WEBHOOK_SECRET)
      .update(JSON.stringify(request.body))
      .digest('hex');

    return request.headers['x-hub-signature-256'] === `sha256=${digest}`;
  }
}
