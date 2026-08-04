import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';

interface AudioPlayerProps {
    src: string;
    isMe: boolean;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ src, isMe }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [playbackRate, setPlaybackRate] = useState<1 | 1.5 | 2>(1);
    
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const onLoadedMetadata = () => {
            if (audio.duration && !isNaN(audio.duration)) {
                setDuration(audio.duration);
            }
        };

        const onTimeUpdate = () => {
            setCurrentTime(audio.currentTime);
        };

        const onEnded = () => {
            setIsPlaying(false);
            setCurrentTime(0);
        };

        audio.addEventListener('loadedmetadata', onLoadedMetadata);
        audio.addEventListener('timeupdate', onTimeUpdate);
        audio.addEventListener('ended', onEnded);

        return () => {
            audio.removeEventListener('loadedmetadata', onLoadedMetadata);
            audio.removeEventListener('timeupdate', onTimeUpdate);
            audio.removeEventListener('ended', onEnded);
        };
    }, [src]);

    const togglePlay = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
        } else {
            audioRef.current.play().then(() => setIsPlaying(true)).catch(console.error);
        }
    };

    const toggleSpeed = () => {
        const rates: (1 | 1.5 | 2)[] = [1, 1.5, 2];
        const nextIdx = (rates.indexOf(playbackRate) + 1) % rates.length;
        const nextRate = rates[nextIdx];
        setPlaybackRate(nextRate);
        if (audioRef.current) {
            audioRef.current.playbackRate = nextRate;
        }
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const targetTime = Number(e.target.value);
        setCurrentTime(targetTime);
        if (audioRef.current) {
            audioRef.current.currentTime = targetTime;
        }
    };

    const formatTime = (sec: number) => {
        if (isNaN(sec) || sec <= 0) return '0:00';
        const mins = Math.floor(sec / 60);
        const secs = Math.floor(sec % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <div className={`flex items-center gap-3 p-2.5 rounded-2xl max-w-[280px] sm:max-w-[320px] shadow-sm select-none transition-all ${
            isMe ? 'bg-emerald-700/90 text-white' : 'bg-slate-100 text-slate-800 border border-slate-200'
        }`}>
            <audio ref={audioRef} src={src} preload="metadata" />

            {/* Play / Pause Button */}
            <button
                type="button"
                onClick={togglePlay}
                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-md transition transform active:scale-95 ${
                    isMe 
                        ? 'bg-white text-emerald-700 hover:bg-emerald-50' 
                        : 'bg-emerald-600 text-white hover:bg-emerald-700'
                }`}
                title={isPlaying ? "Pause" : "Écouter la note vocale"}
            >
                {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
            </button>

            {/* Waveform Visualizer & Progress Bar */}
            <div className="flex-1 space-y-1 overflow-hidden">
                {/* Waveform Bars */}
                <div className="flex items-center gap-0.5 h-6 px-1">
                    {[40, 70, 30, 90, 60, 100, 45, 80, 50, 95, 65, 35, 85, 55, 75, 40, 90, 60].map((h, i) => {
                        const barProgress = (i / 18) * 100;
                        const isPassed = barProgress <= progressPercent;
                        return (
                            <div
                                key={i}
                                style={{ height: `${h}%` }}
                                className={`w-1 rounded-full transition-all duration-150 ${
                                    isPassed 
                                        ? (isMe ? 'bg-white' : 'bg-emerald-600') 
                                        : (isMe ? 'bg-emerald-500/50' : 'bg-slate-300')
                                } ${isPlaying && isPassed ? 'animate-pulse' : ''}`}
                            />
                        );
                    })}
                </div>

                {/* Range Slider & Time */}
                <div className="flex items-center justify-between text-[10px] font-mono opacity-90 px-0.5">
                    <span>{formatTime(currentTime)}</span>
                    <input
                        type="range"
                        min={0}
                        max={duration || 100}
                        value={currentTime}
                        onChange={handleSeek}
                        className="w-full mx-2 h-1 accent-emerald-400 bg-black/10 rounded-lg cursor-pointer appearance-none"
                    />
                    <span>{formatTime(duration)}</span>
                </div>
            </div>

            {/* Playback Speed Toggle */}
            <button
                type="button"
                onClick={toggleSpeed}
                className={`text-[10px] font-extrabold px-2 py-1 rounded-full border shrink-0 transition active:scale-90 ${
                    isMe 
                        ? 'bg-emerald-600 text-white border-emerald-400 hover:bg-emerald-500' 
                        : 'bg-white text-emerald-800 border-slate-300 hover:bg-slate-50'
                }`}
                title="Changer la vitesse de lecture (1x, 1.5x, 2x)"
            >
                {playbackRate}x
            </button>
        </div>
    );
};
