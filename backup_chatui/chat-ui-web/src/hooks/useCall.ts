import { useEffect, useRef, useState } from "react";
import { PeerManager } from "@chat-sdk/sdk-web";

/**
 * useCall
 *
 * - Integrates call control (via your socket on `client`) with the PeerManager (WebRTC).
 * - Assumptions (adapt if your server uses different event names/payloads):
 *    * client.getSocket() returns the socket.io Socket (or undefined if not connected).
 *    * Signalling for WebRTC uses the `signal` event (PeerManager already listens to that).
 *    * Call control events used here:
 *        - "call:request"      (caller -> server) payload { toUserId, fromUserId }
 *        - "call:request:ack"  (server -> caller) payload { ok, callId, targetSocketId }
 *        - "incoming-call"     (server -> callee) payload { id: callId, fromUserId, fromSocketId }
 *        - "call:accept"       (callee -> server) payload { callId }
 *        - "call:reject"       (callee -> server) payload { callId }
 *        - "call:end"          (either -> server) payload { callId }
 *        - "call:ended"        (server -> both) payload { callId, reason }
 *
 *  If your server uses different names/payloads, change those strings and handlers below.
 *
 *  The hook exposes the call state and functions used by DMChatShell:
 *    incomingCall, activeCall, isCalling, isRinging, isOnCall, isEnded, callHistory,
 *    startCall, answerCall, rejectCall, endCall
 */
