import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ChatModule } from './chat/chat.module';
import { ConfigModule } from '@nestjs/config';
@Module({
  imports: [ThrottlerModule.forRoot([{
    name: 'default',
    ttl: 60,
    limit: 5,
  }]),ConfigModule.forRoot({ isGlobal: true }), PrismaModule, AuthModule, ChatModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
