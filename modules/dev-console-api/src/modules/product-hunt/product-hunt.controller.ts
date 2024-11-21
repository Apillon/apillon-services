import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ProductHuntService } from './product-hunt.service';
import { DevConsoleApiContext } from '../../context';
import { AuthGuard } from '../../guards/auth.guard';
import { Ctx, Validation } from '@apillon/modules-lib';
import { ValidationGuard } from '../../guards/validation.guard';
import { CreateProductHuntCommentDto } from '@apillon/lib';

@Controller('product-hunt')
export class ProductHuntController {
  constructor(private readonly productHuntService: ProductHuntService) {}

  @Get()
  @UseGuards(AuthGuard)
  async getComment(@Ctx() context: DevConsoleApiContext) {
    return await this.productHuntService.getComment(context);
  }

  @Post()
  @Validation({ dto: CreateProductHuntCommentDto })
  @UseGuards(ValidationGuard, AuthGuard)
  async createComment(
    @Ctx() context: DevConsoleApiContext,
    @Body() body: CreateProductHuntCommentDto,
  ) {
    return await this.productHuntService.createComment(context, body);
  }
}
