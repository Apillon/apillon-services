import { Module } from '@nestjs/common';
import { DiscordBotController } from './discord-bot.controller';
import { SystemController } from './system.controller';
import { SystemService } from './system.service';

@Module({
  controllers: [DiscordBotController, SystemController],
  providers: [SystemService],
})
export class SystemModule {}
