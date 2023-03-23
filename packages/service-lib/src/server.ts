/**
 * development socket server for services
 */

import * as Net from 'net';

export function startDevServer(
  handler: any,
  serviceName: string,
  port: number,
) {
  console.log('starting Dev socket server...');
  const server = Net.createServer((socket) => {
    socket.on('data', async (chunk) => {
      console.log(
        `${serviceName} Socket server request: ${JSON.stringify(
          JSON.parse(chunk.toString()),
        )}`,
      );
      try {
        const result = await handler(JSON.parse(chunk.toString()), {} as any);
        socket.write(JSON.stringify(result));
        socket.end();
        console.log(
          `${serviceName} Socket server response: ${JSON.stringify(result)}`,
        );
      } catch (err) {
        console.error(`${serviceName} Socket server ERROR:`);
        console.error(err);
        socket.end();
      }
    });
    // When the client requests to end the TCP connection with the server, the server
    // ends the connection.
    socket.on('end', function () {
      console.log(`${serviceName}: Closing connection with the client`);
    });

    // ERROR
    socket.on('error', function (err) {
      console.log(`${serviceName}: Error: ${err}`);
    });
  });

  server.listen(port, () => {
    console.log(
      `${serviceName}: Socket server listening for connection requests on socket localhost:${port}`,
    );
  });
}
