import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async createApp(name: string) { 
    const secret = crypto.randomBytes(32).toString('hex'); // Generate a random secret
    const app = await this.prisma.app.create({
      data: {
      name,
      appSecretHash: await bcrypt.hash(secret, 10), // Hash the secret before storing
      },
    });
    return { id : app.id, createdAt: app.createdAt, secret }; // Return the app and the plain secret
  }

  async validateUser(username: string, password: string): Promise<any> {
    const user = await this.prisma.user.findFirst({
      where: {
        username,
        appId: 'c83f64f8-5bac-4a3b-a2d6-47caef86ec26', // Matches the case used in the schema
      },
    });
    if (user && await bcrypt.compare(password, user.password)) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async signup(username: string, password: string): Promise<any> {
    const existingUser = await this.prisma.user.findFirst({
      where: {
        username,
        appId: 'c83f64f8-5bac-4a3b-a2d6-47caef86ec26',
      },
    });
    if (existingUser) {
      throw new BadRequestException('Username already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await this.prisma.user.create({
      data: {
        id: crypto.randomUUID(), // Generates a new UUID
        appId: 'c83f64f8-5bac-4a3b-a2d6-47caef86ec26',
        username,
        password: hashedPassword,
      },
    });
    const { password: _, ...result } = user;
    return result;
  }

  async login(user: any) {
    const payload = { username: user.username, sub: user.id };
    return {
      access_token: this.jwtService.sign(payload, {
        expiresIn: process.env.JWT_EXPIRATION,
      }), 
      user: payload,
    };
  }
}