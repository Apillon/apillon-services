/**
 * development socket server for service
 */

import { AppEnvironment, env } from '@apillon/lib';
import * as Net from 'net';
import { handler } from './handler';

const port =
  env.APP_ENV === AppEnvironment.TEST
    ? env.BLOCKCHAIN_SOCKET_PORT_TEST
    : env.BLOCKCHAIN_SOCKET_PORT;

export function startDevServer() {
  console.log('starting Dev socket server...');
  const server = Net.createServer((socket) => {
    socket.on('data', async (chunk) => {
      console.log(
        `Blockchain Socket server request: ${JSON.stringify(
          JSON.parse(chunk.toString()),
        )}`,
      );
      try {
        const result = await handler(JSON.parse(chunk.toString()), {} as any);
        socket.write(JSON.stringify(result));
        socket.end();
        console.log(
          `Blockchain Socket server response: ${JSON.stringify(result)}`,
        );
      } catch (err) {
        console.error('Blockchain Socket server ERROR:');
        console.error(err);
        socket.end();
      }
    });
    // When the client requests to end the TCP connection with the server, the server
    // ends the connection.
    socket.on('end', function () {
      console.log('Blockchain: Closing connection with the client');
    });

    // ERROR
    socket.on('error', function (err) {
      console.log(`Blockchain: Error: ${err}`);
    });
  });

  server.listen(port, () => {
    console.log(
      `Blockchain: Socket server listening for connection requests on socket localhost:${port}`,
    );
  });
}
