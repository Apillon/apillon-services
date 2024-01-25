import { BaseService, Context, env } from '@apillon/lib';
import { MailErrorCode } from '../config/types';
import { MailCodeException } from './exceptions';

export class GeneratePdfMicroservice extends BaseService {
  lambdaFunctionName = env.GENERATE_PDF_FUNCTION_NAME;
  devPort: number;
  serviceName: string;

  constructor(context: Context) {
    super(context);
    this.isDefaultAsync = false;
  }

  /**
   * Call function (lambda/api), which generates a PDF from an HTML file
   * @param html The HTML template
   * @returns
   */
  public async generatePdf(html: string): Promise<string> {
    try {
      //Call lambda
      return await this.callService({ html });
    } catch (err) {
      await new MailCodeException({
        code: MailErrorCode.GENERATE_PDF_ERROR,
        status: 500,
        sourceFunction: 'generatePdf',
        errorMessage: `Error generating PDF: ${err}`,
      }).writeToMonitor({
        data: { html, err },
      });
    }

    return undefined;
  }
}
