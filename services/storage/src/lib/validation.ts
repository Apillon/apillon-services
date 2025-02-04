import { Readable } from 'stream';
import filetype from 'magic-bytes.js';

const htmlTagStartRegex =
  /<\s*(html|head|script|body|div|span|p|a|table|tr|td|img|ul|li|ol|form|input|button|style|link|meta)\s/i;

export async function isStreamHtmlFile(fileStream: Readable) {
  return new Promise<boolean>((resolve, reject) => {
    let isInitialChunk = true;
    fileStream.on('data', (chunk) => {
      if (isInitialChunk) {
        const fileType = filetype(chunk);
        if (fileType.length) {
          // Images, pdfs & other binary files have the type detected, so we can skip them
          fileStream.destroy();
          resolve(false);
          return;
        }
        isInitialChunk = false;
      }
      // Regex that checks if data has <html or other html tags
      if (htmlTagStartRegex.test(chunk)) {
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
