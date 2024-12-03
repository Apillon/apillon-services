import { Injectable, HttpStatus } from '@nestjs/common';
import { ContactFormDto } from './dtos/contact-form.dto';
import {
  AuthenticationMicroservice,
  BlockchainMicroservice,
  CodeException,
  EmailDataDto,
  EmailTemplate,
  Mailing,
  MintEmbeddedWalletNftDTO,
  NftsMicroservice,
  env,
} from '@apillon/lib';
import { User } from '../user/models/user.model';
import { DevConsoleApiContext } from '../../context';
import { Project } from '../project/models/project.model';
import { ServiceStatusQueryFilter } from '../service-status/dtos/service-status-query-filter.dto';
import { ServiceStatus } from '../service-status/models/service_status.model';
import { ForbiddenErrorCode } from '../../config/types';
import { UserService } from '../user/user.service';

@Injectable()
export class PublicService {
  constructor(private userService: UserService) {}

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

  async getServiceStatusList(
    context: DevConsoleApiContext,
    query: ServiceStatusQueryFilter,
  ) {
    return await new ServiceStatus({}, context).getList(context, query);
  }

  async mintNftToEmbeddedWallet(
    context: DevConsoleApiContext,
    body: MintEmbeddedWalletNftDTO,
  ) {
    body.isEvmWallet = true;
    body.wallet = body.receivingAddress;
    await this.userService.validateWalletSignature(
      body,
      'public.service/mintNftToEmbeddedWallet',
      context,
      body.message,
    );

    const oasisSignature = await new AuthenticationMicroservice(
      context,
    ).getOasisSignatureByPublicAddress(body.receivingAddress);

    if (!oasisSignature.id) {
      throw new CodeException({
        code: ForbiddenErrorCode.NOT_EMBEDDED_WALLET,
        status: HttpStatus.FORBIDDEN,
        errorCodes: ForbiddenErrorCode,
      });
    }

    return (await new NftsMicroservice(context).mintNft(body)).data;
  }
}
