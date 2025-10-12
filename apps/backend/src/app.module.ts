import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ChatModule } from './chat/chat.module';
import { UserModule } from './user/user.module';
import { ConfigModule } from '@nestjs/config';
import { CallModule } from './call/call.module';
@Module({
  imports: [ThrottlerModule.forRoot([{
    name: 'default',
    ttl: 60,
    limit: 5,
  }]),ConfigModule.forRoot({ isGlobal: true }), PrismaModule, AuthModule, ChatModule, CallModule, UserModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
