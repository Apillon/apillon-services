import { DefaultUserRole, ModelBase } from 'at-lib';

/**
 * Validate Role_id
 * @returns
 */
export function projectUserRolesValidator() {
  return async function (this: ModelBase, value: any): Promise<boolean> {
    return !!DefaultUserRole[value];
  };
}
