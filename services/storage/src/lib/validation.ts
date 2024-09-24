import { Readable } from 'stream';
import filetype from 'magic-bytes.js';

const htmlCheckRegex =
  /<(html|head|body|div|span|p|a|table|tr|td|img|ul|li|ol|form|input|button|script|style|link|meta)(\s.*?|)>(.*?)<\/\1>/is;

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
      // Regex that checks if data has <something> or <something/>
      if (htmlCheckRegex.test(chunk)) {
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
