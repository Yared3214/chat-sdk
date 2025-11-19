import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('user')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private user: UserService) {}

  @Get(':appId/many')
  async listAllUsers(@Req() req: any, @Param('appId') appId: string) {
    return this.user.listAllUsers(appId);
  }

  @Get(':userId')
  async getUserInfoById(@Req() req: any, @Param('userId') id: string) {
    return this.user.getUsernameById(id);
  }
}