import { MySql } from 'at-lib';

export class Context {
  public mysql: MySql;
  //TODO - assign actual user model
  public user: any;

  public setMySql(mysql: MySql): void {
    this.mysql = mysql;
  }
}
