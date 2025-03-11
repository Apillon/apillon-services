export type Merge<T, K> = Omit<T, keyof K> & K;

export enum ChainType {
  SUBSTRATE = 1,
  EVM = 2,
}

export enum TransactionStatus {
  PENDING = 1,
  CONFIRMED = 2,
  FAILED = 3,
  ERROR = 4,
}

export enum DeploymentBuildStatus {
  PENDING = 1,
  IN_PROGRESS = 2,
  SUCCESS = 3,
  FAILED = 4,
}

export enum SubstrateChain {
  CRUST = 1,
  KILT = 2,
  PHALA = 4,
  POLKADOT = 5,
  SUBSOCIAL = 6,
  XSOCIAL = 7,
  ASTAR = 8,
  ACURAST = 9,
  HYDRATION = 10,
  UNIQUE = 11,
}

export enum EvmChain {
  ETHEREUM = 1,
  SEPOLIA = 11155111,
  MOONBEAM = 1284,
  MOONBASE = 1287,
  ASTAR_SHIBUYA = 81, // testnet
  ASTAR = 592,
  OASIS_TESTNET = 42262,
  OASIS_SAPPHIRE = 23294,
  ALFAJORES = 44787, // Celo testnet
  CELO = 42220,
  BASE = 8453,
  BASE_SEPOLIA = 84532,
  ARBITRUM_ONE = 42161,
  ARBITRUM_ONE_SEPOLIA = 421614,
  AVALANCHE = 43114,
  AVALANCHE_FUJI = 43113,
  OPTIMISM = 10,
  OPTIMISM_SEPOLIA = 11155420,
  POLYGON = 137,
  POLYGON_AMOY = 80002,
}

export const ENTERPRISE_USER_EVM_CHAINS = [
  EvmChain.ETHEREUM,
  EvmChain.SEPOLIA,
  EvmChain.CELO,
  EvmChain.ALFAJORES,
  EvmChain.BASE,
  EvmChain.BASE_SEPOLIA,
  EvmChain.ARBITRUM_ONE,
  EvmChain.ARBITRUM_ONE_SEPOLIA,
  EvmChain.AVALANCHE,
  EvmChain.AVALANCHE_FUJI,
  EvmChain.OPTIMISM,
  EvmChain.OPTIMISM_SEPOLIA,
  EvmChain.POLYGON,
  EvmChain.POLYGON_AMOY,
];

export enum NFTCollectionType {
  GENERIC = 1,
  NESTABLE = 2,
}

export enum SmartContractType {
  OTHER = 1,
  ERC_20 = 2,
  ERC_721 = 3,
  ERC_1155 = 4,
}

export enum SmartContractVariant {
  GENERIC_ERC_721_ = 1,
  NESTABLE_ERC_721 = 2,
}

export enum ComputingContractType {
  SCHRODINGER = 1,
}

export enum AmsEventType {
  USER_REGISTER = 'user-register',
  USER_GET_AUTH = 'user-get-auth',
  USER_LOGIN = 'user-login',
  USER_LOGOUT = 'user-logout',
  USER_LOGIN_KILT = 'user-login-kilt',
  USER_WALLET_LOGIN = 'user-wallet-login',
  USER_UPDATE = 'user-update',
  USER_PASSWORD_RESET = 'user-password-reset',
  USER_ROLE_ASSIGN = 'user-role-assign',
  USER_ROLE_REMOVE = 'user-role-remove',
  USER_GET_LOGINS = 'user-get-logins',
  USER_GET_ROLES = 'user-get-roles',
  USER_SET_STATUS = 'user-set-status',
  AUTH_TOKEN_CREATE_UPDATE_TOKEN = 'auth-token-create-update-token',
  USER_EMAIL_EXISTS = 'user-email-exists',
  GET_AUTH_USER_BY_EMAIL = 'get-auth-user-by-email',
  CREATE_API_KEY = 'create-api-key',
  DELETE_API_KEY = 'delete-api-key',
  LIST_API_KEYS = 'list-api-keys',
  API_KEY_ROLE_ASSIGN = 'api-key-role-assign',
  API_KEY_ROLE_REMOVE = 'api-key-role-remove',
  API_KEY_ROLES_REMOVE_BY_SERVICE = 'api-key-roles-remove-by-service',
  GET_API_KEY_ROLES = 'get-api-key-roles',
  GET_API_KEY = 'get-api-key',
  API_KEYS_IN_PROJECT_UPDATE = 'update-api-keys-in-project',
  DISCORD_LINK = 'discord-link',
  DISCORD_UNLINK = 'discord-unlink',
  DISCORD_USER_LIST = 'discord-user-list',
  GET_OAUTH_LINKS = 'get-oauth-links',
  GET_PROJECT_OWNER = 'get-project-owner',
}

export enum LmasEventType {
  WRITE_LOG = 'write-log',
  WRITE_REQUEST_LOG = 'write-request-log',
  SEND_ALERT = 'send-alert',
  SEND_ADMIN_ALERT = 'send-admin-alert',
  NOTIFY = 'notify',

  LIST_LOGS = 'list-logs',
  LIST_REQUEST_LOGS = 'list-request-logs',
  GET_API_KEYS_USAGE_COUNT = 'get-api-keys-usage-count',
  GET_IPFS_TRAFFIC = 'get-ipfs-traffic',
  GET_TOTAL_REQUESTS = 'get-total-requests',

  SEND_MESSAGE_TO_SLACK = 'send-message-to-slack',

  SAVE_CLOUD_FUNCTION_CALL = 'save-cloud-function-call',
  GET_CLOUD_FUNCTION_USAGE = 'get-cloud-function-usage',
}

export enum BlockchainEventType {
  SUBSTRATE_SIGN_TRANSACTION = 'substrate-sign-transaction',
  SUBSTRATE_GET_TRANSACTION = 'substrate-get-transaction',
  GET_PHALA_CLUSTER_DEPOSIT_TRANSACTION = 'get-phala-cluster-deposit-transaction',
  EVM_SIGN_TRANSACTION = 'evm-sign-transaction',
  EVM_GET_TRANSACTION = 'evm-get-transaction',
  GET_CHAIN_ENDPOINT = 'get-chain-endpoint',
  LIST_WALLETS = 'list-wallets',
  GET_WALLETS = 'get-wallets',
  GET_WALLET = 'get-wallet',
  UPDATE_WALLET = 'update-wallet',
  GET_WALLET_TRANSACTIONS = 'get-wallet-transactions',
  UPDATE_TRANSACTION = 'update-transaction',
  LIST_WALLET_DEPOSITS = 'list-wallet-deposits',
  GET_TOTAL_WALLET_TRANSACTIONS = 'get-total-wallet-transactions',
  CREATE_OASIS_SIGNATURE = 'create-oasis-signature',
  LIST_CONTRACTS = 'list-contracts',
  GET_CONTRACT = 'get-contract',
}

