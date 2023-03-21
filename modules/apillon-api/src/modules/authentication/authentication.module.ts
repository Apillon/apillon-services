import { Module } from '@nestjs/common';
import { AuthController } from './authentication.controller';
import { AuthService } from './authentication.service';

@Module({
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
