import { ModelBase, prop } from '../../../base-models/base';
import { faker } from '@faker-js/faker';
import { integerParser, stringParser } from '@rawmodel/parsers';
import { presenceValidator } from '@rawmodel/validators';
import {
  PopulateFrom,
  SerializeFor,
  ValidatorErrorCode,
} from '../../../../config/types';

export class UserDTO extends ModelBase {}
