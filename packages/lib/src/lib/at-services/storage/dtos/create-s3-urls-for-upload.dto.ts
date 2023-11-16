import { stringParser } from '@rawmodel/parsers';
import { arrayLengthValidator, presenceValidator } from '@rawmodel/validators';
import {
  PopulateFrom,
  SerializeFor,
  ValidatorErrorCode,
} from '../../../../config/types';
import { ModelBase, prop } from '../../../base-models/base';

export class UploadFileMetadataDto extends ModelBase {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    setter(value: string) {
      if (value && value.length > 0) {
        value = value.replace(/^\/+/g, '');
        value += value.endsWith('/') ? '' : '/';
      }
      return value;
    },
    validators: [],
  })
  public path: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.FILE_NAME_NOT_PRESENT,
      },
    ],
  })
  public fileName: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    validators: [],
  })
  public contentType: string;

  /****************************************
   *  Used for response
   * ****************************************************/
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    validators: [],
  })
  public url: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    validators: [],
  })
  public file_uuid: string;
}

export class CreateS3UrlsForUploadDto extends ModelBase {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    validators: [],
  })
  public bucket_uuid: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    validators: [],
  })
  public session_uuid: string;

  @prop({
    parser: { resolver: UploadFileMetadataDto, array: true },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.FILES_PROPERTY_NOT_PRESENT,
      },
      // {
      //   resolver: arrayLengthValidator({ minOrEqual: 1, maxOrEqual: 200 }),
      //   code: ValidatorErrorCode.INVALID_FILES_LENGTH,
      // },
    ],
  })
  public files: UploadFileMetadataDto[];
}

export class ApillonApiCreateS3UrlsForUploadDto extends ModelBase {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    validators: [],
  })
  public bucket_uuid: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    validators: [],
  })
  public sessionUuid: string;

  @prop({
    parser: { resolver: UploadFileMetadataDto, array: true },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.FILES_PROPERTY_NOT_PRESENT,
      },
      // {
      //   resolver: arrayLengthValidator({ minOrEqual: 1, maxOrEqual: 200 }),
      //   code: ValidatorErrorCode.INVALID_FILES_LENGTH,
      // },
    ],
  })
  public files: UploadFileMetadataDto[];
}

export class ApillonHostingApiCreateS3UrlsForUploadDto extends ModelBase {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    validators: [],
  })
  public website_uuid: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    validators: [],
  })
  public sessionUuid: string;

  @prop({
    parser: { resolver: UploadFileMetadataDto, array: true },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.FILES_PROPERTY_NOT_PRESENT,
      },
      // {
      //   resolver: arrayLengthValidator({ minOrEqual: 1, maxOrEqual: 200 }),
      //   code: ValidatorErrorCode.INVALID_FILES_LENGTH,
      // },
    ],
  })
  public files: UploadFileMetadataDto[];
}
