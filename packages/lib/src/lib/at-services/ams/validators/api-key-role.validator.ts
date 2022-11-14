import { DefaultApiKeyRole } from '../../../../config/types';
import { ModelBase } from '../../../base-models/base';

/**
 * Validate Role_id
 * @returns
 */
export function apiKeyRolesValidator() {
  return async function (this: ModelBase, value: any): Promise<boolean> {
    return !!DefaultApiKeyRole[value];
  };
}
