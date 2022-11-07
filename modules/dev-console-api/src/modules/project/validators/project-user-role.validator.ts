import { DefaultUserRole, ModelBase } from '@apillon/lib';

/**
 * Validate Role_id
 * @returns
 */
export function projectUserRolesValidator() {
  return async function (this: ModelBase, value: any): Promise<boolean> {
    return !!DefaultUserRole[value];
  };
}