export enum StorageEventType {
  REQUEST_S3_SIGNED_URLS_FOR_UPLOAD = 'request-s3-signed-urls-for-upload',
  REQUEST_S3_SIGNED_URLS_FOR_WEBSITE_UPLOAD = 'request-s3-signed-urls-for-website-upload',
  END_FILE_UPLOAD_SESSION = 'end-file-upload-session',
  END_FILE_UPLOAD = 'end-file-upload',
  CREATE_BUCKET = 'create-bucket',
  UPDATE_BUCKET = 'update-bucket',
  DELETE_BUCKET = 'delete-bucket',
  CANCEL_DELETE_BUCKET = 'delete-bucket-cancel',
  GET_BUCKET = 'get-bucket',
  LIST_BUCKETS = 'list-buckets',
  LIST_BUCKET_CONTENT = 'list-bucket-content',
  CREATE_DIRECTORY = 'create-directory',
  UPDATE_DIRECTROY = 'update-directory',
  DELETE_DIRECTORY = 'delete-directory',
  CANCEL_DELETE_DIRECTORY = 'cancel-delete-directory',
  LIST_DIRECTORY_CONTENT = 'list-directory-content',
  LIST_FILES = 'list-files',
  GET_FILE_DETAILS = 'get-file-details',
  FILE_DELETE = 'delete-file',
  RESTORE_FILE = 'restore-file',
  BUCKET_WEBHOOK_GET = 'get-bucket-webhook',
  BUCKET_WEBHOOK_CREATE = 'create-bucket-webhook',
  BUCKET_WEBHOOK_UPDATE = 'update-bucket-webhook',
  BUCKET_WEBHOOK_DELETE = 'delete-bucket-webhook',
  LIST_FILE_UPLOAD = 'list-file-upload',
  LIST_FILE_UPLOAD_SESSIONS = 'list-file-upload-sessions',
  MAX_BUCKETS_QUOTA_REACHED = 'max-buckets-quota-reached',
  IPNS_LIST = 'list-ipns',
  IPNS_CREATE = 'create-ipns',
  IPNS_UPDATE = 'update-ipns',
  IPNS_DELETE = 'delete-ipns',
  IPNS_PUBLISH = 'publish-ipns',
  IPNS_GET = 'get-ipns',
  IPNS_GET_BY_NAME = 'get-ipns-by-name',
  WEBSITE_LIST = 'list-websites',
  WEBSITE_CREATE = 'create-website',
  WEBSITE_UPDATE = 'update-website',
  WEBSITE_ARCHIVE = 'archive-website',
  WEBSITE_ACTIVATE = 'activate-website',
  WEBSITE_GET = 'get-website',
  WEBSITE_DEPLOY = 'deploy-website',
  WEBSITE_LIST_DOMAINS = 'list-website-domains',
  WEBSITE_GET_ALL_DOMAINS = 'get-all-domains',
  WEBSITE_QUOTA_REACHED = 'websites-quota-reached',
  WEBSITE_CHECK_DOMAIN_DNS = 'website-check-domain-dns',
  WEBSITE_REMOVE_DOMAIN = 'website-remove-domain',
  BUCKET_CLEAR_CONTENT = 'clear-bucket-content',
  DEPLOYMENT_GET = 'get-deployment',
  DEPLOYMENT_LIST = 'list-deployment',
  DEPLOYMENT_APPROVE = 'deployment-approve',
  DEPLOYMENT_REJECT = 'deployment-reject',
  PREPARE_COLLECTION_BASE_URI = 'prepare-collection-base-uri',
  PREPARE_COLLECTION_BASE_URI_GENERIC = 'prepare-collection-base-uri-generic',
  COLLECTION_METADATA_LIST = 'list-collection-metadata',
  TEST_CRUST_PROVIDER = 'test-crust-provider',
  PROJECT_STORAGE_DETAILS = 'project-storage-details',
  STORAGE_INFO = 'get-storage-info',
  GET_BLACKLIST = 'get-blacklist',
  PROJECTS_OVER_BANDWIDTH_QUOTA = 'projects-over-bandwidth-quota',
  BLACKLIST_PROJECT = 'blacklist-project',
  GET_PROJECT_IPFS_CLUSTER = 'get-project-ipfs-cluster',
  GET_IPFS_CLUSTER_INFO = 'get-ipfs-cluster-info',
  GET_LINK = 'get-link',
  GET_LINKS = 'get-links',
  GENERATE_SHORT_URL = 'generate-short-url',
  GET_TARGET_URL = 'get-target-url',
  TRIGGER_GITHUB_DEPLOY = 'trigger-github-deploy',
  GET_DEPLOY_CONFIG_BY_REPO_ID = 'get-deploy-config-by-repo-id',
  CREATE_DEPLOY_CONFIG = 'create-deploy-config',
  UPDATE_DEPLOY_CONFIG = 'update-deploy-config',
  LINK_GITHUB = 'link-github',
  UNLINK_GITHUB = 'unlink-github',
  LIST_REPOS = 'list-repos',
  GET_PROJECT_GITHUB_CONFIG = 'get-project-github-config',
  LIST_DEPLOYMENT_BUILDS = 'list-deployment-builds',
  DELETE_DEPLOYMENT_CONFIG = 'delete-deployment-config',
  SET_ENVIRONMENT_VARIABLES = 'set-environment-variables',
  GET_ENVIRONMENT_VARIABLES = 'get-environment-variables',
  TRIGGER_WEB_DEPLOY = 'trigger-web-deploy',
}

export enum AuthenticationEventType {
  IDENTITY_VERIFICATION = 'identity-verification',
  SEND_VERIFICATION_EMAIL = 'send-verification-email',
  GET_IDENTITY_GEN_PROCESS_STATE = 'get-identity-gen-process-state',
  GENERATE_IDENTITY = 'generate-identity',
  GET_USER_IDENTITY = 'get-user-identity',
  REVOKE_IDENTITY = 'revoke-identity',
  GENERATE_DEV_RESOURCES = 'generate-dev-resources',
  SPORRAN_GET_SESSION_VALUES = 'sporran-get-session-values',
  SPORRAN_VERIFY_SESSION = 'sporran-verify-session',
  SPORRAN_SUBMIT_TERMS = 'sporran-submit-terms',
  SPORRAN_SUBMIT_ATTESTATION = 'sporran-submit-attestation',
  SPORRAN_REQUEST_CREDENTIAL = 'sporran-request-credential',
  SPORRAN_VERIFY_CREDENTIAL = 'sporran-verify-credential',
  GET_TOTAL_DIDS = 'get-total-dids',
  EW_INFO = 'get-embedded-wallets-info',
  EW_INTEGRATION_CREATE = 'create-ew-integration',
  EW_INTEGRATION_GET = 'get-ew-integration',
  EW_INTEGRATION_LIST = 'list-ew-integration',
  EW_INTEGRATION_UPDATE = 'update-ew-integration',
  CREATE_OASIS_SIGNATURE = 'create-oasis-signature',
  LIST_OASIS_SIGNATURES = 'list-oasis-signatures',
  GET_OASIS_SIGNATURE_BY_PUBLIC_ADDRESS = 'get-oasis-signature-by-public-address',
  GENERATE_OTP = 'generate-otp',
  VALIDATE_OTP = 'validate-otp',
}

export enum MailEventType {
  SEND_MAIL = 'send-mail',
  SEND_CUSTOM_MAIL = 'send-custom-mail',
  SET_MAILERLITE_FIELD = 'set-mailerlite-field',
  GET_NOTIFICATIONS = 'get-notifications',
  GET_NOTIFICATIONS_FOR_USER = 'get-notifications-for-user',
  CREATE_NOTIFICATION = 'create-notification',
  UPDATE_NOTIFICATION = 'update-notification',
  DELETE_NOTIFICATION = 'delete-notification',
}

export enum ScsEventType {
  GET_QUOTA = 'get-quota',
  GET_ALL_QUOTAS = 'get-all-quotas',
  CREATE_OVERRIDE = 'create-override',
  DELETE_OVERRIDE = 'delete-override',
  ADD_CREDIT = 'add-credit',
  CONFIGURE_CREDIT = 'configure-credit',
  SPEND_CREDIT = 'spend-credit',
  REFUND_CREDIT = 'refund-credit',
  GET_PROJECT_CREDIT = 'get-project-credit',
  GET_CREDIT_TRANSACTIONS = 'get-project-transactions',
  GET_CREDIT_PACKAGES = 'get-credit-packages',
  ADD_FREEMIUM_CREDITS = 'add-freemium-credits',
  HANDLE_PAYMENT_WEBHOOK_DATA = 'handle-payment-webhook-data',
  GET_SUBSCRIPTION_PACKAGE_STRIPE_ID = 'get-subscription-package-stripe-id',
  GET_CREDIT_PACKAGE_STRIPE_ID = 'get-credit-package-stripe-id',
  UPDATE_SUBSCRIPTION = 'update-subscription',
  LIST_SUBSCRIPTIONS = 'list-subscriptions',
  GET_ACTIVE_SUBSCRIPTION = 'get-active-subscription',
  GET_SUBSCRIPTION_PACKAGES = 'get-subscription-packages',
  LIST_INVOICES = 'list-invoices',
  GET_PRODUCT_PRICELIST = 'get-product-pricelist',
  GET_PRODUCT_PRICE = 'get-product-price',
  GET_PROJECTS_WITH_ACTIVE_SUBSCRIPTION = 'get-projects-with-active-subscription',
  HAS_ACTIVE_RPC_PLAN = 'has-active-rpc-plan',
}

