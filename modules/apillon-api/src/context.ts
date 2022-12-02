import { Ams, Context } from '@apillon/lib';

export class ApillonApiContext extends Context {
  /**
   * Validate API key and fill context apiKey property
   */
  async authenticate(apiKey: string, apiKeySecret: string) {
    const apiKeyData = await new Ams(this).getApiKey({
      apiKey: apiKey,
      apiKeySecret: apiKeySecret,
    });

    if (apiKeyData && apiKeyData.data.id) {
      this.apiKey = apiKeyData.data;
    }
  }

  isApiKeyValid() {
    return this.apiKey && this.apiKey?.id;
  }
}
