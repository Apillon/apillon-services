import * as https from 'https';
import * as http from 'http';

export async function testNet(event, _context) {
  const url = event.url || 'https://www.google.com';

  if (/^https/.test(url)) {
    return await new Promise((resolve, reject) => {
      try {
        https.get(url, (response) => {
          console.log(response);
          resolve(true);
        });
      } catch (err) {
        reject(err);
      }
    });
  } else {
    return await new Promise((resolve, reject) => {
      try {
        http.get(url, (response) => {
          console.log(response);
          resolve(true);
        });
      } catch (err) {
        reject(err);
      }
    });
  }
}
