import {
  WebSocketGateway,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import * as jwt from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';

@WebSocketGateway({ cors: { origin: '*', methods: ['GET', 'POST'], credentials: true }, namespace: '/ws' })
export class CallGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  constructor(private config: ConfigService) {}

  private getUserIdFromToken(token: string): string {
    const secret = this.config.get<string>('JWT_SECRET');
    if (!secret) throw new Error('Missing JWT_SECRET');
    const payload = jwt.verify(token, secret) as jwt.JwtPayload;
    return payload.sub as string;
  }

  handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth && (client.handshake.auth as any).token) ||
        (client.handshake.query && (client.handshake.query as any).token);

      if (!token) throw new Error('Missing token');
      const userId = this.getUserIdFromToken(token as string);

      client.data.userId = userId;

      // Each user automatically joins their personal room
      client.join(`user:${userId}`);

      console.log(`[CallGateway] User ${userId} connected`);
    } catch (e: any) {
      console.warn(`[CallGateway] Connection rejected: ${e.message}`);
      client.emit('error', { message: 'Unauthorized' });
      client.disconnect(true);
    }
  }

  /**
   * Relay WebRTC signaling messages between peers.
   * 
   * The PeerManager expects:
   * socket.emit("signal", targetId, message)
   * 
   * This gateway receives: (fromId = sender’s id, targetId = recipient’s id)
   * and re-emits: this.server.to(`user:${targetId}`).emit("signal", fromId, message)
   */
  @SubscribeMessage('signal')
  async handleSignal(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: [string, string] // [targetId, message]
  ) {
    try {
      const [targetId, message] = body;
      const fromId = client.data.userId;
      if (!fromId) throw new Error('Unauthenticated socket');
      if (!targetId || !message) throw new Error('Invalid signal payload');

      // Relay the message to the target user's personal room
      this.server.to(`user:${targetId}`).emit('signal', fromId, message);

      if (process.env.DEBUG_WEBSOCKET === 'true') {
        console.log(`[CallGateway] signal from ${fromId} -> ${targetId}: ${message}`);
      }
    } catch (e: any) {
      client.emit('error', { action: 'signal', message: e.message });
    }
  }

  // --- Call control events ---

  /**
   * Caller requests to start a call with toUserId.
   * Emits to callee: 'incoming-call' and acks caller with 'call:request:ack'.
   */
  @SubscribeMessage('call:request')
  async handleCallRequest(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { toUserId: string; fromUserId?: string }
  ) {
    try {
      const fromUserId = client.data.userId as string;
      if (!fromUserId) throw new Error('Unauthenticated');

      const toUserId = body?.toUserId;
      if (!toUserId) throw new Error('Missing toUserId');

      const callId = randomUUID();

      // Notify callee's room
      this.server
        .to(`user:${toUserId}`)
        .emit('incoming-call', { id: callId, fromUserId, fromSocketId: client.id });

      // Ack caller
      client.emit('call:request:ack', { ok: true, callId });
    } catch (e: any) {
      client.emit('call:request:ack', { ok: false, error: e.message });
    }
  }

  /**
   * Callee accepts an incoming call.
   * Notifies caller's room with 'call:accepted'.
   */
  @SubscribeMessage('call:accept')
  async handleCallAccept(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { callId: string; fromUserId?: string; toUserId?: string }
  ) {
    try {
      const accepterUserId = client.data.userId as string;
      if (!accepterUserId) throw new Error('Unauthenticated');

      const { callId } = body || ({} as any);
      if (!callId) throw new Error('Missing callId');

      // In a minimal stateless implementation, we cannot know the caller user id from callId.
      // Instead, the UI should keep track of fromUserId in incomingCall and can use signaling by userId.
      // Here we broadcast acceptance to all rooms this user participates in via server-wide emit to their room subscribers.
      // Practically, the caller listens on their own user room, so emit to accepter's interlocutors is not trivial.
      // Simplify: emit to all clients in accepter's sockets, and also emit to all (could be optimized with call mapping if added later).

      // Better: include target/caller user id in payload from the UI when accepting; use toUserId as caller user id if provided.
      const targetCallerUserId = body?.toUserId; // optional hint from client
      if (targetCallerUserId) {
        this.server.to(`user:${targetCallerUserId}`).emit('call:accepted', { callId, accepterSocketId: client.id });
      } else {
        // Fallback broadcast to everyone in the system that might be in conversation with this user.
        // To keep it safe, at least inform accepter's own room; the caller will typically not be in that room.
        // If not specified, do nothing special; recommend client to pass toUserId when accepting.
      }
    } catch (e: any) {
      client.emit('error', { action: 'call:accept', message: e.message });
    }
  }

  /**
   * Callee rejects an incoming call.
   */
  @SubscribeMessage('call:reject')
  async handleCallReject(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { callId: string; toUserId?: string }
  ) {
    try {
      const { callId, toUserId } = body || ({} as any);
      if (toUserId) {
        this.server.to(`user:${toUserId}`).emit('call:ended', { callId, reason: 'rejected' });
      }
    } catch (e: any) {
      client.emit('error', { action: 'call:reject', message: e.message });
    }
  }

  /**
   * Either party ends the call.
   */
  @SubscribeMessage('call:end')
  async handleCallEnd(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { callId: string; otherUserId?: string }
  ) {
    try {
      const { callId, otherUserId } = body || ({} as any);
      const endPayload = { callId, reason: 'ended' };

      // Notify self (client may rely on this) and the other user if provided
      client.emit('call:ended', endPayload);
      if (otherUserId) {
        this.server.to(`user:${otherUserId}`).emit('call:ended', endPayload);
      }
    } catch (e: any) {
      client.emit('error', { action: 'call:end', message: e.message });
    }
  }

  /**
   * Optional: Handle disconnections for cleanup/logging
   */
  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId) {
      console.log(`[CallGateway] User ${userId} disconnected`);
    }
  }
}
