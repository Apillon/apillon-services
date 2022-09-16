import { MySql } from './database/mysql';

export class Context {
  public mysql: MySql;
  //TODO - assign actual user model
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
}
