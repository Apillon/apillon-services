import { Module } from '@nestjs/common';
import { ProjectService } from '../project/project.service';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { GoogleStrategy } from './strategies/google.strategy';
import { env, getEnvSecrets } from '@apillon/lib';

@Module({
  controllers: [UserController],
  providers: [
    UserService,
    ProjectService,
    {
      provide: GoogleStrategy,
      useFactory: async () => {
        await getEnvSecrets();
        return new GoogleStrategy({
          clientID: env.GOOGLE_CLIENT_ID,
          clientSecret: env.GOOGLE_CLIENT_SECRET,
          callbackURL: env.GOOGLE_CALLBACK_URL,
        });
      },
    },
  ],
  exports: [UserService, ProjectService],
})
export class UserModule {}
