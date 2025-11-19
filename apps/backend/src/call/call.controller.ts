import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { CallService } from './call.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('call')
@UseGuards(JwtAuthGuard)
export class CallController {
  constructor(private call: CallService) {}

  @Post()
  async createChannel(@Req() req: any, @Body() body: { receiverId: string }) {
    return this.call.createCall(req.user.id, body.receiverId, 'audio');
  }
}