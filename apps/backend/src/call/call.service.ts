import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CallService {
  constructor(private prisma: PrismaService) {}

  async createCall(callerId: string, receiverId: string, callType: string) {
    // ensure both users exist
    const users = await this.prisma.user.findMany({
        where: { id: { in: [callerId, receiverId] } },
    });
    if (users.length < 2) throw new NotFoundException('User not found');
  
    return this.prisma.call.create({
    data: { callerId, receiverId, callType, status: 'ongoing', appId: 'c83f64f8-5bac-4a3b-a2d6-47caef86ec26' },
    });
}

  async answerCall(callId: string, status: string) {
    const call = await this.prisma.call.findUnique({ where: { id: callId } });
  
    if (!call) throw new NotFoundException('Call not found');
  
    return this.prisma.call.update({
    where: { id: callId },
    data: { status },
    });
}

  async endCall(userId: string, callId: string) {
    const call = await this.prisma.call.findUnique({ where: { id: callId}});

    if (!call) throw new NotFoundException('Call not found');

    if (![call.callerId, call.receiverId].includes(userId)) 
      throw new NotFoundException('Not part of call')

    return await this.prisma.call.update({
      where: {id: callId},
      data: {status: 'ended', endedAt: new Date()}
    })
  }

  async getActiveCalls(userId: string) {
    return this.prisma.call.findMany({
      where: {
        OR: [{ callerId: userId }, { receiverId: userId }],
        status: 'accepted',
      },
    });
  }

  async getCallHistory(userId: string, otherUserId: string) {
    return this.prisma.call.findMany({
      where: {
        OR: [
          { callerId: userId, receiverId: otherUserId },
          { callerId: otherUserId, receiverId: userId },
        ],
        status: 'ended',
      },
      orderBy: { startedAt: 'desc' },
    });
  }
}
