import React, { useEffect, useMemo, useRef, useState } from "react";
import { PeerManager } from "@chat-sdk/sdk-web";

interface VideoCallProps {
  client: any;
  targetUserId?: string;
  autoCall?: boolean;
  onHangup?: () => void;
  otherDisplayName?: string;
}

const Icon = ({ path, className = "" }: { path: string; className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d={path} />
  </svg>
);

const VideoCall: React.FC<VideoCallProps> = ({ client, targetUserId, autoCall = true, onHangup, otherDisplayName }) => {
  const localRef = useRef<HTMLVideoElement | null>(null);
  const remoteRef = useRef<HTMLVideoElement | null>(null);
  const pmRef = useRef<PeerManager | null>(null);

  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [connected, setConnected] = useState(false);
  const [stats, setStats] = useState<{ bitrate?: string; resolution?: string }>({});
  const [error, setError] = useState<string | null>(null);

  // Icons
  const icons = useMemo(() => ({
    mic: "M12 14a4 4 0 0 0 4-4V6a4 4 0 1 0-8 0v4a4 4 0 0 0 4 4Zm-1 1.93A7.001 7.001 0 0 1 5 9a1 1 0 1 1 2 0 5 5 0 0 0 5 5 5 5 0 0 0 5-5 1 1 0 1 1 2 0 7 7 0 0 1-6 6.93V20a1 1 0 1 1-2 0v-4.07Z",
    micOff: "M15 10V6a3 3 0 0 0-5.197-2.02l8.108 8.108A3.988 3.988 0 0 0 15 10Zm4-1a1 1 0 1 1 2 0 6.97 6.97 0 0 1-2.016 4.926l-1.414-1.414A4.972 4.972 0 0 0 19 9ZM4.222 3.808a1 1 0 0 0-1.414 1.414l3.13 3.13A4.98 4.98 0 0 0 6 10a5 5 0 0 0 8.536 3.536l1.41 1.41A6.972 6.972 0 0 1 13 16.93V20a1 1 0 1 1-2 0v-3.07A6.999 6.999 0 0 1 5 9a1 1 0 0 1 2 0c0 .57.12 1.112.336 1.602l-3.114-3.114Z",
    cam: "M17 10.5V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-3.5l4 3v-9l-4 3Z",
    camOff: "M3.707 2.293 2.293 3.707 5 6.414V17a2 2 0 0 0 2 2h9a1.99 1.99 0 0 0 1.414-.586l2.879 2.879 1.414-1.414-18-18Zm9.172 9.172L9.414 8.414 7 6V7a2 2 0 0 0 2 2h2v2a2 2 0 0 0 1.879 1.992ZM19 9.5l4-3v9l-4-3V17a2 2 0 0 1-2 2h-6.586l9.086-9.086V9.5Z",
    phone: "M6.62 10.79a15.464 15.464 0 0 0 6.59 6.59l1.82-1.82a1 1 0 0 1 1.01-.24c1.12.37 2.33.57 3.56.57a1 1 0 0 1 1 1v3.09a1 1 0 0 1-1 1C10.07 22 2 13.93 2 3.5a1 1 0 0 1 1-1h3.09a1 1 0 0 1 1 1c0 1.23.2 2.44.57 3.56a1 1 0 0 1-.24 1.01l-1.8 1.72Z",
    flip: "M4 12a8 8 0 0 1 14.32-4H16l4 4 4-4h-2.32A10 10 0 1 0 2 12h2Z",
    screen: "M3 4a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h7v2H7a1 1 0 1 0 0 2h10a1 1 0 1 0 0-2h-3v-2h7a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1H3Z",
  }), []);

  useEffect(() => {
    const socket = client.getSocket?.();
    if (!socket) {
      setError("No socket available on client. Connect first.");
      return;
    }

    const pm = new PeerManager(socket, {
      onLocalStream: (s) => {
        if (localRef.current) localRef.current.srcObject = s;
      },
      onRemoteStream: (s) => {
        if (remoteRef.current) remoteRef.current.srcObject = s;
        setConnected(true);
      },
      debug: false,
    });
    pmRef.current = pm;

    if (autoCall && targetUserId) {
      pm.call(targetUserId).catch((e) => {
        console.error("call failed", e);
        setError(e?.message || "Call failed");
      });
    }

    return () => {
      pm.endCall().catch(() => {});
      pmRef.current = null;
    };
  }, [client, targetUserId, autoCall]);

  // basic bitrate/res polling (optional, lightweight)
  useEffect(() => {
    let timer: any;
    const poll = async () => {
      try {
        const remote = remoteRef.current as any;
        const stream: MediaStream | undefined = remote?.srcObject as any;
        if (stream) {
          const videoTrack = stream.getVideoTracks?.()[0];
          const settings = videoTrack?.getSettings?.();
          if (settings?.width && settings?.height) {
            setStats((s) => ({ ...s, resolution: `${settings.width}x${settings.height}` }));
          }
        }
      } catch {}
      timer = setTimeout(poll, 1500);
    };
    poll();
    return () => clearTimeout(timer);
  }, []);

  // keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "m") toggleMute();
      if (e.key.toLowerCase() === "v") toggleVideo();
      if (e.key.toLowerCase() === "h") hangup();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const toggleMute = () => {
    setMuted((m) => {
      pmRef.current?.muteAudio(!m);
      return !m;
    });
  };

  const toggleVideo = () => {
    setVideoOff((v) => {
      pmRef.current?.muteVideo(!v);
      return !v;
    });
  };

  const hangup = async () => {
    try {
      await pmRef.current?.endCall();
    } catch (e) {
      console.error("hangup error", e);
    } finally {
      onHangup?.();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
      <div className="absolute inset-0 backdrop-blur-md bg-black/30" />

      {/* Error toast */}
      {error && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 text-sm text-white bg-red-500/90 px-4 py-2 rounded-full shadow-lg">
          {error}
        </div>
      )}

      <div className="relative w-[96%] max-w-6xl aspect-[16/9] rounded-2xl overflow-hidden shadow-2xl border border-white/10">
        {/* Remote video as background layer */}
        <video
          ref={remoteRef}
          autoPlay
          playsInline
          className="absolute inset-0 w-full h-full object-cover bg-black"
        />

        {/* Gradient overlay */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/60 via-transparent to-black/40" />

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: connected ? "#34d399" : "#f59e0b" }} />
            <div className="text-sm opacity-80">{connected ? "Connected" : "Connecting..."}</div>
          </div>
          <div className="text-sm opacity-80">
            {stats.resolution ? `Remote ${stats.resolution}` : ""}
          </div>
        </div>

        {/* Bottom control dock */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 shadow-xl">
          <button
            onClick={toggleMute}
            className={`group w-12 h-12 rounded-full grid place-items-center transition ${muted ? "bg-red-500 text-white" : "bg-white/20 text-white hover:bg-white/30"}`}
            title="Mute (M)"
          >
            <Icon path={muted ? icons.micOff : icons.mic} className="w-6 h-6" />
          </button>

          <button
            onClick={toggleVideo}
            className={`group w-12 h-12 rounded-full grid place-items-center transition ${videoOff ? "bg-yellow-500 text-white" : "bg-white/20 text-white hover:bg-white/30"}`}
            title="Toggle Video (V)"
          >
            <Icon path={videoOff ? icons.camOff : icons.cam} className="w-6 h-6" />
          </button>

          <button
            onClick={hangup}
            className="group w-12 h-12 rounded-full grid place-items-center bg-red-600 text-white hover:bg-red-700 transition shadow-lg"
            title="Hang Up (H)"
          >
            <Icon path={icons.phone} className="w-6 h-6 -rotate-45" />
          </button>
        </div>

        {/* Local video PiP */}
        <div className="absolute right-4 bottom-24 sm:bottom-24 md:bottom-24 w-40 sm:w-48 md:w-56 lg:w-64 aspect-video rounded-xl overflow-hidden border border-white/20 shadow-xl bg-black/60">
          <video
            ref={localRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
          />
          <div className="absolute top-2 left-2 text-xs px-2 py-1 rounded-full bg-black/50 text-white/90">
            You
          </div>
        </div>

        {/* Name tag */}
        <div className="absolute left-4 bottom-4 text-white/90">
          <div className="px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-sm">
            {otherDisplayName || targetUserId || "Call"}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoCall;
