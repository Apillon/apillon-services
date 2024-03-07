import { Injectable } from '@nestjs/common';
import { ContactFormDto } from './dtos/contact-form.dto';
import {
  BlockchainMicroservice,
  EmailDataDto,
  EmailTemplate,
  Lmas,
  Mailing,
  env,
} from '@apillon/lib';
import { User } from '../user/models/user.model';
import { DevConsoleApiContext } from '../../context';
import { Project } from '../project/models/project.model';

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

  async getPlatformStatistics(context: DevConsoleApiContext) {
    const results = await Promise.all([
      new User({}, context).getTotalUsers(),
      new Project({}, context).getTotalProjects(),
      // new Lmas().getTotalRequests(),
      new BlockchainMicroservice(context).getTotalWalletTransactions(),
    ]);

    const [
      totalUsers,
      totalProjects,
      // { totalApiRequests, totalDevConsoleRequests },
      totalWalletTransactions,
    ] = results.map((d) => d?.data || d);

    return {
      totalUsers,
      totalProjects,
      // totalApiRequests,
      // totalDevConsoleRequests,
      totalWalletTransactions,
    };
  }
}
