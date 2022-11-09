import type { Request } from 'express';
import { Context } from '@apillon/lib';

export interface IRequest extends Request {
  context: Context;
  query: { [key: string]: undefined | string };
}
