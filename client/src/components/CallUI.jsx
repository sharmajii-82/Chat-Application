// client/src/components/CallUI.jsx
import React, { useContext, useEffect, useRef, useState } from "react";
import { CallContext } from "../../context/CallContext";
import assets from "../assets/assets";

const formatDuration = (s) => {
  const mm = Math.floor(s / 60).toString().padStart(2, "0");
  const ss = (s % 60).toString().padStart(2, "0");
  return `${mm}:${ss}`;
};

const CallUI = ({ selectedUser }) => {
  const {
    callState,
    callType,
    currentCall,
    localStream,
    remoteStream,
    isMuted,
    isCameraOn,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleCamera,
  } = useContext(CallContext);

  const remoteRef = useRef(null);
  const localRef = useRef(null);

  const [duration, setDuration] = useState(0);
  const [fitMode, setFitMode] = useState("contain"); // 'contain' or 'cover'

  useEffect(() => setDuration(0), [callState]);

  useEffect(() => {
    let t;
    if (callState === "in-call") {
      t = setInterval(() => setDuration((d) => d + 1), 1000);
    }
    return () => clearInterval(t);
  }, [callState]);

  useEffect(() => {
    if (remoteRef.current) {
      try { remoteRef.current.srcObject = remoteStream; } catch {}
    }
  }, [remoteStream]);

  useEffect(() => {
    if (localRef.current) {
      try { localRef.current.srcObject = localStream; } catch {}
    }
  }, [localStream]);

  if (callState === "idle") return null;

  const remoteName = (currentCall?.fromUser?.fullName || selectedUser?.fullName || currentCall?.toUser?.fullName || "User");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-auto">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div className="relative w-[92%] max-w-4xl h-[78%] bg-black/80 rounded-2xl overflow-hidden shadow-2xl">
        {/* header */}
        <div className="absolute top-3 left-4 right-4 flex items-center justify-between z-30">
          <div className="flex items-center gap-3">
            <img src={currentCall?.fromUser?.profilePic || selectedUser?.profilePic || assets.avatar_icon} alt="avatar" className="w-10 h-10 rounded-full border border-white/20" />
            <div>
              <div className="text-white font-semibold">{remoteName}</div>
              <div className="text-xs text-gray-300">{callState === "in-call" ? `${callType === "video" ? "Video" : "Audio"} • ${formatDuration(duration)}` : `${callType} call`}</div>
            </div>
          </div>
          <div className="flex gap-2">
            {/* fit toggle */}
            <button
              onClick={() => setFitMode((m) => (m === "contain" ? "cover" : "contain"))}
              className="text-sm text-gray-200 bg-white/6 px-3 py-1 rounded-md hover:bg-white/8"
              title="Toggle fit"
            >
              {fitMode === "contain" ? "Fit" : "Fill"}
            </button>

            {/* close quick */}
            <button onClick={() => endCall()} className="w-9 h-9 rounded-md bg-white/6 flex items-center justify-center text-white/90" title="End / Close">
              ✕
            </button>
          </div>
        </div>

        {/* main area */}
        <div className="w-full h-full flex items-center justify-center bg-black">
          {callType === "video" ? (
            <>
              <video
                ref={remoteRef}
                autoPlay
                playsInline
                muted={false}
                className={`w-full h-full ${fitMode === "contain" ? "object-contain" : "object-cover"} bg-black`}
              />
              {/* local preview */}
              <div className="absolute bottom-24 right-6 w-44 h-32 rounded-lg overflow-hidden border border-white/20 bg-black">
                <video ref={localRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              </div>
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3">
              <div className="w-28 h-28 rounded-full bg-white/6 flex items-center justify-center text-5xl">🎧</div>
              <div className="text-white text-lg">{remoteName}</div>
              <div className="text-gray-300">{callState === "in-call" ? `On audio • ${formatDuration(duration)}` : "Audio call"}</div>
            </div>
          )}
        </div>

        {/* bottom controls */}
        <div className="absolute bottom-6 left-0 right-0 flex items-center justify-center gap-6 z-40">
          {/* Mute (enabled only when localStream exists) */}
          <button
            onClick={toggleMute}
            disabled={!localStream}
            className={`flex flex-col items-center gap-1 ${!localStream ? "opacity-40 cursor-not-allowed" : ""}`}
            title={!localStream ? "Accept call to enable microphone" : isMuted ? "Unmute" : "Mute"}
          >
            <div className={`w-14 h-14 rounded-full flex items-center justify-center ${isMuted ? "bg-yellow-500" : "bg-white/6"}`}>
              {isMuted ? "🔇" : "🎤"}
            </div>
            <span className="text-xs text-gray-200">{isMuted ? "Unmute" : "Mute"}</span>
          </button>

          {/* Camera toggle (only meaningful if callType === 'video') */}
          {callType === "video" && (
            <button
              onClick={toggleCamera}
              disabled={!localStream}
              className={`flex flex-col items-center gap-1 ${!localStream ? "opacity-40 cursor-not-allowed" : ""}`}
              title={!localStream ? "Accept call to enable camera" : isCameraOn ? "Turn camera off" : "Turn camera on"}
            >
              <div className="w-14 h-14 rounded-full flex items-center justify-center bg-white/6">
                {isCameraOn ? "📷" : "📷✖"}
              </div>
              <span className="text-xs text-gray-200">{isCameraOn ? "Camera" : "Camera Off"}</span>
            </button>
          )}

          {/* End call big button */}
          <button onClick={() => endCall()} className="w-20 h-20 rounded-full bg-red-600 flex items-center justify-center shadow-lg">
            <span className="text-white text-xl">End</span>
          </button>

          {/* Accept/Reject for incoming (if ringing) */}
          {callState === "ringing" && currentCall?.fromUser && (
            <>
              <button onClick={() => acceptCall()} className="flex flex-col items-center gap-1">
                <div className="w-14 h-14 rounded-full flex items-center justify-center bg-green-500">✅</div>
                <span className="text-xs text-gray-200">Accept</span>
              </button>
              <button onClick={() => rejectCall()} className="flex flex-col items-center gap-1">
                <div className="w-14 h-14 rounded-full flex items-center justify-center bg-red-500">❌</div>
                <span className="text-xs text-gray-200">Reject</span>
              </button>
            </>
          )}

          {/* Outgoing cancel */}
          {callState === "outgoing" && (
            <div className="flex flex-col items-center gap-1">
              <button onClick={() => endCall()} className="w-14 h-14 rounded-full flex items-center justify-center bg-red-500">✖</button>
              <span className="text-xs text-gray-200">Cancel</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CallUI;