export function useCall(client: any, currentUserId: string, currentTargetUserId?: string) {
  const [incomingCall, setIncomingCall] = useState<any | null>(null);
  const [activeCall, setActiveCall] = useState<any | null>(null);
  const [isCalling, setIsCalling] = useState(false);
  const [isRinging, setIsRinging] = useState(false);
  const [isOnCall, setIsOnCall] = useState(false);
  const [isEnded, setIsEnded] = useState(false);
  const [callHistory, setCallHistory] = useState<any[]>([]);

  const pmRef = useRef<PeerManager | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);

  const getSocket = () => client?.getSocket?.();

  // create PeerManager instance (idempotent)
  const ensurePeerManager = (opts: { debug?: boolean } = {}) => {
    if (pmRef.current) return pmRef.current;
    const socket = getSocket();
    if (!socket) {
      console.warn("[useCall] no socket available from client");
      return null;
    }
    const pm = new PeerManager(socket, {
      onLocalStream: (s: any) => {
        localStreamRef.current = s;
      },
      onRemoteStream: (s: any) => {
        remoteStreamRef.current = s;
      },
      debug: !!opts.debug,
    });
    pmRef.current = pm;
    return pm;
  };

  // Cleanup peer manager state
  const cleanupPeer = async () => {
    if (pmRef.current) {
      try {
        await pmRef.current.endCall();
      } catch (e) {}
      pmRef.current = null;
    }
    localStreamRef.current = null;
    remoteStreamRef.current = null;
  };

  // Start an outgoing call to the currently selected target user (currentTargetUserId).
  // Returns a promise that resolves when call request acknowledged by server (if server acks).
  const startCall = async (overrideTargetUserId?: string) => {
    const toUserId = overrideTargetUserId ?? currentTargetUserId;
    if (!toUserId) throw new Error("No target user ID provided to startCall");
    const socket = getSocket();
    if (!socket) throw new Error("Socket not connected");

    setIsCalling(true);
    setIsEnded(false);

    // Ask server to create a call request. Server should return the callee socket id so we can call directly.
    return new Promise<void>((resolve, reject) => {
      // listen once for ack
      const ackHandler = (ack: any) => {
        try {
          if (!ack || !ack.ok) {
            setIsCalling(false);
            reject(new Error((ack && ack.error) || "Call request rejected"));
            socket.off("call:request:ack", ackHandler);
            return;
          }

          const { callId } = ack;
          // set activeCall meta
          setActiveCall({ id: callId, with: toUserId });
          // create PeerManager and initiate the WebRTC offer using userId-based signaling
          const pm = ensurePeerManager({ debug: false });
          if (!pm) {
            reject(new Error("Failed to create PeerManager"));
            return;
          }
          // Use userId-based signaling (backend relays to user room)
          pm.call(toUserId).catch((err: any) => {
            console.error("[useCall] PeerManager.call error", err);
            reject(err);
          });

          // now we are "calling"
          setIsCalling(true);
          socket.off("call:request:ack", ackHandler);
          resolve();
        } catch (e) {
          socket.off("call:request:ack", ackHandler);
          reject(e);
        }
      };

      socket.on("call:request:ack", ackHandler);
      // send call request
      socket.emit("call:request", { toUserId, fromUserId: currentUserId }, (clientAck: any) => {
        // Optional: some servers send immediate callback ack via callback
        // If server uses acks via callback instead of event, handle it here.
        if (clientAck) {
          ackHandler(clientAck);
        }
      });

      // safety timeout if server doesn't ack
      const timeout = setTimeout(() => {
        socket.off("call:request:ack", ackHandler);
        setIsCalling(false);
        reject(new Error("call request timed out"));
      }, 20_000);

      // clear timeout when promise resolves/rejects - handled by resolve/reject above.
    });
  };

  // Answer an incoming call (callee flow)
  // callId: id of the incoming call (from incomingCall state)
  const answerCall = async (callId?: string, fromUserId?: string) => {
    const socket = getSocket();
    if (!socket) throw new Error("Socket not connected");

    // Create PeerManager so it is ready to receive incoming offer via 'signal'
    ensurePeerManager({ debug: false });

    // Inform server that we accept (server can forward ack to caller)
    try {
      socket.emit("call:accept", { callId, toUserId: fromUserId });
      setIsRinging(false);
      setIsOnCall(true);
      setActiveCall((prev: any) => prev || { id: callId, with: fromUserId });
      return;
    } catch (e) {
      console.error("[useCall] answerCall error", e);
      throw e;
    }
  };

  const rejectCall = (callId?: string) => {
    const socket = getSocket();
    if (!socket) {
      console.warn("[useCall] no socket to send reject");
      setIncomingCall(null);
      setIsRinging(false);
      return;
    }
    socket.emit("call:reject", { callId, toUserId: incomingCall?.fromUserId ?? activeCall?.with });
    setIncomingCall(null);
    setIsRinging(false);
  };

  // End active call
  const endCall = async (callId?: string) => {
    const socket = getSocket();
    if (socket && activeCall?.id) {
      socket.emit("call:end", { callId: callId ?? activeCall.id, otherUserId: activeCall.with });
    } else if (socket && callId) {
      socket.emit("call:end", { callId, otherUserId: activeCall?.with });
    }

    // cleanup PeerManager & local media
    try {
      await cleanupPeer();
    } catch (e) {
      console.error("[useCall] cleanup error", e);
    }
    if (activeCall) {
      setCallHistory((h) => [...h, { ...(activeCall as any), endedAt: Date.now() }]);
    }
    setActiveCall(null);
    setIsCalling(false);
    setIsRinging(false);
    setIsOnCall(false);
    setIsEnded(true);
  };

  // socket event handlers setup/teardown
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onIncoming = (payload: any) => {
      // payload expected: { id: callId, fromUserId, fromSocketId }
      setIncomingCall(payload);
      setIsRinging(true);
      // ensure peer manager exists (so it can handle an incoming 'signal' message)
      ensurePeerManager({ debug: false });
    };

    const onCallAccepted = (payload: any) => {
      // payload maybe: { callId, accepterSocketId }
      // caller: when callee accepted, we are officially "on call"
      setIsCalling(false);
      setIsOnCall(true);
      if (payload && payload.callId) {
        setActiveCall((prev: any) => prev || { id: payload.callId, socketId: payload.accepterSocketId });
      }
    };

    const onCallEnded = (payload: any) => {
      // payload: { callId, reason }
      // cleanup local state
      cleanupPeer().catch(() => {});
      setIsOnCall(false);
      setIsCalling(false);
      setIsRinging(false);
      setIsEnded(true);
      if (payload && payload.callId && activeCall?.id === payload.callId) {
        setCallHistory((h) => [...h, { ...(activeCall as any), endedAt: Date.now(), reason: payload.reason }]);
        setActiveCall(null);
      }
      setIncomingCall(null);
    };

    socket.on("incoming-call", onIncoming);
    socket.on("call:accepted", onCallAccepted);
    socket.on("call:ended", onCallEnded);
    // NOTE: PeerManager already binds `signal` event for SDP/ICE

    return () => {
      socket.off("incoming-call", onIncoming);
      socket.off("call:accepted", onCallAccepted);
      socket.off("call:ended", onCallEnded);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, currentUserId, currentTargetUserId, activeCall]);

  // If the user switches the chat target (otherUserId changes), we update any active metadata.
  useEffect(() => {
    // nothing automatic here - keeping for future expansion
  }, [currentTargetUserId]);

  // expose public API
  return {
    incomingCall,
    activeCall,
    isCalling,
    isRinging,
    isOnCall,
    isEnded,
    callHistory,
    startCall,
    answerCall,
    rejectCall,
    endCall,
    // helper refs (if UI needs raw streams)
    _internal: {
      peerManager: pmRef,
      localStreamRef,
      remoteStreamRef,
    },
  };
}