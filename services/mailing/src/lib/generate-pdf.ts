import { BaseService, Context, getEnvSecrets } from '@apillon/lib';
import { MailErrorCode } from '../config/types';
import { MailCodeException } from './exceptions';

export class GeneratePdfMicroservice extends BaseService {
  lambdaFunctionName: string;
  devPort: number;
  serviceName: string;

  constructor(context: Context) {
    super(context);
    this.isDefaultAsync = false;
  }

  /**
   * Call function (lambda/api), which generates a PDF from an HTML file
   * @param html The HTML template as a string
   * @returns S3 PDF file URL
   */
  public async generatePdf(html: string): Promise<string> {
    const env = await getEnvSecrets();
    this.lambdaFunctionName = env.GENERATE_PDF_FUNCTION_NAME;
    try {
      //Call lambda
      const data = await this.callService({ html });
      return data.headers.Location;
    } catch (err) {
      throw await new MailCodeException({
        code: MailErrorCode.GENERATE_PDF_ERROR,
        status: 500,
        sourceFunction: 'GeneratePdfMicroservice/generatePdf',
        errorMessage: `Error generating PDF: ${err}`,
        details: err,
      }).writeToMonitor({ data: { html, err } });
    }
  }
}