export enum NftsEventType {
  HELLO = 'hello',
  CREATE_COLLECTION = 'create-collection',
  CREATE_UNIQUE_COLLECTION = 'create-unique-collection',
  NFT_COLLECTIONS_LIST = 'list-nft-collections',
  GET_NFT_COLLECTION = 'get-nft-collection',
  GET_NFT_COLLECTION_BY_UUID = 'get-nft-collection-by-uuid',
  TRANSFER_OWNERSHIP = 'transfer-ownership',
  MINT_NFT = 'mint-nft',
  NEST_MINT_NFT = 'nest-mint-nft',
  SET_BASE_URI = 'set-base-uri',
  CHECK_TRANSACTION_STATUS = 'check-transaction-status',
  NFT_COLLECTION_TRANSACTION_LIST = 'list-collection-transactions',
  DEPLOY_COLLECTION = 'deploy-collection',
  BURN_NFT = 'burn-nft',
  MAX_COLLECTIONS_QUOTA_REACHED = 'max-collections-quota-reached',
  EXECUTE_DEPLOY_COLLECTION_WORKER = 'execute-deploy-collection-worker',
  PROJECT_COLLECTION_DETAILS = 'project-collections-details',
  ADD_NFTS_METADATA = 'add-nfts-metadata',
  ARCHIVE_COLLECTION = 'archive-collection',
  ADD_IPNS_TO_COLLECTION = 'add-ipns-to-collection',
  ACTIVATE_COLLECTION = 'activate-collection',
  SET_WEBSITE_UUID = 'set-website-uuid',
}

export enum ComputingEventType {
  CREATE_CONTRACT = 'create-contract',
  LIST_CONTRACTS = 'list-contract',
  GET_CONTRACT_BY_UUID = 'get-contract-by-uuid',
  LIST_TRANSACTIONS = 'list-transactions',
  DEPOSIT_TO_PHALA_CLUSTER = 'fund-contract-cluster',
  TRANSFER_CONTRACT_OWNERSHIP = 'transfer-contract-ownership',
  ENCRYPT_CONTENT = 'encrypt-content',
  ASSIGN_CID_TO_NFT = 'assign-cid-to-nft',
  LIST_CLUSTER_WALLETS = 'list-cluster-wallets',
  PROJECT_COMPUTING_DETAILS = 'project-computing-details',
  ARCHIVE_CONTRACT = 'archive-contract',
  ACTIVATE_CONTRACT = 'activate-contract',

  CREATE_CLOUD_FUNCTION = 'create-cloud-function',
  LIST_CLOUD_FUNCTIONS = 'list-cloud-functions',
  UPDATE_CLOUD_FUNCTION = 'update-cloud-function',
  EXECUTE_CLOUD_FUNCTION = 'execute-cloud-function',

  GET_CLOUD_FUNCTION = 'get-cloud-function',
  CREATE_JOB = 'create-job',
  GET_JOB = 'get-job',
  SET_CLOUD_FUNCTION_ENVIRONMENT = 'set-cloud-function-environment',
  GET_CLOUD_FUNCTION_ENVIRONMENT = 'get-cloud-function-environment',
  ARCHIVE_CLOUD_FUNCTION = 'archive-cloud-function',
  ACTIVATE_CLOUD_FUNCTION = 'activate-cloud-function',

  UPDATE_JOB = 'update-job',
  DELETE_JOB = 'delete-job',

  VERIFY_REBEL = 'verify-rebel',
}

export enum ReferralEventType {
  CREATE_PLAYER = 'create-referral',
  GET_PLAYER = 'get-referral',
  GET_PRODUCTS = 'get-products',
  ORDER_PRODUCT = 'order-product',
  CONNECT_GITHUB = 'connect-githhub',
  DISCONNECT_GITHUB = 'disconnect-githhub',
  CONNECT_TWITTER = 'connect-twitter',
  DISCONNECT_TWITTER = 'disconnect-twitter',
  GET_TWITTER_LINK = 'get-twitter-link',
  GET_TWEETS = 'get-tweets',
  CONFIRM_RETWEET = 'confirm-retweet',

  ADD_PROMO_CODE_CREDITS = 'add-promo-code-credits',
}

export enum SocialEventType {
  CREATE_SPACE = 'create-space',
  LIST_SPACES = 'list-spaces',
  GET_SPACE = 'get-space',
  ARCHIVE_SPACE = 'archive-space',
  ACTIVATE_SPACE = 'activate-space',
  CREATE_POST = 'create-post',
  LIST_POSTS = 'list-posts',
  GET_POST = 'get-post',
  ARCHIVE_POST = 'archive-post',
  ACTIVATE_POST = 'activate-post',
  GET_WALLET_IDENTITY = 'get-wallet-identity',
  PROJECT_SOCIAL_DETAILS = 'project-social-details',
}

export enum ContractEventType {
  CONTRACTS_LIST = 'contracts-list',
  GET_CONTRACT = 'get-contract',
  GET_CONTRACT_ABI = 'get-contract-abi',
  DEPLOY_CONTRACT = 'deploy-contract',
  CALL_DEPLOYED_CONTRACT = 'call-deployed-contract',
  DEPLOYED_CONTRACTS_LIST = 'deployed-contracts-list',
  GET_DEPLOYED_CONTRACT = 'get-deployed-contract',
  PROJECT_DEPLOYED_CONTRACT_DETAILS = 'project-contracts-details',
  GET_DEPLOYED_CONTRACT_ABI = 'get-deployed-contract-abi',
  LIST_DEPLOYED_CONTRACT_TRANSACTIONS = 'list-deployed-contract-transactions',
  ARCHIVE_DEPLOYED_CONTRACT = 'archive-deployed-contract',
  ACTIVATE_DEPLOYED_CONTRACT = 'activate-deployed-contract',
}

export enum DeployEventType {
  BE_DEPLOY_DOCKER_COMPOSE = 'be-deploy-docker-compose',
  BE_LIST_BACKENDS = 'be-list-backends',
  BE_GET_INSTANCE = 'be-get-instance',
  BE_GET_INSTANCE_DETAILS = 'be-get-instance-details',
  BE_START_INSTANCE = 'be-start-instance',
  BE_SHUTDOWN_INSTANCE = 'be-shutdown-instance',
  BE_STOP_INSTANCE = 'be-stop-instance',
  BE_RESTART_INSTANCE = 'be-restart-instance',
  BE_DESTROY_INSTANCE = 'be-destroy-instance',
  BE_GET_INSTANCE_STATE = 'be-get-instance-state',
  BE_GET_INSTANCE_ATTESTATION = 'be-get-instance-attestation',
  // BE_GET_INSTANCE_BILLING = 'be-get-instance-billing',
  BE_RESIZE_INSTANCE = 'be-resize-instance',
}

export enum SimpletsEventType {
  SIMPLETS_LIST = 'simplets-list',
  SIMPLETS_DEPLOY = 'deploy',
  GET_SIMPLET = 'get-simplet',
  // deployed
  GET_DEPLOYED_SIMPLET = 'get-deployed-simplet',
  LIST_DEPLOYED_SIMPLETS = 'list-deployed-simplets',
}

export enum InfrastructureEventType {
  LIST_RPC_API_KEYS = 'list-rpc-api-keys',
  REVOKE_RPC_API_KEY = 'revoke-rpc-api-key',
  UPDATE_RPC_API_KEY = 'update-rpc-api-key',
  CREATE_RPC_API_KEY = 'create-rpc-api-key',
  GET_RPC_API_KEY_USAGE = 'get-rpc-api-key-usage',
  GET_RPC_API_KEY_USAGE_PER_CHAIN = 'get-rpc-api-key-usage-per-chain',
  GET_RPC_API_KEY = 'get-rpc-api-key',
  CHANGE_DWELLIR_SUBSCRIPTION = 'change-dwellir-subscription',
  DOWNGRADE_DWELLIR_SUBSCRIPTIONS = 'downgrade-dwellir-subscriptions',
  CREATE_RPC_URL = 'create-rpc-url',
  DELETE_RPC_URL = 'delete-rpc-url',
  LIST_RPC_URLS = 'list-rpc-urls',
  LIST_ENDPOINTS = 'list-endpoints',
  HAS_DWELLIR_ID = 'has-dwellir-id',
  CREATE_USER = 'create-user',
  IS_RPC_API_KEYS_QUOTA_REACHED = 'is-rpc-api-keys-quota-reached',

  INDEXER_CREATE = 'create-indexer',
  INDEXER_LIST = 'list-indexers',
  INDEXER_GET = 'get-indexer',
  INDEXER_GET_LOGS = 'get-indexer-logs',
  INDEXER_GET_DEPLOYMENTS = 'get-indexer-deployments',
  INDEXER_GET_USAGE = 'get-indexer-usage',
  INDEXER_LIST_BILLING = 'list-indexer-billing',
  INDEXER_UPDATE = 'update-indexer',
  INDEXER_GET_URL_FOR_SC_UPLOAD = 'get-url-for-indexer-source-code-upload',
  INDEXER_DEPLOY = 'deploy-indexer',
  INDEXER_DELETE = 'delete-indexer',
  INDEXER_HIBERNATE = 'hibernate-indexer',
}

