import { DefaultApiKeyRole, ModelBase } from '@apillon/lib';

/**
 * Validate Role_id
 * @returns
 */
export function apiKeyRolesValidator() {
  return async function (this: ModelBase, value: any): Promise<boolean> {
    return !!DefaultApiKeyRole[value];
  };
}
