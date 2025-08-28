import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('channels')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private chat: ChatService) {}

  @Post()
  async createChannel(@Body() body: { name: string }, @Req() req: any) {
    return this.chat.createChannel(body.name, req.user.id);
  }

  @Post(':id/join')
  async join(@Param('id') id: string, @Req() req: any) {
    const membership = await this.chat.joinChannel(req.user.id, id);
    return { success: true, channelId: membership.channelId, joinedAt: membership.joinedAt };
  }

  @Post(':id/invite')
  async invite(@Param('id') id: string, @Req() req: any, @Body() body: { userId: string }) {
    return this.chat.inviteUserToChannel(id, req.user.id, body.userId);
  }

  @Post(':id/private')
  async makePrivate(@Param('id') id: string, @Req() req: any) {
    return this.chat.makeChannelPrivate(req.user.id, id);
  }

  @Post(':id/leave')
  async leave(@Param('id') id: string, @Req() req: any) {
    return this.chat.leaveChannel(req.user.id, id);
  }

  @Get('me')
  async myChannels(@Req() req: any) {
    return this.chat.listUserChannels(req.user.id);
  }

  @Post(':id/messages')
  async sendMessage(@Param('id') id: string, @Req() req: any, @Body() body: { content: string }) {
    return this.chat.postMessage(req.user.id, id, body.content);
  }

  @Get(':id/messages')
  async listMessages(@Param('id') id: string) {
    return this.chat.listMessages(id);
  }
  @Post(':id/promote')
  async promoteToAdmin(@Param('id') id: string, @Req() req: any, @Body() body: { userId: string }) {
    return this.chat.promoteToAdmin(req.user.id, id, body.userId);
  }
}
