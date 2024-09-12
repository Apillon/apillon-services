import * as _ from 'lodash';
import { sign, verify, decode, Jwt } from 'jsonwebtoken';
import { env } from '../config/env';
import * as crypto from 'crypto';
import { JwtExpireTime } from '../config/types';
import { Readable } from 'stream';

export function isPlainObject(testVar: any): boolean {
  if (
    testVar === null ||
    testVar === undefined ||
    typeof testVar !== 'object' ||
    Array.isArray(testVar) ||
    typeof testVar?.getMonth === 'function'
  ) {
    return false;
  }
  return true;
}

export async function streamToString(
  stream: any,
  encoding: BufferEncoding,
): Promise<string> {
  const chunks = [];
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk: any) => chunks.push(Buffer.from(chunk)));
    stream.on('error', (err: any) => reject(err));
    stream.on('end', () => resolve(Buffer.concat(chunks).toString(encoding)));
  });
}

export async function streamToBuffer(stream: any) {
  const chunks = [];
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk: any) => chunks.push(Buffer.from(chunk)));
    stream.on('error', (err: any) => reject(err));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

/**
 * Runs tasks in parallel with workers
 *
 * @param {Array<any>} data array of data for tasks.
 * @param {number} workerCount number of parralel workers
 * @param {any} ctx
 * @param {(doc, ctx) => void} task task function gets document/element from array an context in params
 */
export async function runWithWorkers(
  data: Array<any>,
  workerCount: number,
  ctx: any,
  task: (doc, ctx) => void,
) {
  for (let i = 0; i < data.length; i++) {
    const workers = [];
    console.log(`COMPLETED=${i}/${data.length}`);
    for (let j = 0; j < workerCount; j++) {
      if (i >= data.length) {
        break;
      }
      const wDoc = data[i];
      const worker = async () => {
        const doc = _.cloneDeep(wDoc);
        await task.call(this, doc, ctx);
      };
      workers.push(worker());
      i++;
    }
    i--;
    if (workers.length) {
      await Promise.all(workers);
    }
  }
  console.log(`COMPLETED=${data.length}/${data.length}`);
}

export function objectIdFromDate(date: Date) {
  return `${Math.floor(date.getTime() / 1000).toString(16)}0000000000000000`;
}

export function dateFromObjectId(objectId: string) {
  return new Date(parseInt(objectId.substring(0, 8), 16) * 1000);
}

export function safeJsonParse(inputString: string, defaultResult = null) {
  try {
    return JSON.parse(inputString);
  } catch (err) {
    // console.warn('JSON parse failed and was handled by default value.');
  }
  return defaultResult;
}

export function isValidEmail(email: string) {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

/**
 * JWT token
 * @param subject
 * @param data
 * @param expiresIn default 1d, 'never', or pass numeric or string representation of timestamp
 * @param secret
 * @returns
 */
export function generateJwtToken(
  subject: string,
  data: object,
  expiresIn = JwtExpireTime.ONE_DAY,
  secret?: string,
) {
  if (!secret && !env.APP_SECRET) {
    throw new Error('APP_SECRET is not provided!');
  }

  if (!subject && !expiresIn) {
    return sign({ ...data }, secret || env.APP_SECRET);
  } else if (expiresIn == JwtExpireTime.NEVER) {
    return sign({ ...data }, secret || env.APP_SECRET, {
      subject,
    });
  }
  return sign({ ...data }, secret || env.APP_SECRET, {
    subject,
    expiresIn,
  });
}

export function parseJwtToken(subject: string, token: string, secret?: string) {
  if (!secret && !env.APP_SECRET) {
    throw new Error('APP_SECRET is not provided!');
  }

  return verify(token, secret ? secret : env.APP_SECRET, { subject }) as any;
}

export function decodeJwtToken(token: string) {
  return decode(token) as any;
}

export function dateToSqlString(date: Date): string {
  return date.toISOString().replace(/T/, ' ').replace(/Z/, '');
}

// DO NOT SET RETURN TYPE AS IT WILL MESS WITH CI/CD BUILD!
export function getFaker() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('@faker-js/faker').faker;
}

export function getEnumKey<TEnum>(
  enumerator: TEnum,
  value: TEnum[keyof TEnum],
): string | TEnum[keyof TEnum] {
  return Object.keys(enumerator).find((key) => enumerator[key] === value);
}

/**
 * Split array into multiple arrays (chunks)
 * @param arr source array
 * @param splitBy num of elements in chunk
 * @returns
 */
export function splitArray<T>(arr: T[], splitBy: number): T[][] {
  const cache = [];
  const tmp = [...arr];
  while (tmp.length) {
    cache.push(tmp.splice(0, splitBy));
  }
  return cache;
}

/**
 * Sort an object's keys alphabetically
 * @param obj - obj to sort
 */
export function sortObject(obj) {
  return Object.keys(obj)
    .sort()
    .reduce((result, key) => {
      result[key] =
        obj[key] && typeof obj[key] === 'object'
          ? sortObject(obj[key])
          : obj[key];
      return result;
    }, {});
}

export function isEVMWallet(walletAddress: string): boolean {
  const evmAddressRegex = /^(0x)?[0-9a-fA-F]{40}$/; // Regular expression for EVM addresses
  return evmAddressRegex.test(walletAddress);
}

export function generateRandomCode(
  length: number,
  characters: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%',
): string {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += characters.charAt(crypto.randomInt(0, characters.length));
  }
  return code;
}

const htmlCheckRegex =
  /<(html|head|body|div|span|p|a|table|tr|td|img|ul|li|ol|form|input|button|script|style|link|meta)(\s.*?|)>(.*?)<\/\1>/is;
const PDF_SIGNATURE = Buffer.from([0x25, 0x50, 0x44, 0x46]);

export async function isStreamHtmlFile(fileStream: Readable) {
  return new Promise<boolean>((resolve, reject) => {
    let data = '';
    let isInitialChunk = true;
    fileStream.setEncoding('utf8');
    fileStream.on('data', (chunk: string) => {
      data = chunk.trim();
      if (isInitialChunk) {
        if (
          Buffer.from(data.slice(0, PDF_SIGNATURE.length)).equals(PDF_SIGNATURE)
        ) {
          // PDF File is detected, no need to check html tags
          fileStream.destroy();
          resolve(false);
          return;
        }
        isInitialChunk = false;
      }
      // Regex that checks if data is has <something> or <something/>
      if (htmlCheckRegex.test(data)) {
        fileStream.destroy();
        resolve(true);
        return;
      }
    });
    fileStream.on('end', () => {
      resolve(false);
    });

    fileStream.on('error', (err) => {
      reject(err);
    });
  });
}
