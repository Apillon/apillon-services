/* eslint-disable @typescript-eslint/member-ordering */
import { prop } from '@rawmodel/core';
import { stringParser } from '@rawmodel/parsers';
import { presenceValidator } from '@rawmodel/validators';
import { AdvancedSQLModel, PopulateFrom, SerializeFor } from 'at-lib';
import { DbTables, ValidatorErrorCode } from '../../../config/types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Service model.
 */
export class Service extends AdvancedSQLModel {
  collectionName = DbTables.SERVICE;
}
