import { AcurastClient, Message } from '@acurast/dapp';

export class AcurastWebsocketClient {
  private readonly websocketEndpoint: string;

  constructor(websocketEndpoint: string) {
    this.websocketEndpoint = websocketEndpoint;
  }

  /**
   * Send a payload to a processor by public key and return back the response
   * @param {string} jobPublicKey
   * @param {(string | Uint8Array)} payload
   */
  async send(jobPublicKey: string, payload: string | Uint8Array): Promise<any> {
    const client = new AcurastClient(this.websocketEndpoint);
    await client.start(await this.generateKeypair());

    const websocketPromise = new Promise((resolve, reject) => {
      client.onMessage((message: Message) => {
        resolve({
          sender: Buffer.from(message.sender).toString('hex'),
          recipient: Buffer.from(message.recipient).toString('hex'),
          payload: Buffer.from(message.payload).toString(),
        });
        client.close();
      });

      try {
        client.send(jobPublicKey, JSON.stringify(payload));
      } catch (error) {
        reject(error);
      }
    });

    const timeoutPromise = new Promise((_, reject): void => {
      setTimeout(
        () => reject(new Error('The Acurast websocket request timed out.')),
        15_000,
      );
    });

    return await Promise.race([websocketPromise, timeoutPromise]);
  }

  private async generateKeypair() {
    const keyPair = await crypto.subtle.generateKey(
      { name: 'ECDSA', namedCurve: 'P-256' },
      true,
      ['sign'],
    );

    const [secretKey, publicKey] = await Promise.all([
      crypto.subtle
        .exportKey('jwk', keyPair.privateKey)
        .then((jwk) => Buffer.from(jwk.d, 'base64').toString('hex')),
      crypto.subtle
        .exportKey('raw', keyPair.publicKey)
        .then((arrayBuffer) => Buffer.from(arrayBuffer).toString('hex')),
    ]);

    return { secretKey, publicKey };
  }
}
