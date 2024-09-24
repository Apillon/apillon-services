export enum DbTables {
  RPC_API_KEY = 'rpc_api_key',
  RPC_URL = 'rpc_url',
  DWELLIR_USER = 'dwellir_user',
}

export enum InfrastructureErrorCode {
  // 400 - Bad Request
  MAX_RPC_KEYS_REACHED = 40020001,
  // 422 - Unprocessable Entity
  RPC_API_KEY_NAME_NOT_PRESENT = 42220001,
  RPC_API_KEY_API_KEY_NOT_PRESENT = 42220002,
  RPC_API_KEY_PROJECT_UUID_NOT_PRESENT = 42220003,
  RPC_URL_NAME_NOT_PRESENT = 42220004,
  RPC_URL_CHAIN_NAME_NOT_PRESENT = 42220005,
  RPC_URL_NETWORK_NOT_PRESENT = 42220006,
  RPC_URL_HTTPS_URL_NOT_PRESENT = 42220007,
  RPC_URL_WSS_URL_NOT_PRESENT = 42220008,
  RPC_URL_API_KEY_ID_NOT_PRESENT = 42220009,
  RPC_URL_CHAIN_NOT_FOUND = 42220010,
  RPC_URL_NETWORK_NOT_FOUND = 42220011,
  RPC_URL_URLS_NOT_PRESENT = 42220012,
  RPC_API_KEY_USAGE_NOT_FOUND = 42220013,

  // 401 - Unauthorized
  USER_IS_NOT_AUTHORIZED = 40120001,

  // 404 - Not Found
  RPC_API_KEY_NOT_FOUND = 40420001,
  RPC_URL_NOT_FOUND = 40420002,
  DWELLIR_ID_NOT_FOUND = 40420003,
}

export type DwellirGetAccessTokenResponse = {
  access_token: string;
  token_type: string;
};

export type DwellirCreateUserResponse = {
  id: string;
  email: string;
  name: string;
};

export type DwellirCreateApiKeyResponse = {
  id: number;
  api_key: string;
};

export type DwellirGetApiKeyResponse = DwellirCreateApiKeyResponse;

export type DwellirGetEndpointsResponse = {
  id: number;
  name: string;
  networks: {
    id: number;
    name: string;
    nodes: {
      id: number;
      https: string;
      wss: string;
      node_type: string;
      type: string;
      version: string;
    }[];
    type: string;
    version: string;
  }[];
}[];

export type DwellirGetUsageResponse = {
  total_requests: number;
  total_response: number;
  by_key: Record<
    string,
    Record<
      string,
      {
        responses: number;
        requests: number;
        by_method: Record<string, { requests: number; responses: number }>;
      }
    >
  >;
};
