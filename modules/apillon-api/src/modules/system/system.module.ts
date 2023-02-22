import { Module } from '@nestjs/common';
import { DiscordBotController } from './discord-bot.controller';

@Module({
  controllers: [DiscordBotController],
  providers: [],
})
export class SystemModule {}
