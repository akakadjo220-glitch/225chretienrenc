import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Video as VideoIcon, VideoOff, PhoneOff, Maximize, Minimize } from 'lucide-react';
import { supabase } from '../supabaseClient';

interface VideoCallProps {
    currentUserId: string;
    targetUserId: string;
    targetUserName: string;
    isVideo: boolean;
    isInitiator: boolean;
    onHangup: () => void;
}

const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
    ]
};

export const VideoCall: React.FC<VideoCallProps> = ({ currentUserId, targetUserId, targetUserName, isVideo, isInitiator, onHangup }) => {
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);

    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(!isVideo);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [callStatus, setCallStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

    const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const channelRef = useRef<any>(null);

    const roomId = [currentUserId, targetUserId].sort().join('-');

    useEffect(() => {
        let isCleaningUp = false;

        const initCall = async () => {
            try {
                // 1. Get local media
                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: true,
                    video: isVideo
                });
                localStreamRef.current = stream;
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = stream;
                }

                // 2. Setup PeerConnection
                const pc = new RTCPeerConnection(ICE_SERVERS);
                peerConnectionRef.current = pc;

                // Add local tracks to PC
                stream.getTracks().forEach(track => {
                    pc.addTrack(track, stream);
                });

                // Handle incoming tracks
                pc.ontrack = (event) => {
                    if (remoteVideoRef.current && event.streams && event.streams[0]) {
                        remoteVideoRef.current.srcObject = event.streams[0];
                        setCallStatus('connected');
                    }
                };

                // Handle ICE candidates
                pc.onicecandidate = (event) => {
                    if (event.candidate && channelRef.current) {
                        channelRef.current.send({
                            type: 'broadcast',
                            event: 'signal',
                            payload: { type: 'ice-candidate', candidate: event.candidate, sender: currentUserId }
                        });
                    }
                };

                // 3. Setup Supabase Signaling Channel
                const channel = supabase.channel(`call-${roomId}`, {
                    config: { broadcast: { self: false } }
                });
                channelRef.current = channel;

                channel.on('broadcast', { event: 'signal' }, async ({ payload }) => {
                    if (isCleaningUp || payload.sender === currentUserId) return;

                    try {
                        if (payload.type === 'offer') {
                            await pc.setRemoteDescription(new RTCSessionDescription(payload.offer));
                            const answer = await pc.createAnswer();
                            await pc.setLocalDescription(answer);
                            channel.send({
                                type: 'broadcast',
                                event: 'signal',
                                payload: { type: 'answer', answer, sender: currentUserId }
                            });
                        } else if (payload.type === 'answer') {
                            await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
                        } else if (payload.type === 'ice-candidate') {
                            await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
                        } else if (payload.type === 'hangup') {
                            handleHangup();
                        }
                    } catch (e) {
                        console.error('Signaling error', e);
                    }
                });

                await channel.subscribe(async (status) => {
                    if (status === 'SUBSCRIBED' && isInitiator && !isCleaningUp) {
                        // Start the call if initiator
                        try {
                            const offer = await pc.createOffer();
                            await pc.setLocalDescription(offer);
                            channel.send({
                                type: 'broadcast',
                                event: 'signal',
                                payload: { type: 'offer', offer, sender: currentUserId }
                            });
                        } catch (e) {
                            console.error("Erreur création d'offre:", e);
                        }
                    }
                });

            } catch (err) {
                console.error("Impossible d'accéder aux médias ou problème WebRTC", err);
                alert("Erreur d'accès à la caméra ou au microphone.");
                handleHangup();
            }
        };

        initCall();

        return () => {
            isCleaningUp = true;
            cleanup();
        };
    }, []);

    const cleanup = () => {
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
        }
        if (peerConnectionRef.current) {
            peerConnectionRef.current.close();
            peerConnectionRef.current = null;
        }
        if (channelRef.current) {
            supabase.removeChannel(channelRef.current);
            channelRef.current = null;
        }
    };

    const handleHangup = () => {
        if (channelRef.current) {
            channelRef.current.send({
                type: 'broadcast',
                event: 'signal',
                payload: { type: 'hangup', sender: currentUserId }
            }).finally(() => {
                cleanup();
                onHangup();
            });
        } else {
            cleanup();
            onHangup();
        }
    };

    const toggleMute = () => {
        if (localStreamRef.current) {
            const audioTrack = localStreamRef.current.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsMuted(!audioTrack.enabled);
            }
        }
    };

    const toggleVideo = () => {
        if (localStreamRef.current) {
            const videoTrack = localStreamRef.current.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setIsVideoOff(!videoTrack.enabled);
            }
        }
    };

    return (
        <div className={`fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center transition-all ${isFullscreen ? 'p-0' : 'p-4 md:p-8'}`}>

            {/* Call Header */}
            <div className={`absolute top-0 left-0 right-0 p-6 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent z-10 ${isFullscreen ? 'opacity-0 hover:opacity-100 transition-opacity' : ''}`}>
                <div className="text-white">
                    <h2 className="text-xl font-bold">{targetUserName}</h2>
                    <p className="text-sm text-slate-300">
                        {callStatus === 'connecting' ? 'Connexion sécurisée en cours...' : 'Appel sécurisé (End-to-End)'}
                    </p>
                </div>
                <button onClick={() => setIsFullscreen(!isFullscreen)} className="text-white p-2 hover:bg-white/10 rounded-full transition">
                    {isFullscreen ? <Minimize size={24} /> : <Maximize size={24} />}
                </button>
            </div>

            {/* Video Streams Container */}
            <div className="relative w-full max-w-5xl aspect-video bg-slate-900 rounded-3xl overflow-hidden shadow-2xl flex items-center justify-center">

                {/* Remote Video (Main) */}
                <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className={`w-full h-full object-cover ${!isVideo && 'hidden'}`}
                />

                {/* Fallback if Audio Only or Connecting */}
                {(!isVideo || callStatus === 'connecting') && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <div className="w-24 h-24 bg-emerald-600 rounded-full flex items-center justify-center mb-4 animate-pulse">
                            <span className="text-3xl text-white font-bold">{targetUserName.substring(0, 2).toUpperCase()}</span>
                        </div>
                        {callStatus === 'connecting' && <div className="text-emerald-400 font-medium">Établissement du signal WebRTC...</div>}
                    </div>
                )}

                {/* Local Video (PIP) */}
                <div className="absolute bottom-6 right-6 w-32 md:w-48 aspect-video bg-black rounded-xl overflow-hidden border-2 border-slate-700 shadow-lg z-20">
                    <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : ''} scale-x-[-1]`}
                    />
                    {isVideoOff && (
                        <div className="absolute inset-0 flex items-center justify-center bg-slate-800 text-slate-400">
                            <VideoOff size={24} />
                        </div>
                    )}
                </div>
            </div>

            {/* Call Controls */}
            <div className={`absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-6 bg-white/10 backdrop-blur-md px-8 py-4 rounded-full border border-white/20 shadow-xl ${isFullscreen ? 'opacity-0 hover:opacity-100 transition-opacity' : ''}`}>
                <button
                    onClick={toggleMute}
                    className={`p-4 rounded-full transition ${isMuted ? 'bg-red-500/80 text-white' : 'bg-white/20 text-white hover:bg-white/30'}`}
                >
                    {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
                </button>

                {isVideo && (
                    <button
                        onClick={toggleVideo}
                        className={`p-4 rounded-full transition ${isVideoOff ? 'bg-red-500/80 text-white' : 'bg-white/20 text-white hover:bg-white/30'}`}
                    >
                        {isVideoOff ? <VideoOff size={24} /> : <VideoIcon size={24} />}
                    </button>
                )}

                <button
                    onClick={handleHangup}
                    className="p-5 rounded-full bg-red-600 text-white hover:bg-red-500 transition shadow-lg shadow-red-500/30"
                >
                    <PhoneOff size={28} />
                </button>
            </div>
        </div>
    );
};
