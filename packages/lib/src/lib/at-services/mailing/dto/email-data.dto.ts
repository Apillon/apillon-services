import { arrayParser, stringParser } from '@rawmodel/parsers';
import {
  EmailTemplate,
  PopulateFrom,
  SerializeFor,
} from '../../../../config/types';
import { ModelBase, prop } from '../../../base-models/base';

export class EmailDataDto extends ModelBase {
  @prop({
    parser: { resolver: arrayParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
  })
  public mailAddresses: string[];

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
  })
  public subject: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
  })
  public templateName: EmailTemplate;

  @prop({
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    defaultValue: {},
  })
  public templateData: any;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
  })
  public senderName: string;

  @prop({
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
  })
  // typeof nodemailer/lib/mailer.Attachment
  public attachments: any[];

  /**
   * If an attachment needs to be generated from an HTML template,
   * populate this property with the name of the template.
   */
  @prop({
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
  })
  public attachmentTemplate: string;
}
