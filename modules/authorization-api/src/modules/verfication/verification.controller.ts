import { Ctx } from '@apillon/modules-lib';
import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { VerificationService } from './verification.service';
import { AuthorizationApiContext } from '../../context';
import { ValidationGuard } from '../../guards/validation.guard';

@Controller('verification')
export class VerificationController {
  constructor(private verificationService: VerificationService) {}
}
