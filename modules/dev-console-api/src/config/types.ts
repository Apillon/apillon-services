export enum DbTables {
  USER = 'user',
  PROJECT = 'project',
  SERVICE_TYPE = 'service_type',
  SERVICE_STATUS = 'service_status',
  SERVICE = 'service',
  PROJECT_USER = 'project_user',
  PROJECT_USER_PENDING_INVITATION = 'project_user_pending_invitation',
  NOTIFICATION = 'notification',
}

/**
 * Validation error codes - 42204000.
 */
export enum ValidatorErrorCode {
  DEFAULT_VALIDATION_ERROR = 42204000,
  TOKEN_NOT_PRESENT = 42204001,
  USER_PASSWORD_TOO_SHORT = 42204100,
  USER_UUID_NOT_PRESENT = 42204102,
  USER_EMAIL_NOT_PRESENT = 42204103,
  USER_EMAIL_NOT_VALID = 42204104,
  USER_EMAIL_ALREADY_TAKEN = 42204105,
  USER_PASSWORD_NOT_PRESENT = 42204106,
  USER_INVALID_LOGIN = 42204107,
  USER_KILT_PRESENTATION_NOT_PRESENT = 42204108,
  CAPTCHA_NOT_PRESENT = 42204109,
  USER_WALLET_ADDRESS_NOT_PRESENT = 42204112,
  USER_AUTH_SIGNATURE_NOT_PRESENT = 42204113,
  USER_AUTH_TIMESTAMP_NOT_PRESENT = 42204114,
  USER_CONSENT_IS_REQUIRED = 42204115,
  PROJECT_NAME_NOT_PRESENT = 42204201,
  PROJECT_UUID_NOT_PRESENT = 42204202,
  PROJECT_ID_NOT_PRESENT = 42204203,
  SERVICE_NAME_NOT_PRESENT = 42204301,
  SERVICE_TYPE_NOT_PRESENT = 42204302,
  SERVICE_UUID_NOT_PRESENT = 42204303,
  SERVICE_PROJECT_ID_NOT_PRESENT = 42204304,
  SERVICE_NOT_IN_THIS_PROJECT = 42204305,
  SERVICE_TYPE_ID_NOT_VALID = 42204306,
  FILE_NAME_NOT_PRESENT = 42204401,
  FILE_EXTENSION_NOT_PRESENT = 42204402,
  FILE_CONTENT_TYPE_NOT_PRESENT = 42204403,
  FILE_VERSION_NOT_PRESENT = 42204404,
  FILE_BODY_NOT_PRESENT = 42204405,
  INSTRUCTION_NAME_NOT_PRESENT = 42204501,
  INSTRUCTION_ENUM_NOT_PRESENT = 42204502,
  INSTRUCTION_FORROUTE_NOT_PRESENT = 42204503,
  INSTRUCTION_ENUM_EXISTS = 42204504,
  INSTRUCTION_TYPE_NOT_PRESENT = 42204505,
  INSTRUCTION_HTML_CONTENT_NOT_PRESENT = 42204506,
  INSTRUCTION_FOR_ROUTE_NOT_PRESENT = 42204507,
  PROJECT_USER_USER_ID_NOT_PRESENT = 42204601,
  PROJECT_USER_PROJECT_ID_NOT_PRESENT = 42204602,
  PROJECT_USER_ACTION_NOT_PRESENT = 42204603,
  PROJECT_USER_INVALID_ACTION = 42204604,
  PROJECT_USER_RELATION_EXISTS = 42204605,
  PROJECT_USER_EMAIL_NOT_PRESENT = 42204606,
  PROJECT_USER_ROLE_ID_NOT_PRESENT = 42204607,
  PROJECT_USER_ROLE_ID_NOT_VALID = 42204608,
  UPDATE_ROLE_ON_PROJECT_ROLE_ID_NOT_PRESENT = 42204611,
  PACKAGE_ID_NOT_PRESENT = 42204612,
  RETURN_URL_NOT_PRESENT = 42204613,
  CONTACT_FORM_DATA_NOT_PRESENT = 42204614,
}

/**
 * Resource not found error codes - 40404000.
 */
export enum ResourceNotFoundErrorCode {
  DEFAULT_RESOURCE_NOT_FOUND_ERROR = 40404000,
  USER_DOES_NOT_EXISTS = 40404001,
  PROJECT_DOES_NOT_EXISTS = 40404002,
  SERVICE_DOES_NOT_EXIST = 40404003,
  FILE_DOES_NOT_EXISTS = 40404004,
  FILE_DOES_NOT_EXISTS_IN_BUCKET = 40404005,
  INSTRUCTION_DOES_NOT_EXIST = 40404006,
  PROJECT_USER_DOES_NOT_EXIST = 40404007,
  USER_EMAIL_NOT_EXISTS = 40404008,
  STRIPE_CUSTOMER_DOES_NOT_EXIST = 40404009,
  CREDIT_PACKAGE_DOES_NOT_EXIST = 40404010,
  SERVICE_STATUS_DOES_NOT_EXISTS = 40404011,
  NOTIFICATION_DOES_NOT_EXISTS = 40404012,
}

/**
 * Conflict error codes - 40904000.
 */
export enum ConflictErrorCode {
  DEFAULT_CONFLICT_ERROR = 40904000,
  USER_ALREADY_ON_PROJECT = 40904001,
}

/**
 * Bad request error codes - 40004000.
 */
