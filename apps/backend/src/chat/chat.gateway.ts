import {
    ConnectedSocket,
    MessageBody,
    OnGatewayConnection,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
  } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import * as jwt from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';
import { ChatService } from './chat.service';
  
@WebSocketGateway({ cors: true, namespace: '/ws' })
export class ChatGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;
  constructor(private config: ConfigService, private chat: ChatService) {}
  
  handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth && (client.handshake.auth as any).token) ||
        (client.handshake.query && (client.handshake.query as any).token);
  
      if (!token) throw new Error('Missing token');

      const secret = this.config.get<string>('JWT_SECRET');
      if (!secret) {
        throw new Error('JWT_SECRET is not defined in environment variables');
        }
        const payload = jwt.verify(token as string, secret) as jwt.JwtPayload;
        client.data.user = { id: payload.sub, username: payload.username };
          
      // Optional: auto-join a personal room
      client.join(`user:${payload.sub}`);
    } catch (e) {
      client.emit('error', { message: 'Unauthorized' });
      client.disconnect(true);
    }
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    client.emit('pong', { type: 'pong', ts: Date.now() });
  }
  
  @SubscribeMessage('send_message')
  async onSend(
    @MessageBody() data: { channelId: string; content: string },
    @ConnectedSocket() client: Socket,
  ) {
    const user = client.data.user;
    if (!user) return client.emit('error', { action: 'send_message', message: 'Unauthorized' });
  
    try {
      const msg = await this.chat.postMessage(user.id, data.channelId, data.content);
      // Broadcast to channel room
      client.to(`channel:${data.channelId}`).emit('message', {
        id: msg.id,
        channelId: data.channelId,
        senderId: user.id,
        content: msg.content,
        createdAt: msg.createdAt,
      });
      // Ack back to sender
      client.emit('send_message_ack', { id: msg.id });
    } catch (e: any) {
      client.emit('error', { action: 'send_message', message: e.message || 'Send failed' });
    }
  }

    // chat.gateway.ts
  @SubscribeMessage('sendDM')
  async handleSendDM(
    @MessageBody() data: { receiverId: string; content: string },
    @ConnectedSocket() client: Socket
  ) {
    const senderId = client.data.user.id;
    
    try {
      const message = await this.chat.sendDirectMessage(senderId, data.receiverId, data.content);
      const room = `dm_${[senderId, data.receiverId].sort().join('_')}`;
      this.server.to(room).emit('newDM', message);

      return { ok: true, message };   // <-- this will resolve client ack
    } catch (e: any) {
      return { ok: false, error: e.message || 'Failed to send DM' };
    }
  }

  @SubscribeMessage('joinDM')
  async handleJoinDM(
    @MessageBody() data: { otherUserId: string },
    @ConnectedSocket() client: Socket
  ) {
    const userId = client.data.user.id;
    const room = `dm_${[userId, data.otherUserId].sort().join('_')}`;

    client.join(room);

    const history = await this.chat.getDirectMessages(userId, data.otherUserId);
    client.emit('dmHistory', history);
    return history;
  }

  @SubscribeMessage('markDMRead')
  async handleMarkDMRead(
    @MessageBody() data: { messageId: string },
    @ConnectedSocket() client: Socket
  ) {
    const userId = client.data.user.id;

    try {
      const updated = await this.chat.markDMAsRead(data.messageId, userId);

      // Notify sender that their message was read
      const room = `dm_${[updated.senderId, updated.receiverId].sort().join('_')}`;
      this.server.to(room).emit('dmReadReceipt', {
        messageId: updated.id,
        readAt: updated.readAt,
        by: userId,
      });
    } catch (e: any) {
      client.emit('error', { action: 'markDMRead', message: e.message });
    }
  }


  }
  