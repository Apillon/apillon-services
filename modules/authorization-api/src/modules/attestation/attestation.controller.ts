import { ValidateFor } from '@apillon/lib';
import { Ctx, Validation } from '@apillon/modules-lib';
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthorizationApiContext } from '../../context';
import { ValidationGuard } from '../../guards/validation.guard';
import { AttestationService } from './attestation.service';
import { AttestationEmailDto } from './dtos/attestation-email.dto';
import { AttestationTokenDto } from './dtos/attestation-token.dto';
import { IdentityCreateDto } from './dtos/identity-create.dto';

@Controller('attestation')
export class AttestationController {
  constructor(private attestationService: AttestationService) {}

  @Post('start')
  // TODO: Possibly split logic -> Attestation start is not really part of the
  // attestation module, is it? It's more of a session / state handler of
  // the authentication module
  @Validation({ dto: AttestationEmailDto })
  @UseGuards(ValidationGuard)
  async attestationStart(
    @Ctx() context: AuthorizationApiContext,
    @Body() body: AttestationEmailDto,
  ) {
    return await this.attestationService.startUserAttestationProcess(
      context,
      body,
    );
  }

  @Post('identity')
  @Validation({ dto: IdentityCreateDto })
  @UseGuards(ValidationGuard)
  async attestationGenerateDid(
    @Ctx() context: AuthorizationApiContext,
    @Body() body: any,
  ) {
    return await this.attestationService.generateIdentity(context, body);
  }

  @Get('verify/:token')
  @Validation({ dto: AttestationTokenDto })
  @UseGuards(ValidationGuard)
  async verifyIdentityEmail(
    @Ctx() context: AuthorizationApiContext,
    @Param('token') token: string,
  ) {
    return await this.attestationService.verifyIdentityEmail(context, token);
  }

  @Get('state')
  @Validation({ dto: AttestationEmailDto, validateFor: ValidateFor.QUERY })
  @UseGuards(ValidationGuard)
  async attestationGetIdentityState(
    @Ctx() context: AuthorizationApiContext,
    @Query('email') email: string,
  ) {
    return await this.attestationService.getUserAttestationState(
      context,
      email,
    );
  }

  @Post('dev/create-did')
  // TODO: This is a dev handler!!! Create guards that prevent use of this if in
  // production ...
  // @Validation({ dto: DidCreateDto })
  // @UseGuards(ValidationGuard)
  async attestationGenerateDevDid(
    @Ctx() context: AuthorizationApiContext,
    @Body() body: any,
  ) {
    return await this.attestationService.generateDIDDocumentDEV(context, body);
  }
}
