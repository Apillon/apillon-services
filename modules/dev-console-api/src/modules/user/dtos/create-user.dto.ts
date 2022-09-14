// import { ApiProperty } from '@nestjs/swagger';
// import { Model, prop } from '@rawmodel/core';
// import { integerParser, stringParser } from '@rawmodel/parsers';
// import { emailValidator, presenceValidator, stringLengthValidator } from '@rawmodel/validators';
// import { PopulateFor, uniqueFieldValidator } from 'kalmia-sql-lib';
// import { ValidatorErrorCode } from '../../../config/types';

// export class CreateUserDto extends Model<any> {
//   @ApiProperty({ required: false })
//   @prop({
//     parser: { resolver: stringParser() },
//     populatable: [PopulateFor.ALL],
//     validators: [
//       {
//         resolver: emailValidator(),
//         code: ValidatorErrorCode.CREATE_USER_DTO_EMAIL_NOT_VALID,
//       },
//       /*{
//         resolver: uniqueFieldValidator(AuthDbTables.USERS, 'email'),
//         code: ValidatorErrorCode.CREATE_USER_DTO_EMAIL_ALREADY_TAKEN
//       }*/
//     ],
//   })
//   public email: string;

//   @prop({
//     parser: { resolver: stringParser() },
//     populatable: [PopulateFor.ALL, PopulateFor.DB],
//   })
//   public wallet: string;

//   @ApiProperty()
//   @prop({
//     parser: { resolver: stringParser() },
//     populatable: [PopulateFor.ALL],
//     validators: [
//       {
//         resolver: presenceValidator(),
//         code: ValidatorErrorCode.CREATE_USER_DTO_LAST_NAME_NOT_PRESENT,
//       },
//     ],
//   })
//   public name: string;

//   @ApiProperty({ required: false })
//   @prop({
//     parser: { resolver: stringParser() },
//     populatable: [PopulateFor.ALL, PopulateFor.DB],
//   })
//   public phone: string;
// }