export enum ServiceName {
  GENERAL = 'GENERAL',
  AMS = 'AMS',
  LMAS = 'LMAS',
  DEV_CONSOLE = 'DEV_CONSOLE',
  MAIL = 'MAIL',
  STORAGE = 'STORAGE',
  APILLON_API = 'APILLON_API',
  AUTHENTICATION_API = 'AUTHENTICATION_API',
  AUTH = 'AUTH',
  NFTS = 'NFTS',
  REFERRAL = 'REFERRAL',
  BLOCKCHAIN = 'BLOCKCHAIN',
  CONFIG = 'CONFIG',
  COMPUTING = 'COMPUTING',
  SOCIAL = 'SOCIAL',
  CONTRACTS = 'CONTRACTS',
  INFRASTRUCTURE = 'INFRASTRUCTURE',
  SIMPLETS = 'SIMPLETS',
  DEPLOY = 'DEPLOY',
}

export enum ServiceCode {
  GENERAL = '00',
  LIB = '01',
  AMS = '02',
  LMAS = '03',
  DEV_CONSOLE = '04',
  APILLON_API = '05',
  STORAGE = '06',
  MOD_LIB = '07',
  MAIL = '08',
  AUTH = '09',
  CONFIG = '10',
  REFERRAL = '11',
  NFTS = '12',
  BLOCKCHAIN = '16',
  COMPUTING = '18',
  SOCIAL = '19',
  INFRASTRUCTURE = '20',
}

export enum AppEnvironment {
  LOCAL_DEV = 'local',
  TEST = 'test',
  DEV = 'development',
  STG = 'staging',
  PROD = 'production',
}

export enum LogType {
  DB = 'DB',
  INFO = 'INFO',
  MSG = 'MSG',
  WARN = 'WARNING',
  ERROR = 'ERROR',
  COST = 'COST',
  ALERT = 'ALERT',
}

export enum LogLevel {
  DB_ONLY = 'db',
  NO_DB = 'no-db',
  DEBUG = 'debug',
  WARN = 'warning',
  ERROR_ONLY = 'error',
}

export enum SqlModelStatus {
  DRAFT = 1,
  INCOMPLETE = 2,
  INACTIVE = 3,
  ACTIVE = 5,
  BLOCKED = 7,
  ARCHIVED = 8,
  DELETED = 9,
}

/**
 * Types of services in dev-console-api
 */
export enum AttachedServiceType {
  AUTHENTICATION = 1,
  STORAGE = 2,
  NFT = 3,
  HOSTING = 4,
  COMPUTING = 5,
  SOCIAL = 6,
  WALLET = 7,
  CONTRACTS = 8,
  RPC = 9,
  INDEXING = 10,
  SIMPLETS = 11,
  SYSTEM = 999,
}

/**
 * Model population strategies.
 */
export enum PopulateFrom {
  PROFILE = 'profile',
  DB = 'db',
  DUPLICATE = 'duplicate',
  ADMIN = 'admin',
  WORKER = 'worker',
  AUTH = 'auth',
  SERVICE = 'service',
}

/**
 * Model serialization strategies.
 */
export enum SerializeFor {
  PROFILE = 'profile',
  INSERT_DB = 'insert_db',
  UPDATE_DB = 'update_db',
  SELECT_DB = 'select_db',
  ADMIN_SELECT_DB = 'admin_select_db',
  ADMIN = 'admin',
  WORKER = 'worker',
  SERVICE = 'service',
  APILLON_API = 'apillon_api',
  LOGGER = 'logger',
}

/**
 * DTO validation strategies.
 */
export enum ValidateFor {
  BODY = 'body',
  QUERY = 'query',
}

//#region Roles & Permissions

export enum PermissionType {
  READ = 'read',
  WRITE = 'write',
  EXECUTE = 'execute',
}

export enum PermissionLevel {
  NONE = 0,
  OWN = 1,
  ALL = 2,
}

export enum DefaultUserRole {
  // values should not overlap with api key roles!!!

  // Admin roles
  ADMIN = 1, // System's admin
  SUPPORT = 2, // System Support user
  ANALYTIC = 3, // Read only system user
  // project roles
  PROJECT_OWNER = 10, // Owner of current project
  PROJECT_ADMIN = 11, // Admin of current project
  PROJECT_USER = 12, // (read only) User on current project
  // auth user roles
  INTERNAL_TEST_USER = 90, //user with access to new unpublished features
  EXTERNAL_TEST_USER = 91, //user with access to features ready for external testers
  BETA_USER = 92, //user with access to closed beta features
  USER = 99, // user with access to platform (published features)
}

export enum DefaultApiKeyRole {
  // values should not overlap with user roles!!!
  KEY_EXECUTE = 50,
  KEY_WRITE = 51,
  KEY_READ = 52,
}

export enum DefaultPermission {
  STORAGE = 1,
  HOSTING = 2,
  NFTS = 3,
  AUTHENTICATION = 4,
  COMPUTING = 5,
  SOCIAL = 6,
  WALLET = 7,
  CONTRACTS = 8,
  RPC = 9,
  INDEXING = 10,
  SIMPLETS = 11,
}

//#endregion

//#region Codes

/**
 * Error codes
 * code format : HTTPCODE|MODULE_CODE|MODULE_INTERNAL_ERROR_CODE
 *
 * HTTP CODE = 422 for valdiation, 400 for invalid request, 500 internal error,...
 * MODULE CODE:
 *  00 - general
 *  01 - at-lib
 *  02 - ams
 *  03 - lmas
 *  04 - dev-api
 *  05 - apillon-api
 *  06 - storage
 *  07 - authentication-api
 *  ...
 *  INTERNAL ERROR CODE: 000 - 999
 *
 **/
export enum ErrorCode {
  STATUS_NOT_PRESENT = 42200100,
  INVALID_STATUS = 42200101,
  ERROR_WRITING_TO_DATABASE = 50000001,
  ERROR_READING_FROM_DATABASE = 50000002,
  SERVICE_ERROR = 50000100,
}

export enum ErrorOrigin {
  CORE_API = 'API',
  AUTH_SERVICE = 'AUTH',
}

/**
 * System Error codes - 500000.
 */
export enum SystemErrorCode {
  DEFAULT_SYSTEM_ERROR = 500000,
  UNHANDLED_SYSTEM_ERROR = 500001,
  SQL_SYSTEM_ERROR = 500002,
  AWS_SYSTEM_ERROR = 500003,
  MICROSERVICE_SYSTEM_ERROR = 500004,
}

/**
 * Bad request error codes - 400000.
 */
export enum BadRequestErrorCode {
  BAD_REQUEST = 40000000,
  INVALID_PATH = 40000001,
  INVALID_QUERY_PARAMETERS = 40000002,
  MISSING_AUTHORIZATION_HEADER = 40000003,
  INVALID_AUTHORIZATION_HEADER = 40000004,
  THIRD_PARTY_SERVICE_CONNECTION_FAILED = 40000005,
  RESOURCE_DOES_NOT_EXISTS = 40000006,
  INVALID_NOTIFICATION_TYPE = 40000007,
  NOTIFICATION_TYPE_OR_MESSAGE_MISSING = 40000008,
  INVALID_NFT_WEBSITE_TYPE = 40000009,
}

