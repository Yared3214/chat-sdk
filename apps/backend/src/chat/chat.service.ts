import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  // create channel and make the user automatically join as admin
  async createChannel(name: string, userId: string) {
    try {
      const channel = await this.prisma.channel.create({ data: { name, appId: 'c83f64f8-5bac-4a3b-a2d6-47caef86ec26' } });
      const channelMember = await this.prisma.channelMember.create({
        data: { channelId: channel.id, userId, role: 'admin' },
      });
      return {role: channelMember.role, ...channel};
    } catch (e) {
      throw new BadRequestException('Channel name already exists');
    }
  }


  async joinChannel(userId: string, channelId: string) {
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
      include: { members: true },
    });
  
    if (!channel) throw new Error('Channel not found');
  
    if (channel.isPrivate) {
      // check if invited
      const isMember = channel.members.some(m => m.userId === userId);
      if (!isMember) throw new BadRequestException('You are not invited to this private channel');
    }
  
    if (channel.members.some(m => m.userId === userId)) {
      throw new BadRequestException('Already a member of the channel');
    }
    await this.prisma.channelMember.create({
      data: { channelId, userId, role: 'member' },
    });
  
    return { success: true, channelId, joinedAt: new Date() };
  }

  async inviteUserToChannel(channelId: string, inviterId: string, userId: string) {
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
      include: { members: true },
    });
  
    if (!channel) throw new BadRequestException('Channel not found');
  
    // only channel admin can invite
    const inviter = channel.members.find(m => m.userId === inviterId);
    if (!inviter || inviter.role !== 'admin') {
      throw new BadRequestException('Only admins can invite users');
    }
  
    return await this.prisma.channelMember.create({
      data: { channelId, userId, role: 'member' },
    });
  }

  async promoteToAdmin(requesterId: string, channelId: string, userId: string) {
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
      include: { members: true },
    });
    if (!channel) throw new NotFoundException('Channel not found');
    // only channel admin can promote
    const requester = channel.members.find(m => m.userId === requesterId);
    if (!requester || requester.role !== 'admin') {
      throw new BadRequestException('Only admins can promote users');
    }
    const member = channel.members.find(m => m.userId === userId);
    if (!member) throw new NotFoundException('User is not a member of the channel');
    if (member.role === 'admin') throw new BadRequestException('User is already an admin');
    return this.prisma.channelMember.update({
      where: { id: member.id },
      data: { role: 'admin' },
    });
  }

  async makeChannelPrivate(userId: string, channelId: string) {
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
      include: { members: true },
    });
    if (!channel) throw new NotFoundException('Channel not found');

    // only channel admin can change privacy
    const member = channel.members.find(m => m.userId === userId);
    if (!member || member.role !== 'admin') {
      throw new BadRequestException('Only admins can change channel privacy');
    }

    if (channel.isPrivate) {
      throw new BadRequestException('Channel is already private');
    }

    return this.prisma.channel.update({
      where: { id: channelId },
      data: { isPrivate: true },
    });
  }

  async leaveChannel(userId: string, channelId: string) {
    const existing = await this.prisma.channelMember.findFirst({
      where: { userId, channelId },
    });
    if (!existing) throw new BadRequestException('Not a member');

    await this.prisma.channelMember.delete({ where: { id: existing.id } });
    return { channelId, userId };
  }

  async listUserChannels(userId: string) {
    const rows = await this.prisma.channelMember.findMany({
      where: { userId },
      include: { channel: true },
      orderBy: { joinedAt: 'desc' },
    });
    return rows.map(r => r.channel);
  }

  async postMessage(userId: string, channelId: string, content: string) {
    // ensure member
    const member = await this.prisma.channelMember.findFirst({ where: { userId, channelId } });
    if (!member) throw new BadRequestException('Join the channel first');

    return this.prisma.message.create({
      data: { channelId, senderId: userId, content, appId: 'c83f64f8-5bac-4a3b-a2d6-47caef86ec26' },
    });
  }

  async listMessages(channelId: string, limit = 50) {
    return this.prisma.message.findMany({
      where: { channelId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async sendDirectMessage(senderId: string, receiverId: string, content: string) {
    // ensure both users exist
    const users = await this.prisma.user.findMany({
      where: { id: { in: [senderId, receiverId] } },
    });
    if (users.length < 2) throw new BadRequestException('User not found');

    return this.prisma.directMessage.create({
      data: { senderId, receiverId, content, appId: 'c83f64f8-5bac-4a3b-a2d6-47caef86ec26' },
    });
  }
  async getDirectMessages(userId: string, otherUserId: string, limit = 50) {
    return this.prisma.directMessage.findMany({
      where: {
        OR: [
          { senderId: userId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: userId },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  // chat.service.ts
  async markDMAsRead(messageId: string, userId: string) {
    const message = await this.prisma.directMessage.findUnique({ where: { id: messageId } });

    if (!message) throw new Error('Message not found');
    if (message.receiverId !== userId) throw new Error('Not authorized to mark as read');

    return this.prisma.directMessage.update({
      where: { id: messageId },
      data: { readAt: new Date() },
    });
  }

  
}
