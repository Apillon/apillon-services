/**
 * development socket server for service
 */

import { AppEnvironment, env } from 'at-lib';
import * as Net from 'net';
import { handler } from './handler';

const port =
  env.APP_ENV === AppEnvironment.TEST
    ? env.AT_LMAS_SOCKET_PORT_TEST
    : env.AT_LMAS_SOCKET_PORT;

function startDevServer() {
  const server = Net.createServer((socket) => {
    socket.on('data', async (chunk) => {
      console.log(
        `LMAS Socket server request: ${JSON.stringify(
          JSON.parse(chunk.toString()),
        )}`,
      );
      try {
        const result = await handler(JSON.parse(chunk.toString()), {} as any);
        if (result) {
          socket.write(JSON.stringify(result));
          console.log(`LMAS Socket server response: ${result.toString()}`);
        }
        socket.end();
        console.log(`LMAS Socket server finished with no response.`);
      } catch (err) {
        console.error('LMAS Socket server ERROR:');
        console.error(err);
        socket.end();
      }
    });
    // When the client requests to end the TCP connection with the server, the server
    // ends the connection.
    socket.on('end', function () {
      console.log('LMAS: Closing connection with the client');
    });

    // ERROR
    socket.on('error', function (err) {
      console.log(`LMAS: Error: ${err}`);
    });
  });

  server.listen(port, () => {
    console.log(
      `LMAS: Socket server listening for connection requests on socket localhost:${port}`,
    );
  });
}

if (
  [AppEnvironment.LOCAL_DEV, AppEnvironment.TEST].includes(
    env.APP_ENV as AppEnvironment,
  )
) {
  startDevServer();
} else {
  console.log(`LMAS: ${env.APP_ENV} - Socket server will not run.`);
}
