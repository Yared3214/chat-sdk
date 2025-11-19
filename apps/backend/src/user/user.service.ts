import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  // list all users on the same app
  async listAllUsers (appId: string) {
    const users = await this.prisma.user.findMany({
      where: {
      appId
      },
      select: {
      id: true,
      username: true,
      createdAt: true,
      },
    });
    return users;
  }

  async getUsernameById (userId: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        username: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    return user;
  }
}
