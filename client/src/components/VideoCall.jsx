import React, { useRef, useEffect, useState } from 'react';
import { useWebRTC } from '../useWebRTC.js';

const VideoCall = ({ targetUserId, isCaller }) => {
    const { localStream, remoteStream, switchAudioInput } = useWebRTC(targetUserId, isCaller);
    
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);

    const [audioDevices, setAudioDevices] = useState([]);
    const [selectedAudioDevice, setSelectedAudioDevice] = useState('');
    const [volumeLevel, setVolumeLevel] = useState(0);

    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream]);

    useEffect(() => {
        if (remoteVideoRef.current) {
            if (remoteStream) {
                remoteVideoRef.current.srcObject = remoteStream;
            } else {
                remoteVideoRef.current.srcObject = null;
            }
        }
    }, [remoteStream]);

    useEffect(() => {
        const getDevices = async () => {
            try {
                const devices = await navigator.mediaDevices.enumerateDevices();
                const audioInputs = devices.filter(device => device.kind === 'audioinput');
                setAudioDevices(audioInputs);
                if (audioInputs.length > 0 && !selectedAudioDevice) {
                    setSelectedAudioDevice(audioInputs[0].deviceId);
                }
            } catch (err) { console.error(err); }
        };
        getDevices();
    }, [localStream]);

    useEffect(() => {
        if (!localStream) return;
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const analyser = audioContext.createAnalyser();
        const microphone = audioContext.createMediaStreamSource(localStream);
        const scriptProcessor = audioContext.createScriptProcessor(2048, 1, 1);
        analyser.smoothingTimeConstant = 0.8;
        analyser.fftSize = 1024;
        microphone.connect(analyser);
        analyser.connect(scriptProcessor);
        scriptProcessor.connect(audioContext.destination);
        scriptProcessor.onaudioprocess = () => {
            const array = new Uint8Array(analyser.frequencyBinCount);
            analyser.getByteFrequencyData(array);
            let values = 0;
            const length = array.length;
            for (let i = 0; i < length; i++) values += array[i];
            setVolumeLevel(values / length);
        };
        return () => {
            scriptProcessor.disconnect();
            analyser.disconnect();
            microphone.disconnect();
            audioContext.close();
        };
    }, [localStream]);

    const handleDeviceChange = (e) => {
        const deviceId = e.target.value;
        setSelectedAudioDevice(deviceId);
        switchAudioInput(deviceId);
    };

    return (
        <div className="w-full h-full flex items-center justify-center p-4 gap-6 relative">
            
            {/* --- Vídeo Remoto --- */}
            <div className="flex-1 h-full max-h-[400px] bg-neutral-800 rounded-2xl overflow-hidden relative border border-white/10 shadow-lg group">
                {remoteStream ? (
                    <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 gap-3 px-6 text-center">
                        <div className="bg-gray-700/50 p-4 rounded-full">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                             </svg>
                        </div>
                        <span className="text-sm font-medium text-gray-400">
                            O outro usuário está com a câmera e microfone desligados
                        </span>
                    </div>
                )}
                <span className="absolute top-4 left-4 text-sm font-bold text-white bg-black/40 px-3 py-1 rounded-full backdrop-blur-md">
                    Remoto
                </span>
            </div>

            {/* --- Meu Vídeo --- */}
            <div className="flex-1 h-full max-h-[400px] bg-neutral-800 rounded-2xl overflow-hidden relative border border-white/10 shadow-lg">
                <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover transform scale-x-[-1]" />
                <span className="absolute top-4 right-4 text-sm font-bold text-white bg-black/40 px-3 py-1 rounded-full backdrop-blur-md">
                    Você
                </span>
                <div className="absolute bottom-4 right-4 w-1.5 h-12 bg-gray-700/50 rounded-full overflow-hidden backdrop-blur-sm">
                    <div 
                        className="w-full bg-cyan-400 absolute bottom-0 transition-all duration-100" 
                        style={{ height: `${Math.min(volumeLevel * 2.5, 100)}%` }} 
                    />
                </div>
            </div>

            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                <select
                    value={selectedAudioDevice}
                    onChange={handleDeviceChange}
                    className="bg-black/50 text-white text-xs py-1 px-2 rounded-full border border-white/20 outline-none hover:bg-black/70 transition backdrop-blur-md"
                >
                    {audioDevices.map(d => (
                        <option key={d.deviceId} value={d.deviceId}>
                             🎤 {d.label?.slice(0, 20) || 'Mic...'}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );
};

export default VideoCall;