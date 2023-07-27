import { MySql } from './database/mysql';
import { v4 as uuid } from 'uuid';
import { CodeException } from './exceptions/exceptions';
import { ValidatorErrorCode } from '../config/types';

export class Context {
  public mysql: MySql;
  public user: any;
  public requestId: string;
  public apiKey: any;

  constructor(reqId: string = null) {
    this.requestId = reqId || uuid();
  }

  /**
   * Tells if current user is authenticated.
   */
  public isAuthenticated(): boolean {
    return !!this.user && this.user.exists() && this.user.isEnabled();
  }

  public setMySql(mysql: MySql): void {
    this.mysql = mysql;
  }

  /**
   * Check if user or apiKey has required roles - normally to call an endpoint
   * @param role
   * @returns
   */
  public hasRole(role: number | number[]) {
    if (this.apiKey) {
      //Check API roles
      return !!this.apiKey.apiKeyRoles.find((x) => x.role_id == role);
    } else if (this.user) {
      //Check user roles
      if (Array.isArray(role)) {
        //Check if user has one of required roles
        for (const r of role) {
          if (this.user.authUser.authUserRoles.find((x) => x.role.id == r)) {
            return true;
          }
        }
        return false;
      }
      //Check if user has specific role
      else {
        return !!this.user.authUser.authUserRoles.find(
          (x) => x.role.id == role,
        );
      }
    }

    return false;
  }

  public hasPermission(permission: number) {
    if (this.user) {
      return !!this.user.userPermissions.find((x) => x == permission);
    }
    return false;
  }

  /**
   * Check if apiKey or user has permission to access this specific record in project
   * @param role required role/roles
   * @param project_uuid project for which we are checking the roles
   * @returns
   */
  public hasRoleOnProject(role: number | number[], project_uuid: string) {
    if (!project_uuid) {
      throw new Error('project_uuid not present!');
    }
    //If call is made through api key
    if (this.apiKey) {
      if (this.apiKey.project_uuid == project_uuid) {
        return true;
      }
    } else {
      //If call was made by user (dev-console)
      if (Array.isArray(role)) {
        if (this.user) {
          //Check if user has one of required roles
          for (const r of role) {
            if (
              this.user.authUser.authUserRoles
                .filter((x) => x.project_uuid == project_uuid)
                .find((x) => x.role.id == r)
            ) {
              return true;
            }
          }
        }

        return false;
      }
      //Check if user has specific role
      else {
        return !!this.user?.authUser?.authUserRoles
          .filter((x) => x.project_uuid == project_uuid)
          .find((x) => x.role.id == role);
      }
    }
    return false;
  }

  /**
   * Checks if api key has role for specific service type (auth, storage...)
   * @param role
   * @param serviceType
   * @returns
   */
  public hasApiKeyRoleForServiceType(role: number, serviceType: number) {
    if (this.apiKey) {
      //Check API roles
      return !!this.apiKey.apiKeyRoles?.find(
        (x) => x.role_id == role && x.serviceType_id == serviceType,
      );
    }
    return false;
  }
}
