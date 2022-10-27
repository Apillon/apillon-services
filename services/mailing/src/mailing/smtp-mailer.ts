import * as nodemailer from 'nodemailer';
import { Options, MailOptions } from 'nodemailer/lib/smtp-transport';
import { MailTemplates } from './mail-templates';
import { Attachment } from 'nodemailer/lib/mailer';
import { env } from 'at-lib';

/**
 * Send email via SMTP server
 *
 * @export
 * @param {MailOptions} mail
 * @returns {Promise<boolean>}
 */
export async function SMTPsend(mail: MailOptions): Promise<boolean> {
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
      return true;
    } else {
      console.log('SMTP send failed! Response: ', res);
      return false;
    }
  } catch (err) {
    console.log(err);
    // await new Lmas().writeLog({
    //   logType: LogType.ERROR,
    //   location: 'lib/mailing/smtp-mailer',
    //   message: 'SMTPsend request - error: ' + err,
    // });
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
  mailAddresses: string[],
  subject: string,
  templateName: string,
  templateData: any,
  senderName?: string,
  attachments?: Attachment[],
): Promise<boolean> {
  const template = MailTemplates.getTemplate(templateName);

  if (!template) {
    // await new Lmas().writeLog({
    //   logType: LogType.ERROR,
    //   location: 'lib/mailing/smtp-mailer',
    //   message: `SMTPsendTemplate request - Template not found: ${templateName}!`,
    // });

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
    const res = await transporter.sendMail(mail);

    if (res.accepted && res.accepted.length) {
      return true;
    } else {
      console.log('SMTP send failed! Response: ', res);
      return false;
    }
  } catch (err) {
    console.error(err);
    // await new Lmas().writeLog({
    //   logType: LogType.ERROR,
    //   location: 'lib/mailing/smtp-mailer',
    //   message: 'SMTPsendTemplate request - error: ' + err,
    // });
    throw err;
  }
}

/**
 * Verify connection with SMTP server
 *
 * @export
 * @returns {Promise<boolean>}
 */
export async function SMTPverify(): Promise<boolean> {
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
