import { Module } from '@nestjs/common';
import { AttestationController } from './attestation.controller';
import { AttestationService } from './attestation.service';

@Module({
  controllers: [AttestationController],
  providers: [AttestationService],
})
export class AttestationModule {}
