/**
 * development socket server for service
 */

import { AppEnvironment, env } from 'at-lib';
import * as Net from 'net';
import { handler } from './handler';

const port =
  env.APP_ENV === AppEnvironment.TEST
    ? env.AT_AMS_SOCKET_PORT_TEST
    : env.AT_AMS_SOCKET_PORT;

export function startDevServer() {
  console.log('starting Dev socket server...');
  const server = Net.createServer((socket) => {
    socket.on('data', async (chunk) => {
      console.log(
        `AMS Socket server request: ${JSON.stringify(
          JSON.parse(chunk.toString()),
        )}`,
      );
      try {
        const result = await handler(JSON.parse(chunk.toString()), {} as any);
        socket.write(JSON.stringify(result));
        socket.end();
        console.log(`AMS Socket server response: ${JSON.stringify(result)}`);
      } catch (err) {
        console.error('AMS Socket server ERROR:');
        console.error(err);
        socket.end();
      }
    });
    // When the client requests to end the TCP connection with the server, the server
    // ends the connection.
    socket.on('end', function () {
      console.log('AMS: Closing connection with the client');
    });

    // ERROR
    socket.on('error', function (err) {
      console.log(`AMS: Error: ${err}`);
    });
  });

  server.listen(port, () => {
    console.log(
      `AMS: Socket server listening for connection requests on socket localhost:${port}`,
    );
  });
}
