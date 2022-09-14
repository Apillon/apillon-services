// /* eslint-disable @typescript-eslint/member-ordering */
// import { prop } from '@rawmodel/core';
// import { integerParser, stringParser } from '@rawmodel/parsers';
// import { emailValidator, presenceValidator } from '@rawmodel/validators';
// import { DbModelStatus, getQueryParams, MySqlUtil, PopulateFor, selectAndCountQuery, SerializeFor, uniqueFieldWithIdValidator } from 'kalmia-sql-lib';
// import { BaseApiModel, Context, getConnection } from '../../../common';
// import { DbTables, DefaultUserRole, ValidatorErrorCode } from '../../../config/types';

// /**
//  * User model.
//  */
// export class User extends BaseApiModel {
//   /**
//    * User's table.
//    */
//   tableName = DbTables.USER;

//   /**
//    * User's name (first name + last name) property definition.
//    */
//   @prop({
//     parser: { resolver: stringParser() },
//     populatable: [PopulateFor.ALL, PopulateFor.DB],
//     serializable: [SerializeFor.ALL, SerializeFor.INSERT_DB, SerializeFor.UPDATE_DB],
//     validators: [
//       {
//         resolver: presenceValidator(),
//         code: ValidatorErrorCode.USER_NAME_NOT_PRESENT,
//       },
//     ],
//     fakeValue: 'John Snow',
//   })
//   public name: string;

//   /**
//    * User's UUID used for synchronization with microservices
//    */
//   @prop({
//     parser: { resolver: stringParser() },
//     populatable: [PopulateFor.ALL, PopulateFor.DB],
//     serializable: [SerializeFor.ALL, SerializeFor.INSERT_DB],
//     fakeValue: 'Smith',
//   })
//   public user_uuid: string;

//   /**
//    * Phone number
//    */
//   @prop({
//     parser: { resolver: stringParser() },
//     populatable: [PopulateFor.ALL, PopulateFor.DB],
//     serializable: [SerializeFor.ALL, SerializeFor.INSERT_DB, SerializeFor.UPDATE_DB],

//     fakeValue: '+386 41 885 885',
//   })
//   public phone: string;

//   /**
//    * User wallet address
//    */
//   @prop({
//     parser: { resolver: stringParser() },
//     populatable: [PopulateFor.ALL, PopulateFor.DB],
//     serializable: [SerializeFor.ALL, SerializeFor.INSERT_DB, SerializeFor.UPDATE_DB],
//   })
//   public wallet: string;

//   /**
//    * Marks user and its auth data as deleted.
//    *
//    * @returns User (this)
//    */
//   public async delete(): Promise<this> {
//     const { sql, conn } = await getConnection();
//     const context = this.getContext();

//     try {
//       await super.delete({ conn, context });
//       //await this.authUser.delete({ conn, context });
//       await sql.commit(conn);
//     } catch (error) {
//       await sql.rollback(conn);
//       throw new Error(error);
//     }

//     return this;
//   }

//   /**
//    * Populates user by its ID field.
//    *
//    * @param userId User ID
//    * @returns User (this)
//    */
//   public async populateById(userId: number): Promise<this> {
//     if (!userId) {
//       return this.reset();
//     }

//     const data = await new User().populateById(userId);
//     if (data) {
//       this.populate(data, PopulateFor.DB);
//       return this;
//     } else {
//       return this.reset();
//     }
//   }
// }
