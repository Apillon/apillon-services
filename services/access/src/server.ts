/**
 * development socket server for service
 */

import { AppEnvironment, env } from 'at-lib';
import * as Net from 'net';
import { processEvent } from './handler';

const port = env.AT_AMS_SOCKET_PORT;

function startDevServer() {
  const server = Net.createServer((socket) => {
    socket.on('data', async (chunk) => {
      console.log(
        `AMS Socket server request: ${JSON.stringify(
          JSON.parse(chunk.toString()),
        )}`,
      );
      try {
        const result = await processEvent(JSON.parse(chunk.toString()), null);
        socket.write(JSON.stringify(result));
        socket.end();
        console.log(`AMS Socket server response: ${result.toString()}`);
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

if (env.APP_ENV === AppEnvironment.LOCAL_DEV) {
  startDevServer();
} else {
  console.log(`AMS: ${env.APP_ENV} - Socket server will not run.`);
}
