/**
 * development socket server for service
 */

import { AppEnvironment, env } from '@apillon/lib';
import * as Net from 'net';
import { handler } from './handler';

const port =
  env.APP_ENV === AppEnvironment.TEST
    ? env.STORAGE_SOCKET_PORT_TEST
    : env.STORAGE_SOCKET_PORT;

export function startDevServer() {
  const server = Net.createServer((socket) => {
    socket.on('data', async (chunk) => {
      console.log(
        `STORAGE Socket server request: ${JSON.stringify(
          JSON.parse(chunk.toString()),
        )}`,
      );
      try {
        const result = await handler(JSON.parse(chunk.toString()), {} as any);
        if (result) {
          socket.write(JSON.stringify(result));
          console.log(`STORAGE Socket server response: ${result.toString()}`);
        }
        socket.end();
        console.log(`STORAGE Socket server finished with no response.`);
      } catch (err) {
        console.error('STORAGE Socket server ERROR:');
        console.error(err);
        socket.end();
      }
    });
    // When the client requests to end the TCP connection with the server, the server
    // ends the connection.
    socket.on('end', function () {
      console.log('STORAGE: Closing connection with the client');
    });

    // ERROR
    socket.on('error', function (err) {
      console.log(`STORAGE: Error: ${err}`);
    });
  });

  server.listen(port, () => {
    console.log(
      `STORAGE: Socket server listening for connection requests on socket localhost:${port}`,
    );
  });
}
