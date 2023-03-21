import * as nodemailer from 'nodemailer';
import { Options, MailOptions } from 'nodemailer/lib/smtp-transport';
import { MailTemplates } from './mail-templates';
import { Attachment } from 'nodemailer/lib/mailer';
import { env, getEnvSecrets, Lmas, LogType, ServiceName } from '@apillon/lib';
import { ServiceContext } from '../scripts/context';
import { generateTemplateData } from './template-data';
import * as handlebars from 'handlebars';

/**
 * Send email via SMTP server
 *
 * @export
 * @param {MailOptions} mail
 * @returns {Promise<boolean>}
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

    if (res.accepted && res.accepted.length) {
      await new Lmas().writeLog({
        context,
        logType: LogType.INFO,
        location: 'lib/mailing/smtp-mailer',
        service: ServiceName.MAIL,
        message: 'SMTPsendTemplate request - success',
        // data: mail,
      });
      return true;
    } else {
      console.log('SMTP send failed! Response: ', res);
      await new Lmas().writeLog({
        context,
        logType: LogType.ERROR,
        location: 'lib/mailing/smtp-mailer',
        service: ServiceName.MAIL,
        message: 'SMTPsendTemplate request - failed',
        data: {
          res: res,
          // mail: mail,
        },
      });
      return false;
    }
  } catch (err) {
    console.error(err);
    await new Lmas().writeLog({
      context,
      logType: LogType.ERROR,
      location: 'lib/mailing/smtp-mailer',
      service: ServiceName.MAIL,
      message: 'SMTPsendTemplate request - error' + err,
      data: {
        error: err,
        // mail: mail,
      },
    });
    throw err;
  }
}

/**
 * Send email via SMTP server with template
 *
 * @export
 * @param {string[]} mailAddresses
 * @param {string} subject
 * @param {string} templateName
 * @param {object} templateData
 * @param {string} [senderName]
 * @param {object} attachments
 * @returns {Promise<boolean>}
 */
export async function SMTPsendTemplate(
  context: ServiceContext,
  mailAddresses: string[],
  subject: string,
  templateName: string,
  templateData: any,
  senderName?: string,
  attachments?: Attachment[],
): Promise<boolean> {
  const template = MailTemplates.getTemplate(templateName);

  if (!template) {
    await new Lmas().writeLog({
      context,
      logType: LogType.ERROR,
      location: 'lib/mailing/smtp-mailer',
      service: ServiceName.MAIL,
      message:
        'SMTPsendTemplate request - Template not found: ${templateName}!',
    });

    console.log(`Template not found: ${templateName}!`);
    // return false;
    throw new Error(`Template not found: ${templateName} !`);
  }

  templateData = {
    APP_URL: env.APP_URL,
    ...templateData,
  };

  const mail = {
    from: `${senderName ? senderName : env.SMTP_NAME_FROM} <${
      env.SMTP_EMAIL_FROM
    }>`,
    to: mailAddresses.join(';'),
    subject: subject,
    html: template(templateData),
    attachments: attachments || [],
  };

  return await SMTPsend(mail, context);
}

/**
 * Send email via SMTP server with template
 *
 * @export
 * @param {string[]} mailAddresses
 * @param {string} subject
 * @param {string} templateName
 * @param {object} templateData
 * @param {string} [senderName]
 * @param {object} attachments
 * @returns {Promise<boolean>}
 */
export async function SMTPsendDefaultTemplate(
  context: ServiceContext,
  mailAddresses: string[],
  templateName: string,
  templateData: any,
  senderName?: string,
  attachments?: Attachment[],
): Promise<boolean> {
  const header = MailTemplates.getTemplate('head');
  const footer = MailTemplates.getTemplate('footer');
  const body = MailTemplates.getTemplate('body');
  handlebars.registerPartial('header', header({}));
  handlebars.registerPartial('footer', footer({}));

  if (!header || !footer || !body) {
    await new Lmas().writeLog({
      context,
      logType: LogType.ERROR,
      location: 'lib/mailing/smtp-mailer',
      service: ServiceName.MAIL,
      message:
        'SMTPsendDefaultTemplate request - Templates not found (header/body/footer)!',
    });

    console.log(`Template not found: ${templateName}!`);
    // return false;
    throw new Error(`Template not found: ${templateName} !`);
  }

  templateData = {
    APP_URL: env.APP_URL,
    ...generateTemplateData(templateName, templateData),
    ...templateData,
  };

  const mail = {
    from: `${senderName ? senderName : env.SMTP_NAME_FROM} <${
      env.SMTP_EMAIL_FROM
    }>`,
    to: mailAddresses.join(';'),
    subject: templateData.subject,
    html: body(templateData),
    attachments: attachments || [],
  };

  return await SMTPsend(mail, context);
}

/**
 * Verify connection with SMTP server
 *
 * @export
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
    console.log(`SMTP mailer error: ${err}`);
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
