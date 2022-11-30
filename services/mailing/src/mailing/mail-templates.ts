import * as fs from 'fs';
import * as path from 'path';
import * as handlebars from 'handlebars';
import { env } from '@apillon/lib';

export class MailTemplates {
  /**
   * Cached compiled handlebars template collection
   *
   * @static
   * @memberof MailTemplates
   */
  public static templates: unknown = {};

  /**
   * Returns compiled mail template. If its not cached in collection it is read from file system.
   *
   * @static
   * @param {string} templateName
   * @returns compiled mail template
   * @memberof MailTemplates
   */
  public static getTemplate(templateName: string) {
    const templateDir = env.MAIL_TEMPLATE_PATH || `${__dirname}/templates`;
    if (!this.templates.hasOwnProperty(templateName)) {
      try {
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        const html = fs.readFileSync(
          `${templateDir}/${templateName}.html`,
          'utf8',
        );
        this.templates[templateName] = handlebars.compile(html);
      } catch (err) {
        console.log(path.resolve(`${templateDir}/${templateName}.html`));
        console.log(err);
        return null;
      }
    }
    return this.templates[templateName];
  }
}