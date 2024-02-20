import { Injectable } from '@nestjs/common';
import { ContactFormDto } from './dtos/contact-form.dto';
import { EmailDataDto, EmailTemplate, Mailing, env } from '@apillon/lib';

@Injectable()
export class PublicService {
  async sendContactUsEmail(data: ContactFormDto) {
    await new Mailing(null).sendMail(
      new EmailDataDto({
        mailAddresses: [env.CONTACT_EMAIL_TO],
        templateName: EmailTemplate.CONTACT_US_FORM,
        templateData: data,
      }),
    );
  }
}
