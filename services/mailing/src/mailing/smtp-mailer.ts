import * as nodemailer from 'nodemailer';
import { Options, MailOptions } from 'nodemailer/lib/smtp-transport';
import { MailTemplates } from './mail-templates';
import {
  EmailDataDto,
  env,
  getEnvSecrets,
  Lmas,
  LogType,
  ServiceName,
  writeLog,
} from '@apillon/lib';
import { ServiceContext } from '@apillon/service-lib';
import { generateTemplateData } from './template-data';
import * as handlebars from 'handlebars';
import { MailCodeException } from '../lib/exceptions';
import { MailErrorCode } from '../config/types';
import { GeneratePdfMicroservice } from '../lib/generate-pdf';
import axios from 'axios';

/**
 * Send email via SMTP server
 * @param {MailOptions} mail
 * @returns {Promise<boolean>} - if email sent successfully
 */
export async function SMTPsend(
  mail: MailOptions,
  context: ServiceContext,
): Promise<boolean> {
  await getEnvSecrets();
  const transportOptions = {
    pool: true,
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT == 465, // true for 465, false for other ports
    auth: {
      user: env.SMTP_USERNAME,
      pass: env.SMTP_PASSWORD,
    },
  } as Options;

  const transporter = nodemailer.createTransport(transportOptions);

  try {
    const res = await transporter.sendMail(mail);

    if (res.accepted?.length) {
      await new Lmas().writeLog({
        context,
        logType: LogType.INFO,
        location: 'mailing/smtp-mailer',
        service: ServiceName.MAIL,
        message: 'SMTPsendTemplate request - success',
        data: { subject: mail.subject },
      });
      return true;
    }
    await new Lmas().writeLog({
      context,
      logType: LogType.ERROR,
      location: 'lib/mailing/smtp-mailer',
      service: ServiceName.MAIL,
      message: 'SMTPsendTemplate request - failed',
      data: { res, subject: mail.subject },
    });
    return false;
  } catch (err) {
    throw await new MailCodeException({
      code: MailErrorCode.ERROR_SENDING_EMAIL,
      status: 500,
      context,
      sourceFunction: 'SMTPSend()',
      sourceModule: 'smtp-mailer',
    }).writeToMonitor({
      context,
      user_uuid: context.user?.user_uuid,
      data: { err, subject: mail.subject },
    });
  }
}

/**
 * Send email via SMTP server with template
 * @param {EmailDataDto} emailData
 * @returns {Promise<boolean>} - if email sent successfully
 */
export async function SMTPsendTemplate(
  context: ServiceContext,
  emailData: EmailDataDto,
): Promise<boolean> {
  const template = MailTemplates.getTemplate(emailData.templateName);

  if (!template) {
    throw new MailCodeException({
      code: MailErrorCode.TEMPLATE_NOT_FOUND,
      status: 404,
      context,
      sourceFunction: 'SMTPSendTemplate()',
      sourceModule: 'smtp-mailer',
    });
  }

  const { senderName, mailAddresses, subject } = emailData;
  const templateData = {
    APP_URL: env.APP_URL,
    ...emailData.templateData,
  };

  const mail = {
    from: `${senderName || env.SMTP_NAME_FROM}>`,
    to: mailAddresses.join(';'),
    subject,
    html: template(templateData),
    attachments: emailData.attachments || [],
    bcc: emailData.bccEmail,
  };

  return await SMTPsend(mail, context);
}

/**
 * Send email via SMTP server with default template
 * @param {EmailDataDto} emailData
 * @returns {Promise<boolean>} - if email sent successfully
 */
export async function SMTPsendDefaultTemplate(
  context: ServiceContext,
  emailData: EmailDataDto,
): Promise<boolean> {
  const header = MailTemplates.getTemplate('head');
  const footer = MailTemplates.getTemplate('footer');
  const body = MailTemplates.getTemplate('body');
  handlebars.registerPartial('header', header({}));
  handlebars.registerPartial('footer', footer({}));

  if (!header || !footer || !body) {
    throw new MailCodeException({
      code: MailErrorCode.TEMPLATE_NOT_FOUND,
      status: 404,
      context,
      sourceFunction: 'SMTPSendTemplate()',
      sourceModule: 'smtp-mailer',
    });
  }

  const { templateName, senderName, mailAddresses } = emailData;
  const templateData = {
    APP_URL: env.APP_URL,
    ...generateTemplateData(templateName, emailData.templateData),
    ...emailData.templateData,
  };

  const mail = {
    from: `${senderName || env.SMTP_NAME_FROM} <${env.SMTP_EMAIL_FROM}>`,
    to: mailAddresses.join(';'),
    subject: templateData.subject,
    html: body(templateData),
    attachments: emailData.attachments || [],
    bcc: emailData.bccEmail,
  };

  if (emailData.attachmentTemplate) {
    const file = await generatePdfFromTemplate(emailData, templateData);
    mail.attachments.push(file);
  }

  return await SMTPsend(mail, context);
}

/**
 * Verify connection with SMTP server
 * @returns {Promise<boolean>}
 */
export async function SMTPverify(): Promise<boolean> {
  await getEnvSecrets();
  const transporter = nodemailer.createTransport({
    pool: true,
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT == 465, // true for 465, false for other ports
    auth: {
      user: env.SMTP_USERNAME,
      pass: env.SMTP_PASSWORD,
    },
  } as Options);

  try {
    await transporter.verify();
  } catch (err) {
    writeLog(LogType.ERROR, `SMTP mailer error: ${err}`);
    // await new Lmas().writeLog({
    //   logType: LogType.ERROR,
    //   location: 'lib/mailing/smtp-mailer',
    //   message: 'SMTPverify request - error: ' + err,
    // });
    // return false;
    throw err;
  }

  return true;
}

async function generatePdfFromTemplate(
  emailData: EmailDataDto,
  templateData: any,
): Promise<{ filename: string; content: Buffer }> {
  const attachmentTemplate = MailTemplates.getTemplate(
    emailData.attachmentTemplate,
  )(templateData);

  try {
    const pdfUrl = await new GeneratePdfMicroservice(
      this.getContext(),
    ).generatePdf(attachmentTemplate);
    // Fetch the file content using Axios
    const response = await axios.get(pdfUrl, {
      responseType: 'arraybuffer',
    });

    return {
      filename: emailData.attachmentFileName,
      content: Buffer.from(response.data),
    };
  } catch (err) {
    await new Lmas().writeLog({
      logType: LogType.ERROR,
      location: 'smtp-mailer/SMTPsendDefaultTemplate',
      message: `Error generating PDF attachment from HTML: ${err}`,
      data: { ...templateData },
      context: this.getContext(),
      sendAdminAlert: true,
    });
  }
}
