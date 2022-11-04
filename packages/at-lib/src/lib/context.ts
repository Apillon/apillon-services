import { MySql } from './database/mysql';

export class Context {
  public mysql: MySql;
  public user: any;

  /**
   * Tells if current user is authenticated.
   */
  public isAuthenticated(): boolean {
    return !!this.user && this.user.exists() && this.user.isEnabled();
  }

  public setMySql(mysql: MySql): void {
    this.mysql = mysql;
  }

  public hasRole(role: number | number[]) {
    if (Array.isArray(role)) {
      //Check if user has one of required roles
      for (const r of role) {
        if (this.user.authUser.authUserRoles.find((x) => x.role.id == r))
          return true;
      }
      return false;
    }
    //Check if user has specific role
    else
      return !!this.user.authUser.authUserRoles.find((x) => x.role.id == role);
  }

  public hasRoleOnProject(role: number | number[], project_uuid: string) {
    if (Array.isArray(role)) {
      //Check if user has one of required roles
      for (const r of role) {
        if (
          this.user.authUser.authUserRoles
            .filter((x) => x.project_uuid == project_uuid)
            .find((x) => x.role.id == r)
        )
          return true;
      }
      return false;
    }
    //Check if user has specific role
    else
      return !!this.user.authUser.authUserRoles
        .filter((x) => x.project_uuid == project_uuid)
        .find((x) => x.role.id == role);
  }
}
