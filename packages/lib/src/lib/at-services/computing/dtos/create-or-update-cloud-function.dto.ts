import { ModelBase, prop } from '../../../base-models/base';
import { stringParser } from '@rawmodel/parsers';
import { presenceValidator, stringLengthValidator } from '@rawmodel/validators';
import {
  PopulateFrom,
  SerializeFor,
  ValidatorErrorCode,
} from '../../../../config/types';
import { BaseComputingEntityDto } from './base-computing-entity.dto';

export class CreateCloudFunctionDto extends BaseComputingEntityDto {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.COMPUTING_FIELD_NOT_PRESENT,
      },
    ],
  })
  public project_uuid: string;
}

export class UpdateCloudFunctionDto extends BaseComputingEntityDto {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
  })
  public function_uuid: string;
}
