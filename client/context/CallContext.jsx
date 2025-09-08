// client/context/CallContext.jsx
import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  useCallback,
} from "react";
import { AuthContext } from "./AuthContext";

export const CallContext = createContext();

export const CallProvider = ({ children }) => {
  const { authUser, socket } = useContext(AuthContext);

  // Call states
  const [callState, setCallState] = useState("idle"); // idle | outgoing | ringing | in-call
  const [callType, setCallType] = useState(null);
  const [currentCall, setCurrentCall] = useState(null);

  // Media streams (state + ref for reliable cleanup)
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);

  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);
  useEffect(() => {
    remoteStreamRef.current = remoteStream;
  }, [remoteStream]);

  // UI flags
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true);

  // WebRTC internals
  const peerConnection = useRef(null);
  const pendingCandidates = useRef([]);
  const iceServers = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

  /** stop all tracks of a MediaStream safely */
  const stopTracks = (stream) => {
    if (!stream) return;
    stream.getTracks().forEach((t) => {
      try {
        t.stop();
      } catch {}
    });
  };

  /** cleanup peer connection */
  const cleanupPeerConnection = () => {
    if (peerConnection.current) {
      try {
        peerConnection.current.ontrack = null;
        peerConnection.current.onicecandidate = null;
        peerConnection.current.onconnectionstatechange = null;
        peerConnection.current.close();
      } catch {}
    }
    peerConnection.current = null;
  };

  /** stop and clear all streams */
  const stopAndClearStreams = useCallback(() => {
    stopTracks(localStreamRef.current);
    stopTracks(remoteStreamRef.current);
    setLocalStream(null);
    setRemoteStream(null);
    setIsCameraOn(false);
    setIsMuted(false);
  }, []);

  /** reset call state */
  const resetCall = useCallback(() => {
    cleanupPeerConnection();
    pendingCandidates.current = [];
    setCallState("idle");
    setCallType(null);
    setCurrentCall(null);
  }, []);

  /** create peer connection */
  const createPeerConnection = (toUserId, localMedia) => {
    cleanupPeerConnection();
    const pc = new RTCPeerConnection(iceServers);
    peerConnection.current = pc;

    // add local tracks
    localMedia?.getTracks()?.forEach((track) => pc.addTrack(track, localMedia));

    // remote stream
    const remote = new MediaStream();
    setRemoteStream(remote);

    pc.ontrack = (event) => {
      if (event.streams?.[0]) {
        event.streams[0].getTracks().forEach((t) => remote.addTrack(t));
      } else if (event.track) {
        remote.addTrack(event.track);
      }
    };

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socket.emit("call:candidate", { toUserId, candidate: e.candidate });
      }
    };

    pc.onconnectionstatechange = () => {
      if (["disconnected", "failed", "closed"].includes(pc.connectionState)) {
        endCall();
      }
    };

    // flush pending ICE
    pendingCandidates.current.forEach(async (c) => {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(c));
      } catch {}
    });
    pendingCandidates.current = [];

    return pc;
  };

  /** caller starts call */
  const startCall = async (type, toUser) => {
    try {
      setCallType(type);
      setCallState("outgoing");
      setCurrentCall({ fromUser: authUser, toUser, callType: type });

      const media = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === "video",
      });
      setLocalStream(media);
      setIsCameraOn(!!media.getVideoTracks().length);
      setIsMuted(!media.getAudioTracks().some((t) => t.enabled));

      const pc = createPeerConnection(toUser._id, media);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit("call:initiate", {
        toUserId: toUser._id,
        fromUser: authUser,
        callType: type,
      });
      socket.emit("call:offer", {
        toUserId: toUser._id,
        sdp: offer,
        fromUser: authUser,
        callType: type,
      });
    } catch (err) {
      console.error("startCall error:", err);
      endCall();
    }
  };

  /** callee accepts */
  const acceptCall = async () => {
    if (!currentCall?.fromUser || !currentCall?.offer) return;
    try {
      setCallState("in-call");
      setCallType(currentCall.callType);

      const media = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: currentCall.callType === "video",
      });
      setLocalStream(media);
      setIsCameraOn(!!media.getVideoTracks().length);
      setIsMuted(!media.getAudioTracks().some((t) => t.enabled));

      const pc = createPeerConnection(currentCall.fromUser._id, media);
      await pc.setRemoteDescription(new RTCSessionDescription(currentCall.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit("call:accept", { toUserId: currentCall.fromUser._id });
      socket.emit("call:answer", {
        toUserId: currentCall.fromUser._id,
        sdp: answer,
      });
    } catch (err) {
      console.error("acceptCall error:", err);
      endCall();
    }
  };

  /** reject call */
  const rejectCall = () => {
    if (currentCall?.fromUser) {
      socket.emit("call:reject", { toUserId: currentCall.fromUser._id });
    }
    endCall();
  };

  /** end call */
  const endCall = (toUserId) => {
    const peerId =
      toUserId || currentCall?.fromUser?._id || currentCall?.toUser?._id;
    if (peerId) {
      socket.emit("call:end", { toUserId: peerId });
    }
    stopAndClearStreams();
    resetCall();
  };

  /** toggle mic */
  const toggleMute = () => {
    const s = localStreamRef.current;
    if (!s) return;
    const aud = s.getAudioTracks();
    if (!aud.length) return;
    const enabled = !aud[0].enabled;
    aud.forEach((t) => (t.enabled = enabled));
    setIsMuted(!enabled);
  };

  /** toggle camera */
  const toggleCamera = async () => {
    const s = localStreamRef.current;
    if (s) {
      const vid = s.getVideoTracks();
      if (vid.length) {
        const enabled = !vid[0].enabled;
        vid.forEach((t) => (t.enabled = enabled));
        setIsCameraOn(enabled);
        return;
      }
    }
    if (callType === "video") {
      try {
        const media = await navigator.mediaDevices.getUserMedia({ video: true });
        const newTrack = media.getVideoTracks()[0];
        if (localStreamRef.current) {
          localStreamRef.current.addTrack(newTrack);
          setLocalStream(localStreamRef.current);
        } else {
          const newStream = new MediaStream([newTrack]);
          setLocalStream(newStream);
        }
        peerConnection.current?.addTrack(newTrack, localStreamRef.current);
        setIsCameraOn(true);
      } catch (err) {
        console.warn("toggleCamera failed:", err);
      }
    }
  };

  /** socket listeners */
  useEffect(() => {
    if (!socket) return;

    const onRing = ({ fromUser, callType }) => {
      setCallState("ringing");
      setCallType(callType);
      setCurrentCall((prev) => ({ ...(prev || {}), fromUser, callType }));
    };

    const onOffer = async ({ sdp, fromUser, callType }) => {
      setCurrentCall((prev) => ({
        ...(prev || {}),
        fromUser: fromUser || prev?.fromUser,
        callType: callType || prev?.callType,
        offer: sdp,
      }));
      setCallState((prev) =>
        prev === "in-call" || prev === "outgoing" ? prev : "ringing"
      );

      if (peerConnection.current) {
        try {
          await peerConnection.current.setRemoteDescription(
            new RTCSessionDescription(sdp)
          );
        } catch {}
      }
    };

    const onAnswer = async ({ sdp }) => {
      if (peerConnection.current) {
        try {
          await peerConnection.current.setRemoteDescription(
            new RTCSessionDescription(sdp)
          );
          setCallState("in-call");
        } catch {}
      } else {
        setCurrentCall((prev) => ({ ...(prev || {}), answer: sdp }));
      }
    };

    const onCandidate = async ({ candidate }) => {
      try {
        if (peerConnection.current) {
          await peerConnection.current.addIceCandidate(
            new RTCIceCandidate(candidate)
          );
        } else {
          pendingCandidates.current.push(candidate);
        }
      } catch {}
    };

    const onEnded = () => endCall();

    socket.on("call:ring", onRing);
    socket.on("call:offer", onOffer);
    socket.on("call:answer", onAnswer);
    socket.on("call:candidate", onCandidate);
    socket.on("call:rejected", onEnded);
    socket.on("call:busy", onEnded);
    socket.on("call:ended", onEnded);

    return () => {
      socket.off("call:ring", onRing);
      socket.off("call:offer", onOffer);
      socket.off("call:answer", onAnswer);
      socket.off("call:candidate", onCandidate);
      socket.off("call:rejected", onEnded);
      socket.off("call:busy", onEnded);
      socket.off("call:ended", onEnded);
    };
  }, [socket]);

  // stop tracks on tab close
  useEffect(() => {
    const handler = () => {
      stopAndClearStreams();
      cleanupPeerConnection();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [stopAndClearStreams]);

  return (
    <CallContext.Provider
      value={{
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
      }}
    >
      {children}
    </CallContext.Provider>
  );
};
