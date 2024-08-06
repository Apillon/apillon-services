import { HttpStatus, Injectable } from '@nestjs/common';
import { ContactFormDto } from './dtos/contact-form.dto';
import {
  BlockchainMicroservice,
  CodeException,
  EmailDataDto,
  EmailTemplate,
  Mailing,
  ModelValidationException,
  ValidatorErrorCode,
  env,
} from '@apillon/lib';
import { User } from '../user/models/user.model';
import { DevConsoleApiContext } from '../../context';
import { Project } from '../project/models/project.model';
import { Notification } from './models/notification.model';
import { ServiceStatusQueryFilter } from '../service-status/dtos/service-status-query-filter.dto';
import { ServiceStatus } from '../service-status/models/service_status.model';
import { NotificationQueryFilter } from './dtos/notification-query-filter.dto';
import { ResourceNotFoundErrorCode } from '../../config/types';
import { UpdateNotificationDto } from './dtos/update-notification.dto';

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

  async getServiceStatusList(
    context: DevConsoleApiContext,
    query: ServiceStatusQueryFilter,
  ) {
    return await new ServiceStatus({}, context).getList(context, query);
  }

  async getNotificationList(
    context: DevConsoleApiContext,
    query: NotificationQueryFilter,
  ) {
    return await new Notification({}, context).getListForUser(context, query);
  }

  async createNotification(context: DevConsoleApiContext, data: any) {
    const notification = new Notification(data, context);
    await notification.validateOrThrow(
      ModelValidationException,
      ValidatorErrorCode,
    );
    const createdNotification = await notification.insert();
    return createdNotification.serialize();
  }

  async updateNotification(
    {
      notificationId,
      data,
    }: {
      notificationId: number;
      data: UpdateNotificationDto;
    },
    context: DevConsoleApiContext,
  ) {
    const notification = await new Notification({}, context).populateById(
      notificationId,
    );

    if (!notification.exists()) {
      throw new CodeException({
        status: HttpStatus.NOT_FOUND,
        code: ResourceNotFoundErrorCode.NOTIFICATION_DOES_NOT_EXISTS,
        errorCodes: ResourceNotFoundErrorCode,
      });
    }

    notification.populate(data);
    await notification.validateOrThrow(
      ModelValidationException,
      ValidatorErrorCode,
    );

    await notification.update();

    return notification.serialize();
  }
}
