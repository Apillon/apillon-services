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
    let messageReceived = '';
    socket.on('data', async (chunk) => {
      messageReceived += chunk.toString();
      if (messageReceived.endsWith('</EOF>')) {
        messageReceived = messageReceived.replace('</EOF>', '');
        console.log(
          `${serviceName} Socket server request: ${JSON.stringify(
            JSON.parse(messageReceived),
          )}`,
        );

        try {
          const result = await handler(
            JSON.parse(messageReceived.toString()),
            {} as any,
          );
          socket.write(`${JSON.stringify(result)}</EOF>`);
          messageReceived = '';
          socket.end();
          console.log(
            `${serviceName} Socket server response: ${JSON.stringify(result)}`,
          );
        } catch (err) {
          console.error(`${serviceName} Socket server ERROR:`);
          console.error(err);
          socket.end();
          messageReceived = '';
        }
      } else {
        console.log(
          `${serviceName} Socket server partial data received: ${messageReceived} `,
        );
      }
    });
    // When the client requests to end the TCP connection with the server, the server
    // ends the connection.
    socket.on('end', function () {
      console.log(`${serviceName}: Closing connection with the client`);
      messageReceived = '';
    });

    // ERROR
    socket.on('error', function (err) {
      console.log(`${serviceName}: Error: ${err}`);
      messageReceived = '';
    });
  });

  server.listen(port, '127.0.0.1', () => {
    console.log(
      `${serviceName}: Socket server listening for connection requests on socket localhost:${port}`,
    );
  });
}
