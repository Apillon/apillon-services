import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { PublicService } from './public.service';
import { CaptchaGuard, Validation } from '@apillon/modules-lib';
import { ValidationGuard } from '../../guards/validation.guard';
import { ContactFormDto } from './dtos/contact-form.dto';

@Controller('public')
export class PublicController {
  constructor(private publicService: PublicService) {}

  @Post('contact-us')
  @UseGuards(CaptchaGuard, ValidationGuard)
  @Validation({ dto: ContactFormDto })
  async sendContactUsEmail(@Body() body: ContactFormDto) {
    return await this.publicService.sendContactUsEmail(body);
  }
}