export enum ValidatorErrorCode {
  DEFAULT_VALIDATOR_ERROR_CODE = 42200000,
  BUCKET_PROJECT_UUID_NOT_PRESENT = 42200001,
  BUCKET_STORAGE_PLAN_ID_NOT_PRESENT = 42200002,
  BUCKET_NAME_NOT_PRESENT = 42200003,
  DIRECTORY_BUCKET_UUID_NOT_PRESENT = 42200004,
  DIRECTORY_NAME_NOT_PRESENT = 42200005,
  BUCKET_UUID_NOT_PRESENT = 42200006,
  PATH_NOT_PRESENT = 42200007,
  FILE_NAME_NOT_PRESENT = 42200008,
  FILE_CONTENT_TYPE_NOT_PRESENT = 42200009,
  SESSION_UUID_NOT_PRESENT = 42200010,
  BUCKET_TYPE_NOT_PRESENT = 42200011,
  CREATE_API_KEY_PROJECT_UUID_NOT_PRESENT = 42200012,
  PROJECT_UUID_QUERY_PARAM_NOT_PRESENT = 42200013,
  API_KEY_ROLE_API_KEY_ID_NOT_PRESENT = 42200014,
  API_KEY_ROLE_ROLE_ID_NOT_PRESENT = 42200015,
  API_KEY_ROLE_PROJECT_UUID_NOT_PRESENT = 42200016,
  API_KEY_ROLE_SERVICE_UUID_NOT_PRESENT = 42200017,
  API_KEY_ROLE_ROLE_ID_NOT_VALID = 42200018,
  BUCKET_WEBHOOK_BUCKET_ID_NOT_PRESENT = 42200019,
  BUCKET_WEBHOOK_URL_NOT_PRESENT = 42200020,
  QUOTA_ID_NOT_PRESENT = 42200021,
  PROJECT_UUID_NOT_PRESENT_IN_QUERY = 42200022,
  BUCKET_TYPE_NOT_PRESENT_IN_QUERY = 42200023,
  IPNS_PROJECT_UUID_NOT_PRESENT = 42200024,
  IPNS_BUCKET_ID_NOT_PRESENT = 42200025,
  IPNS_NAME_NOT_PRESENT = 42200026,
  IPNS_IPNS_NAME_NOT_PRESENT = 42200027,
  IPNS_IPNS_VALUE_NOT_PRESENT = 42200028,
  PUBLISH_IPNS_IPNS_UUID_NOT_PRESENT = 42200029,
  PUBLISH_IPNS_CID_NOT_PRESENT = 42200030,
  TASK_ID_NOT_PRESENT = 42200031,
  USER_OAUTH_TOKEN_NOT_PRESENT = 42200032,
  USER_OAUTH_VERIFIER_NOT_PRESENT = 42200033,
  TWEET_ID_NOT_PRESENT = 42200034,
  PRODUCT_ID_NOT_PRESENT = 42200035,
  WEBSITE_PROJECT_UUID_NOT_PRESENT = 42200036,
  WEBSITE_NAME_NOT_PRESENT = 42200037,
  DEPLOY_WEBSITE_UUID_NOT_PRESENT = 42200038,
  DEPLOY_ENVIRONMENT_NOT_PRESENT = 42200039,
  FILES_PROPERTY_NOT_PRESENT = 42200040,
  FILES_PROPERTY_EMPTY = 42200041,
  PREPARE_AND_DEPLOY_COLLECTION_IMAGE_SESSION_NOT_PRESENT = 42200042,
  PREPARE_AND_DEPLOY_COLLECTION_METADATA_SESSION_NOT_PRESENT = 42200043,
  USER_WALLET_ADDRESS_NOT_PRESENT = 42200050,
  USER_AUTH_SIGNATURE_NOT_PRESENT = 42200051,
  USER_AUTH_TIMESTAMP_NOT_PRESENT = 42200052,
  API_KEY_ROLE_SERVICE_TYPE_NOT_PRESENT = 42200053,
  NFT_DEPLOY_SYMBOL_NOT_PRESENT = 42200100,
  NFT_DEPLOY_SYMBOL_NOT_VALID = 42200101,
  NFT_DEPLOY_NAME_NOT_PRESENT = 42200102,
  NFT_DEPLOY_NAME_NOT_VALID = 42200103,
  NFT_DEPLOY_MAX_SUPPLY_NOT_PRESENT = 42200104,
  NFT_DEPLOY_MAX_SUPPLY_NOT_VALID = 42200105,
  NFT_DEPLOY_MINT_PRICE_NOT_PRESENT = 42200106,
  NFT_DEPLOY_MINT_PRICE_NOT_VALID = 42200107,
  NFT_DEPLOY_BASE_URI_NOT_PRESENT = 42200108,
  NFT_DEPLOY_BASE_URI_NOT_VALID = 42200109,
  NFT_DEPLOY_BASE_EXTENSION_NOT_PRESENT = 42200110,
  NFT_DEPLOY_BASE_EXTENSION_NOT_VALID = 42200111,
  NFT_DEPLOY_DROP_BOOL_NOT_PRESENT = 42200112,
  NFT_DEPLOY_DROP_TIMESTAMP_NOT_PRESENT = 42200113,
  NFT_DEPLOY_RESERVE_NOT_PRESENT = 42200114,
  NFT_DEPLOY_COLLECTION_DESCRIPTION_NOT_VALID = 42200115,
  NFT_DEPLOY_PROJECT_UUID_NOT_PRESENT = 42200116,
  NFT_TRANSFER_OWNERSHIP_ADDRESS_NOT_PRESENT = 42200117,
  NFT_TRANSFER_OWNERSHIP_ADDRESS_NOT_VALID = 42200118,
  NFT_TRANSFER_OWNERSHIP_COLLECTION_UUID_NOT_PRESENT = 42200119,
  NFT_MINT_ADDRESS_NOT_PRESENT = 42200120,
  NFT_MINT_ADDRESS_NOT_VALID = 42200121,
  NFT_MINT_QUANTITY_NOT_PRESENT = 42200122,
  NFT_MINT_QUANTITY_NOT_VALID = 42200123,
  NFT_MINT_COLLECTION_UUID_NOT_PRESENT = 42200124,
  NFT_SET_BASE_URI_NOT_PRESENT = 42200125,
  NFT_SET_BASE_URI_NOT_VALID = 42200126,
  NFT_SET_BASE_URI_COLLECTION_UUID_NOT_PRESENT = 42200127,
  NFT_PROJECT_UUID_QUERY_PARAM_NOT_PRESENT = 42200128,
  NFT_COLLECTION_UUI_PARAM_NOT_PRESENT = 42200129,
  NFT_COLLECTION_CHAIN_NOT_VALID = 42200130,
  NFT_COLLECTION_CHAIN_NOT_PRESENT = 42200131,
  NFT_COLLECTION_SOULBOUND_NOT_PRESENT = 42200132,
  NFT_COLLECTION_REVOKABLE_NOT_PRESENT = 42200133,
  NFT_COLLECTION_ROYALTIES_ADDRESS_NOT_PRESENT = 42200134,
  NFT_COLLECTION_ROYALTIES_ADDRESS_NOT_VALID = 42200135,
  NFT_COLLECTION_ROYALTIES_FEES_NOT_PRESENT = 42200136,
  NFT_COLLECTION_ROYALTIES_FEES_NOT_VALID = 42200137,
  TRANSACTION_REF_TABLE_PARAM_NOT_PRESENT = 42200138,
  TRANSACTION_REF_ID_PARAM_NOT_PRESENT = 42200139,
  NFT_COLLECTION_BASE_URI_NOT_PRESENT = 42200140,
  NFT_COLLECTION_TYPE_NOT_PRESENT = 42200141,
  NFT_COLLECTION_TYPE_NOT_VALID = 42200142,
  NFT_MINT_PARENT_COLLECTION_ID_NOT_PRESENT = 42200143,
  NFT_MINT_PARENT_NFT_ID_NOT_PRESENT = 42200144,
  NFT_DEPLOY_DROP_RESERVE_NOT_VALID = 42200145,
  NFT_DEPLOY_DROP_RESERVE_GREATER_THAN_MAX_SUPPLY = 42200146,
  NFT_BURN_TOKEN_ID_NOT_PRESENT = 42200147,
  NFT_BURN_TOKEN_ID_NOT_VALID = 42200148,
  QUOTA_CODE_NOT_VALID = 42200149,
  INVALID_FILES_LENGTH = 42200150,
  CID_NOT_PRESENT = 42200160,
  REQUIRED_DATA_NOT_PRESENT = 42200161,
  ADD_NFT_REQUIRED_DATA_NOT_PRESENT = 42200162,
  DATA_NOT_VALID = 42200163,
  DATA_NOT_PRESENT = 42200164,
  CREATE_OASIS_SIGNATURE_REQUIRED_DATA_NOT_PRESENT = 42200165,
  GENERATE_OTP_REQUIRED_DATA_NOT_PRESENT = 42200166,
  VALIDATE_OTP_REQUIRED_DATA_NOT_PRESENT = 42200167,
  CREATE_EW_INTEGRATION_REQUIRED_DATA_NOT_PRESENT = 42200168,
  CREATE_EW_INTEGRATION_INVALID_WHITELISTED_DOMAINS = 42200169,
  //#region Computing
  COMPUTING_PROJECT_UUID_NOT_PRESENT = 42200201,
  COMPUTING_CONTRACT_TYPE_NOT_PRESENT = 42200202,
  COMPUTING_CONTRACT_TYPE_NOT_VALID = 42200203,
  COMPUTING_NAME_NOT_PRESENT = 42200204,
  COMPUTING_NAME_NOT_VALID = 42200205,
  COMPUTING_DESCRIPTION_NOT_VALID = 42200206,
  COMPUTING_ACCOUNT_ADDRESS_NOT_PRESENT = 42200207,
  COMPUTING_ACCOUNT_ADDRESS_NOT_VALID = 42200208,
  COMPUTING_DEPOSIT_AMOUNT_NOT_VALID = 42200209,
  COMPUTING_CONTRACT_DATA_NOT_VALID = 42200210,
  COMPUTING_NFT_CONTRACT_ADDRESS_NOT_VALID = 42200211,
  COMPUTING_FIELD_NOT_PRESENT = 42200212,
  COMPUTING_FIELD_NOT_VALID = 42200213,

