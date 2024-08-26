import {
  CreateOrUpdateNotificationDto as CreateNotificationDtoService,
  PopulateFrom,
  SerializeFor,
  prop,
} from '@apillon/lib';
import { stringParser } from '@rawmodel/parsers';
export class CreateOrUpdateNotificationDto extends CreateNotificationDtoService {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE],
    serializable: [SerializeFor.SERVICE, SerializeFor.ADMIN],
  })
  public userEmail?: string;
}
