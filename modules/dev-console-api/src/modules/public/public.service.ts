import { Injectable } from '@nestjs/common';
import { ContactFormDto } from './dtos/contact-form.dto';
import { Mailing, env } from '@apillon/lib';

@Injectable()
export class PublicService {
  async sendContactFormEmail(data: ContactFormDto) {
    await new Mailing(null).sendMail({
      emails: [env.CONTACT_EMAIL_TO],
      template: 'contact-form',
      data,
    });
  }
}