  //#region Authentication
  USER_EMAIL_ALREADY_TAKEN = 42200701,
  USER_EMAIL_NOT_PRESENT = 42200702,
  USER_EMAIL_NOT_VALID = 42200703,
  VERIFICATION_IDENTITY_NOT_PRESENT = 42200704,
  IDENTITY_TOKEN_NOT_PRESENT = 42200705,
  CAPTCHA_NOT_PRESENT = 42200706,
  IDENTITY_CREATE_DID_CREATE_OP_NOT_PRESENT = 42200707,
  IDENTITY_CREATE_INVALID_REQUEST = 42200708,
  IDENTITY_VERIFICATION_TOKEN_NOT_PRESENT = 42200709,
  IDENTITY_VERIFICATION_EMAIL_TYPE_NOT_PRESENT = 42200710,
  DID_URI_NOT_PRESENT = 42200711,
  DID_URI_INVALID = 42200712,
  SPORRAN_ENCRYPTED_KEY_URI_NOT_PRESENT = 42200713,
  SPORRAN_SESSIONID_NOT_PRESENT = 42200714,
  SPORRAN_REQUEST_MESSAGE_NOT_PRESENT = 42200715,
  SPORRAN_ENCRYPTED_CHALLENGE_NOT_PRESENT = 42200716,
  SPORRAN_NONCE_NOT_PRESENT = 42200717,
  AUTH_SESSION_TOKEN_NOT_PRESENT = 42200718,
  CAPTCHA_NOT_CONFIGURED = 42200719,
  CAPTCHA_INVALID = 42200720,
  OTP_CODE_NOT_PRESENT = 42200721,
  //#endregion

  //#region Blockchain
  SUBSTRATE_TRANSACTION_NOT_PRESENT = 42200801,
  SUBSTRATE_CHAIN_NOT_PRESENT = 42200802,
  SUBSTRATE_CHAIN_NOT_VALID = 42200803,
  EVM_TRANSACTION_NOT_PRESENT = 42200804,
  EVM_CHAIN_NOT_PRESENT = 42200805,
  EVM_CHAIN_NOT_VALID = 42200806,
  //#endregion

  //#region Caching
  INVALID_CACHE_KEY = 42200900,
  //#endregion

  //#region Logs
  INVALID_LOG_TYPE = 42200901,
  INVALID_SERVICE_NAME = 42200902,
  COLLECTION_NAME_NOT_PRESENT = 42200903,
  COLLECTION_NAME_NOT_VALID = 42200904,
  //#endregion

  //#region config MS
  ADD_CREDIT_REQUIRED_DATA_NOT_PRESENT = 422001001,
  SPEND_CREDIT_REQUIRED_DATA_NOT_PRESENT = 422001002,
  PRODUCT_SERVICE_NOT_VALID = 422001003,
  PRODUCT_CATEGORY_NOT_VALID = 422001004,
  CONFIGURE_CREDIT_REQUIRED_DATA_NOT_PRESENT = 422001005,
  CONFIGURE_CREDIT_REQUIRED_DATA_NOT_VALID = 422001006,
  //#endregion

  //#region short url
  TARGET_URL_NOT_PRESENT = 422001010,
  TARGET_URL_NOT_VALID = 422001011,
  //#endregion

  //#region Infrastructure
  RPC_API_KEY_NAME_NOT_PRESENT = 422001101,
  RPC_API_KEY_PROJECT_ID_NOT_PRESENT = 422001102,
  RPC_URL_API_KEY_ID_NOT_PRESENT = 422001104,
  RPC_URL_NETWORK_NOT_PRESENT = 422001105,
  RPC_URL_CHAIN_NAME_NOT_PRESENT = 422001106,
  INDEXER_LOGS_REQUIRED_QUERY_DATA_NOT_PRESENT = 422001107,

  INDEXER_REQUIRED_DATA_NOT_PRESENT = 422001120,
  DEPLOY_INDEXER_REQUIRED_DATA_NOT_PRESENT = 422001121,

  //#region Mailing MS
  INVALID_NOTIFICATION_TYPE = 422001201,
}

/**
 * Unauthorized error codes - 401000.
 */
export enum UnauthorizedErrorCodes {
  UNAUTHORIZED = 40100000,
  INVALID_TOKEN = 40100001,
  INVALID_SIGNATURE = 40100002,
}

export enum ForbiddenErrorCodes {
  FORBIDDEN = 40300000,
  INVALID_ORIGIN = 40300001,
}

//#endregion

//#region Roles

export enum RoleType {
  USER_ROLE = 1,
  API_KEY_ROLE = 2,
}

/**
 * Groups of roles used for Permissions decorators in controllers
 */
export class RoleGroup {
  static ProjectAccess = [
    DefaultUserRole.PROJECT_OWNER,
    DefaultUserRole.PROJECT_ADMIN,
    DefaultUserRole.PROJECT_USER,
    DefaultUserRole.ADMIN,
  ];

  static ProjectOwnerAccess = [
    DefaultUserRole.PROJECT_OWNER,
    DefaultUserRole.ADMIN,
    DefaultUserRole.PROJECT_ADMIN,
  ];
}

//#endregion

/**
 * JWT Token signing types.
 */
export enum JwtTokenType {
  // For regular login
  USER_AUTHENTICATION = 'user-authentication',
  USER_RESET_PASSWORD = 'user-reset-password',
  USER_RESET_EMAIL = 'user-reset-email',
  USER_CONFIRM_EMAIL = 'user-confirm-email',
  USER_LOGIN_CAPTCHA = 'user-login-captcha',
  IPFS_TOKEN = 'IPFS-token',
  SPORRAN_SESSION = 'sporran-session',
  IDENTITY_VERIFICATION = 'identity-verification',
  // For initiating an auth session (OAuth window)
  AUTH_SESSION = 'auth-session',
  // Sent after OAuth flow has been completed, contains user email
  OAUTH_TOKEN = 'oauth-token',
  // Website review token
  WEBSITE_REVIEW_TOKEN = 'website-review',
  CRYPTO_PAYMENT_DATA = 'crypto-payment-data',
  EMBEDDED_WALLET_SDK_TOKEN = 'embedded-wallet-sdk-token',
}

/**
 * Quota codes
 * Must equal quota.id field in database!
 */
export enum QuotaCode {
  MAX_PROJECT_COUNT = 1,
  MAX_USERS_ON_PROJECT = 2,
  MAX_API_KEYS = 3,
  MAX_HOSTING_BUCKETS = 4,
  MAX_FILE_BUCKETS = 5,
  MAX_BUCKET_SIZE = 6,
  MAX_ATTESTED_USERS = 7,
  MAX_WEBSITES = 8,
  MAX_NFT_COLLECTIONS = 9,
  MAX_STORAGE = 10,
  MAX_BANDWIDTH = 11,
  MAX_ETHEREUM_NFT_COLLECTIONS = 12,
  MAX_EMBEDDED_WALLET_INTEGRATIONS = 13,
  MAX_EMBEDDED_WALLET_SIGNATURES = 14,
  MAX_RPC_KEYS = 15,
}

/**
 * Quota types
 * Must equal quota.type field in database!
 */
export enum QuotaType {
  FOR_OBJECT = 1,
  FOR_PROJECT = 2,
  FOR_PROJECT_AND_OBJECT = 3,
}

/* OAuth link type*/
export enum OauthLinkType {
  DISCORD = 1,
  TWEETER = 2,
  GITHUB = 3,
}

export enum CacheKeyPrefix {
  BUCKET_LIST = 'bucket-list',

  AUTH_USER_DATA = 'auth-user-data',

  ADMIN_USER_LIST = 'admin-user-list',
  ADMIN_PROJECT_LIST = 'admin-project-list',
  ADMIN_BUCKET_LIST = 'admin-bucket-list',
  ADMIN_WEBSITE_LIST = 'admin-website-list',
  ADMIN_NFTS_COLLECTION_LIST = 'admin-nfts-collection-list',
  ADMIN_GENERAL_SEARCH = 'admin-general-search',

