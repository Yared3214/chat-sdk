import { Module } from '@nestjs/common';
import { CallGateway } from './call.gateway';
import { CallService } from './call.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigModule } from '@nestjs/config';
import { CallController } from './call.controller';

@Module({
  imports: [ConfigModule],
  controllers: [CallController],
  providers: [CallGateway, CallService, PrismaService],
  exports: [CallService],
})
export class CallModule {}