export enum BadRequestErrorCode {
  DEFAULT_BAD_REQUEST_ERROR = 40004000,
  CANNOT_MODIFY_PROJECT_OWNER = 40004001,
  ROLE_ON_PROJECT_ALREADY_ASSIGNED = 40004002,
  INVALID_SERVICE_STATUS_TYPE = 40004003,
  MAX_NUMBER_OF_PROJECTS_REACHED = 40004100,
  MAX_NUMBER_OF_USERS_ON_PROJECT_REACHED = 40004101,
  INVALID_WEBHOOK_SIGNATURE = 40004200,
  INVALID_TOKEN_PAYLOAD = 40004201,
  INVALID_NOTIFICATION_TYPE = 40004300,
}

/**
 * Forbidden error codes - 40304000.
 */
export enum ForbiddenErrorCode {
  DEFAULT_FORBIDDEN_ERROR = 40304000,
  NOT_EMBEDDED_WALLET = 40304001,
}

/**
 * Server error codes - 50004000.
 */
export enum ServerErrorCode {
  ERROR_HANDLING_CRYPTO_WEBHOOK = 50004000,
  ERROR_CREATING_CRYPTO_PAYMENT_SESSION = 50004001,
}

/**
 * Instruction Type Enum { Helper, Video, Q&A }
 */
export enum InstructionType {
  INSTRUCTION = 1,
  INFO = 2,
  W3_WARN = 3,
  VIDEO = 4,
  WIKI = 5,
}

/**
 * Service Status Type Enum { Info, Error, Warning }
 */
export enum ServiceStatusType {
  INFO = 1,
  ERROR = 2,
  WARNING = 3,
}

export type GitHubWebhookPayload = {
  ref: string;
  before: string;
  after: string;
  repository: {
    id: number;
    node_id: string;
    name: string;
    full_name: string;
    private: boolean;
    owner: {
      name: string;
      email: string;
      login: string;
      id: number;
      node_id: string;
      avatar_url: string;
      gravatar_id: string;
      url: string;
      html_url: string;
      followers_url: string;
      following_url: string;
      gists_url: string;
      starred_url: string;
      subscriptions_url: string;
      organizations_url: string;
      repos_url: string;
      events_url: string;
      received_events_url: string;
      type: string;
      user_view_type: string;
      site_admin: boolean;
    };
    html_url: string;
    description: string | null;
    fork: boolean;
    url: string;
    forks_url: string;
    keys_url: string;
    collaborators_url: string;
    teams_url: string;
    hooks_url: string;
    issue_events_url: string;
    events_url: string;
    assignees_url: string;
    branches_url: string;
    tags_url: string;
    blobs_url: string;
    git_tags_url: string;
    git_refs_url: string;
    trees_url: string;
    statuses_url: string;
    languages_url: string;
    stargazers_url: string;
    contributors_url: string;
    subscribers_url: string;
    subscription_url: string;
    commits_url: string;
    git_commits_url: string;
    comments_url: string;
    issue_comment_url: string;
    contents_url: string;
    compare_url: string;
    merges_url: string;
    archive_url: string;
    downloads_url: string;
    issues_url: string;
    pulls_url: string;
    milestones_url: string;
    notifications_url: string;
    labels_url: string;
    releases_url: string;
    deployments_url: string;
    created_at: number;
    updated_at: string;
    pushed_at: number;
    git_url: string;
    ssh_url: string;
    clone_url: string;
    svn_url: string;
    homepage: string | null;
    size: number;
    stargazers_count: number;
    watchers_count: number;
    language: string;
    has_issues: boolean;
    has_projects: boolean;
    has_downloads: boolean;
    has_wiki: boolean;
    has_pages: boolean;
    has_discussions: boolean;
    forks_count: number;
    mirror_url: string | null;
    archived: boolean;
    disabled: boolean;
    open_issues_count: number;
    license: string | null;
    allow_forking: boolean;
    is_template: boolean;
    web_commit_signoff_required: boolean;
    topics: string[];
    visibility: string;
    forks: number;
    open_issues: number;
    watchers: number;
    default_branch: string;
    stargazers: number;
    master_branch: string;
  };
  pusher: {
    name: string;
    email: string;
  };
  sender: {
    login: string;
    id: number;
    node_id: string;
    avatar_url: string;
    gravatar_id: string;
    url: string;
    html_url: string;
    followers_url: string;
    following_url: string;
    gists_url: string;
    starred_url: string;
    subscriptions_url: string;
    organizations_url: string;
    repos_url: string;
    events_url: string;
    received_events_url: string;
    type: string;
    user_view_type: string;
    site_admin: boolean;
  };
  created: boolean;
  deleted: boolean;
  forced: boolean;
  base_ref: string | null;
  compare: string;
  commits: Array<{
    id: string;
    tree_id: string;
    distinct: boolean;
    message: string;
    timestamp: string;
    url: string;
    author: {
      name: string;
      email: string;
      username: string;
    };
    committer: {
      name: string;
      email: string;
      username: string;
    };
    added: string[];
    removed: string[];
    modified: string[];
  }>;
  head_commit: {
    id: string;
    tree_id: string;
    distinct: boolean;
    message: string;
    timestamp: string;
    url: string;
    author: {
      name: string;
      email: string;
      username: string;
    };
    committer: {
      name: string;
      email: string;
      username: string;
    };
    added: string[];
    removed: string[];
    modified: string[];
  };
};