  SOCIAL_SPACE_LIST = 'social-space-list',
  SOCIAL_POST_LIST = 'social-post-list',
  SOCIAL_SPACE_POST_LIST = 'social-space-post-list',

  // CONTRACTS
  CONTRACT_BY_UUID_WITH_LATEST_VERSION = 'contract-by-uuid-with-latest-version',
  CONTRACT_VERSION_BY_CONTRACT_UUID = 'contract-version-by-contract-uuid',
  CONTRACT_VERSION_BY_UUID_WITH_METHODS = 'contract-version-methods-by-version-contract-uuid',
  CONTRACT_DEPLOY_BY_UUID_WITH_VERSION = 'get-contract-by-uuid-deploy-with-version',

  // NFTS
  CONTRACT_VERSION = 'contract-version',
  CONTRACT_ABI = 'contract-abi',
  BLOCKCHAIN_ENDPOINT = 'blockchain-endpoint',

  PAYMENTS_SUBSCRIPTION_PACKAGES = 'payments-subscription-packages',
  PAYMENTS_CREDIT_PACKAGES = 'payments-credit-packages',
  PRODUCT_PRICE_LIST = 'product-price-list',
  PRODUCT_PRICE = 'product-price-list',

  PLATFORM_STATISTICS = 'platform-statistics',
  PROJECT_OVERVIEW = 'project-overview',
  SERVICE_STATUS = 'service-status',

  URL_SHORTENER = 'url-shortener',

  ACURAST_JOB = 'acurast-job',

  // DWELLIR
  DWELLIR_ACCESS_TOKEN = 'dwellir-access-token',

  EVM_TOKEN_PRICES = 'evm-token-prices',
}

export enum CacheKeyTTL {
  EXTRA_SHORT = 10, // 10 s
  SHORT = 60, // 1 min
  DEFAULT = 5 * 60, // 5 min
  EXTENDED = 10 * 60, // 10 min
  LONG = 30 * 60, // 30 min
  EXTRA_LONG = 60 * 60, // 60 min
  THREE_HOURS = 3 * 60 * 60, // 3 hours
}

export enum MongoCollections {
  ALERT = 'alert',
  ADMIN_ALERT = 'admin-alert',
  LOGS = 'logs',
  REQUEST_LOGS = 'request_logs',
  API_REQUEST_LOGS = 'api_request_logs',
  IPFS_TRAFFIC_LOG = 'ipfs-traffic-log',
  CLOUD_FUNCTION_CALL = 'cloud-function-call',
}

export enum ApiName {
  ADMIN_CONSOLE_API = 'admin-console-api',
  DEV_CONSOLE_API = 'dev-console-api',
  APILLON_API = 'apillon-api',
  AUTHENTICATION_API = 'authentication-api',
}

/**
 * List of products (codes), that requires payment with credits
 */
export enum ProductCode {
  HOSTING_WEBSITE = 1,
  HOSTING_DEPLOY_TO_STAGING = 2,
  HOSTING_DEPLOY_TO_PRODUCTION = 3,
  HOSTING_CHANGE_WEBSITE_DOMAIN = 4,

  NFT_MOONBEAM_COLLECTION = 5,
  NFT_MOONBASE_COLLECTION = 6,
  NFT_ASTAR_COLLECTION = 7,

  NFT_MOONBEAM_MINT = 8,
  NFT_MOONBASE_MINT = 9,
  NFT_ASTAR_MINT = 10,

  NFT_MOONBEAM_BURN = 11,
  NFT_MOONBASE_BURN = 12,
  NFT_ASTAR_BURN = 13,

  NFT_MOONBEAM_TRANSFER_COLLECTION = 14,
  NFT_MOONBASE_TRANSFER_COLLECTION = 15,
  NFT_ASTAR_TRANSFER_COLLECTION = 16,

  NFT_MOONBEAM_SET_BASE_URI = 17,
  NFT_MOONBASE_SET_BASE_URI = 18,
  NFT_ASTAR_SET_BASE_URI = 19,

  KILT_IDENTITY = 20,

  SOCIAL_SPACE = 21,
  SOCIAL_POST = 22,

  COMPUTING_SCHRODINGER_CREATE = 23,
  COMPUTING_SCHRODINGER_ASSIGN_CID_TO_NFT = 24,
  COMPUTING_SCHRODINGER_TRANSFER_OWNERSHIP = 25,

  NFT_ASTAR_WASM_COLLECTION = 26,
  NFT_ASTAR_WASM_MINT = 27,
  NFT_ASTAR_WASM_BURN = 28,
  NFT_ASTAR_WASM_TRANSFER_COLLECTION = 29,
  NFT_ASTAR_WASM_SET_BASE_URI = 30,

  OASIS_SIGNATURE = 31,

  NFT_ETHEREUM_COLLECTION = 32,
  NFT_ETHEREUM_MINT = 33,
  NFT_ETHEREUM_BURN = 34,
  NFT_ETHEREUM_TRANSFER_COLLECTION = 35,
  NFT_ETHEREUM_SET_BASE_URI = 36,

  NFT_SEPOLIA_COLLECTION = 37,
  NFT_SEPOLIA_MINT = 38,
  NFT_SEPOLIA_BURN = 39,
  NFT_SEPOLIA_TRANSFER_COLLECTION = 40,
  NFT_SEPOLIA_SET_BASE_URI = 41,

  CONTRACT_MOONBEAM_CREATE = 42,
  CONTRACT_MOONBASE_CREATE = 43,
  CONTRACT_ASTAR_CREATE = 44,
  CONTRACT_ETHEREUM_CREATE = 45,
  CONTRACT_SEPOLIA_CREATE = 46,

  CONTRACT_MOONBEAM_CALL = 47,
  CONTRACT_MOONBASE_CALL = 48,
  CONTRACT_ASTAR_CALL = 49,
  CONTRACT_ETHEREUM_CALL = 50,
  CONTRACT_SEPOLIA_CALL = 51,

  COMPUTING_JOB_CREATE = 52,
  // these 2 below are not used
  COMPUTING_JOB_SET_ENVIRONMENT = 53,
  COMPUTING_JOB_DELETE = 54,

  IPNS = 55,

  // UNIQUE NFTS
  NFT_UNIQUE_COLLECTION = 56,
  NFT_UNIQUE_MINT = 57,
  NFT_UNIQUE_BURN = 58,
  NFT_UNIQUE_TRANSFER_COLLECTION = 59,

  // Indexing
  INDEXER = 60,

  CONTRACT_BASE_CREATE = 61,
  CONTRACT_BASE_CALL = 62,
  CONTRACT_BASE_SEPOLIA_CREATE = 63,
  CONTRACT_BASE_SEPOLIA_CALL = 64,

  NFT_BASE_COLLECTION = 65,
  NFT_BASE_MINT = 66,
  NFT_BASE_BURN = 67,
  NFT_BASE_TRANSFER_COLLECTION = 68,
  NFT_BASE_SET_BASE_URI = 69,

  NFT_BASE_SEPOLIA_COLLECTION = 70,
  NFT_BASE_SEPOLIA_MINT = 71,
  NFT_BASE_SEPOLIA_BURN = 72,
  NFT_BASE_SEPOLIA_TRANSFER_COLLECTION = 73,
  NFT_BASE_SEPOLIA_SET_BASE_URI = 74,

  NFT_ARBITRUM_ONE_COLLECTION = 75,
  NFT_ARBITRUM_ONE_MINT = 76,
  NFT_ARBITRUM_ONE_BURN = 77,
  NFT_ARBITRUM_ONE_TRANSFER_COLLECTION = 78,
  NFT_ARBITRUM_ONE_SET_BASE_URI = 79,

  NFT_ARBITRUM_ONE_SEPOLIA_COLLECTION = 80,
  NFT_ARBITRUM_ONE_SEPOLIA_MINT = 81,
  NFT_ARBITRUM_ONE_SEPOLIA_BURN = 82,
  NFT_ARBITRUM_ONE_SEPOLIA_TRANSFER_COLLECTION = 83,
  NFT_ARBITRUM_ONE_SEPOLIA_SET_BASE_URI = 84,

  NFT_AVALANCHE_COLLECTION = 85,
  NFT_AVALANCHE_MINT = 86,
  NFT_AVALANCHE_BURN = 87,
  NFT_AVALANCHE_TRANSFER_COLLECTION = 88,
  NFT_AVALANCHE_SET_BASE_URI = 89,

