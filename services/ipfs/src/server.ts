/**
 * development socket server for service
 */

import { AppEnvironment, env } from 'at-lib';
import * as Net from 'net';
import { handler } from './handler';

const port = env.AT_STORAGE_SOCKET_PORT;

function startDevServer() {
  const server = Net.createServer((socket) => {
    socket.on('data', async (chunk) => {
      console.log(
        `IPFS Socket server request: ${JSON.stringify(
          JSON.parse(chunk.toString()),
        )}`,
      );
      try {
        const result = await handler(JSON.parse(chunk.toString()), {} as any);
        if (result) {
          socket.write(JSON.stringify(result));
          console.log(`IPFS Socket server response: ${result.toString()}`);
        }
        socket.end();
        console.log(`IPFS Socket server finished with no response.`);
      } catch (err) {
        console.error('IPFS Socket server ERROR:');
        console.error(err);
        socket.end();
      }
    });
    // When the client requests to end the TCP connection with the server, the server
    // ends the connection.
    socket.on('end', function () {
      console.log('IPFS: Closing connection with the client');
    });

    // ERROR
    socket.on('error', function (err) {
      console.log(`IPFS: Error: ${err}`);
    });
  });

  server.listen(port, () => {
    console.log(
      `IPFS: Socket server listening for connection requests on socket localhost:${port}`,
    );
  });
}

if (env.APP_ENV === AppEnvironment.LOCAL_DEV) {
  startDevServer();
} else {
  console.log(`IPFS: ${env.APP_ENV} - Socket server will not run.`);
}
