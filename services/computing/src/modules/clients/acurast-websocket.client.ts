import { AcurastClient, Message, KeyPair } from '@acurast/dapp';
import { env, getSecrets } from '@apillon/lib';
import { createECDH } from 'crypto';

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
    await client.start(await this.getWebsocketKeypair());

    console.info(`Sending message to acurast processor ${jobPublicKey}`);

    const websocketPromise = new Promise((resolve, reject) => {
      client.onMessage((message: Message) => {
        // resolve({
        //   sender: Buffer.from(message.sender).toString('hex'),
        //   recipient: Buffer.from(message.recipient).toString('hex'),
        //   response: Buffer.from(message.payload).toString(),
        // });
        resolve(Buffer.from(message.payload).toString());
        client.close();
      });

      try {
        client.send(jobPublicKey, payload);
      } catch (error) {
        reject(error);
      }
    });

    const timeoutPromise = new Promise((_, reject): void => {
      setTimeout(
        () => reject(new Error('The Acurast websocket request timed out.')),
        30_000,
      );
    });

    // Return the promise that fulfills first
    return await Promise.race([websocketPromise, timeoutPromise]);
  }

  /**
   * Acurast websockets require a private-public keypair for source identification
   * Get secret key from secrets, obtain public key from it and return
   * @returns {Promise<KeyPair>}
   */
  private async getWebsocketKeypair(): Promise<KeyPair> {
    const secretKey = (await getSecrets(env.BLOCKCHAIN_SECRETS))
      .ACURAST_WEBSOCKET_SECRET;

    const ecdh = createECDH('prime256v1');
    ecdh.setPrivateKey(Buffer.from(secretKey, 'hex'));
    const publicKey = ecdh.getPublicKey().toString('hex');

    return { secretKey, publicKey };
  }
}