  NFT_AVALANCHE_FUJI_COLLECTION = 90,
  NFT_AVALANCHE_FUJI_MINT = 91,
  NFT_AVALANCHE_FUJI_BURN = 92,
  NFT_AVALANCHE_FUJI_TRANSFER_COLLECTION = 93,
  NFT_AVALANCHE_FUJI_SET_BASE_URI = 94,

  NFT_OPTIMISM_COLLECTION = 95,
  NFT_OPTIMISM_MINT = 96,
  NFT_OPTIMISM_BURN = 97,
  NFT_OPTIMISM_TRANSFER_COLLECTION = 98,
  NFT_OPTIMISM_SET_BASE_URI = 99,

  NFT_OPTIMISM_SEPOLIA_COLLECTION = 100,
  NFT_OPTIMISM_SEPOLIA_MINT = 101,
  NFT_OPTIMISM_SEPOLIA_BURN = 102,
  NFT_OPTIMISM_SEPOLIA_TRANSFER_COLLECTION = 103,
  NFT_OPTIMISM_SEPOLIA_SET_BASE_URI = 104,

  NFT_POLYGON_COLLECTION = 105,
  NFT_POLYGON_MINT = 106,
  NFT_POLYGON_BURN = 107,
  NFT_POLYGON_TRANSFER_COLLECTION = 108,
  NFT_POLYGON_SET_BASE_URI = 109,

  NFT_POLYGON_AMOY_COLLECTION = 110,
  NFT_POLYGON_AMOY_MINT = 111,
  NFT_POLYGON_AMOY_BURN = 112,
  NFT_POLYGON_AMOY_TRANSFER_COLLECTION = 113,
  NFT_POLYGON_AMOY_SET_BASE_URI = 114,

  // Contracts for ARBITRUM_ONE
  CONTRACT_ARBITRUM_ONE_CREATE = 115,
  CONTRACT_ARBITRUM_ONE_CALL = 116,
  CONTRACT_ARBITRUM_ONE_SEPOLIA_CREATE = 117,
  CONTRACT_ARBITRUM_ONE_SEPOLIA_CALL = 118,

  // Contracts for AVALANCHE
  CONTRACT_AVALANCHE_CREATE = 119,
  CONTRACT_AVALANCHE_CALL = 120,
  CONTRACT_AVALANCHE_SEPOLIA_CREATE = 121,
  CONTRACT_AVALANCHE_SEPOLIA_CALL = 122,

  // Contracts for OPTIMISM
  CONTRACT_OPTIMISM_CREATE = 123,
  CONTRACT_OPTIMISM_CALL = 124,
  CONTRACT_OPTIMISM_SEPOLIA_CREATE = 125,
  CONTRACT_OPTIMISM_SEPOLIA_CALL = 126,

  // Contracts for POLYGON
  CONTRACT_POLYGON_CREATE = 127,
  CONTRACT_POLYGON_CALL = 128,
  CONTRACT_POLYGON_AMOY_CREATE = 129,
  CONTRACT_POLYGON_AMOY_CALL = 130,
}
export enum ProductService {
  HOSTING = 'HOSTING',
  NFT = 'NFT',
  IDENTITY = 'IDENTITY',
  SOCIAL = 'SOCIAL',
  COMPUTING = 'COMPUTING',
  STORAGE = 'STORAGE',
  CONTRACTS = 'CONTRACTS',
  WALLET = 'WALLET',
  INDEXING = 'INDEXING',
}

export enum ProductCategory {
  WEBSITE = 'WEBSITE',
  // NFTS
  MOONBASE_NFT = 'MOONBASE_NFT',
  MOONBEAM_NFT = 'MOONBEAM_NFT',
  ASTAR_NFT = 'ASTAR_NFT',
  ASTAR_SUBSTRATE_NFT = 'ASTAR_SUBSTRATE_NFT',
  KILT_IDENTITY = 'KILT_IDENTITY',
  GRILLCHAT = 'GRILLCHAT',
  SCHRODINGER = 'SCHRODINGER',
  ETHEREUM_NFT = 'ETHEREUM_NFT',
  SEPOLIA_NFT = 'SEPOLIA_NFT',
  BASE_NFT = 'BASE_NFT',
  BASE_SEPOLIA_NFT = 'BASE_SEPOLIA_NFT',
  ARBITRUM_ONE_NFT = 'ARBITRUM_ONE_NFT',
  ARBITRUM_ONE_SEPOLIA_NFT = 'ARBITRUM_ONE_SEPOLIA_NFT',
  AVALANCHE_NFT = 'AVALANCHE_NFT',
  AVALANCHE_FUJI_NFT = 'AVALANCHE_FUJI_NFT',
  OPTIMISM_NFT = 'OPTIMISM_NFT',
  OPTIMISM_SEPOLIA_NFT = 'OPTIMISM_SEPOLIA_NFT',
  POLYGON_NFT = 'POLYGON_NFT',
  POLYGON_AMOY_NFT = 'POLYGON_AMOY_NFT',

  // CONTRACTS
  ETHEREUM_CONTRACT = 'ETHEREUM_CONTRACT',
  SEPOLIA_CONTRACT = 'SEPOLIA_CONTRACT',
  MOONBASE_CONTRACT = 'MOONBASE_CONTRACT',
  MOONBEAM_CONTRACT = 'MOONBEAM_CONTRACT',
  ASTAR_CONTRACT = 'ASTAR_CONTRACT',
  BASE_CONTRACT = 'BASE_CONTRACT',
  BASE_CONTRACT_SEPOLIA = 'BASE_CONTRACT_SEPOLIA',
  ARBITRUM_ONE_CONTRACT = 'ARBITRUM_ONE_CONTRACT',
  ARBITRUM_ONE_SEPOLIA_CONTRACT = 'ARBITRUM_ONE_SEPOLIA_CONTRACT',
  AVALANCHE_CONTRACT = 'AVALANCHE_CONTRACT',
  AVALANCHE_FUJI_CONTRACT = 'AVALANCHE_FUJI_CONTRACT',
  OPTIMISM_CONTRACT = 'OPTIMISM_CONTRACT',
  OPTIMISM_SEPOLIA_CONTRACT = 'OPTIMISM_SEPOLIA_CONTRACT',
  POLYGON_CONTRACT = 'POLYGON_CONTRACT',
  POLYGON_AMOY_CONTRACT = 'POLYGON_AMOY_CONTRACT',
  ACURAST = 'ACURAST',
  IPNS = 'IPNS',
  SIGNATURE = 'SIGNATURE',
  UNIQUE_NFT = 'UNIQUE_NFT',
  INDEXER = 'INDEXER',
}

export enum EmailTemplate {
  WELCOME = 'welcome',
  RESET_PASSWORD = 'reset-password',
  NEW_USER_ADDED_TO_PROJECT = 'new-user-added-to-project',
  USER_ADDED_TO_PROJECT = 'user-added-to-project',
  RPC_USAGE_EXCEEDED = 'rpc-usage-exceeded',

  CONTACT_US_FORM = 'contact-us-form',

  WEBSITE_DEPLOYMENT_REJECTED = 'website-deployment-rejected',
  STORAGE_QUOTA_EXCEEDED = 'storage-quota-exceeded',

  GENERATE_IDENTITY = 'generate-identity',
  RESTORE_CREDENTIAL = 'restore-credential',
  REVOKE_DID = 'revoke-did',
  DOWNLOAD_IDENTITY = 'download-identity',

  CRYPTO_PAYMENT_SUCCESSFUL = 'crypto-payment-successful',

  CREDIT_BALANCE_BELOW_THRESHOLD = 'credit-balance-below-threshold',

  IPFS_BANDWIDTH_NEAR_QUOTA = 'ipfs-bandwidth-near-quota',
  IPFS_BANDWIDTH_EXCEEDED_QUOTA = 'ipfs-bandwidth-exceeded-quota',

  OTP_VERIFICATION = 'otp-verification',
}

export enum JwtExpireTime {
  ONE_DAY = '1d',
  ONE_HOUR = '1h',
  TEN_MINUTES = '10m',
  TWENTY_MINUTES = '20m',
  FIVE_MINUTES = '5m',
  NEVER = 'never',
}

export enum SubscriptionPackageId {
  FREEMIUM = 1,
  CATERPILLAR = 2,
  COCOON = 3,
  BUTTERFLY = 4,
  RPC_PLAN = 5,
}

export enum NotificationType {
  UNKNOWN = 0,
}

export enum HttpStatus {
  BAD_REQUEST = 400,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
}

export enum NftWebsiteType {
  PLAIN_JS = 1,
  REACT = 2,
  VUE = 3,
}
