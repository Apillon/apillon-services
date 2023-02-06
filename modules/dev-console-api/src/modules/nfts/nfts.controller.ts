import { AttachedServiceType, DefaultUserRole } from '@apillon/lib';
import { DeployNftContractDto } from '@apillon/lib/dist/lib/at-services/nfts/dtos/deploy-nft-contract.dto';
import { Ctx, Permissions, Validation } from '@apillon/modules-lib';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DevConsoleApiContext } from '../../context';
import { AuthGuard } from '../../guards/auth.guard';
import { ValidationGuard } from '../../guards/validation.guard';
import { NftsService } from './nfts.service';

@Controller('nfts')
export class NftsController {
  constructor(private readonly nftsService: NftsService) {}

  @Get()
  async getHello(@Ctx() context: DevConsoleApiContext) {
    return await this.nftsService.getHello(context);
  }

  @Post('/deploy')
  @Validation({ dto: DeployNftContractDto })
  @UseGuards(ValidationGuard)
  async deployNftContract(
    @Ctx() context: DevConsoleApiContext,
    @Body() body: DeployNftContractDto,
  ) {
    return await this.nftsService.deployNftContract(context, body);
  }

  @Get(':collection_uuid/transferOwnership')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
    { role: DefaultUserRole.PROJECT_USER },
  )
  @HttpCode(200)
  @UseGuards(AuthGuard)
  async transferOwnership(
    @Ctx() context: DevConsoleApiContext,
    @Param('collection_uuid') collection_uuid: string,
    @Query('address') address: string,
  ) {
    return await this.nftsService.transferNftOwnership(
      context,
      collection_uuid,
      address,
    );
  }

  @Get(':collection_uuid/setBaseUri')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
    { role: DefaultUserRole.PROJECT_USER },
  )
  @HttpCode(200)
  async setNftCollectionBaseUri(
    @Ctx() context: DevConsoleApiContext,
    @Param('collection_uuid') collection_uuid: string,
    @Query('uri') uri: string,
  ) {
    return await this.nftsService.setNftCollectionBaseUri(
      context,
      collection_uuid,
      uri,
    );
  }
}
