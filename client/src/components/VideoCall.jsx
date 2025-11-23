import React, { useRef, useEffect, useState } from 'react';
import { useWebRTC } from '../useWebRTC.js';

const VideoCall = ({ targetUserId, isCaller }) => {
    // Chamamos o hook passando o ID do usuário alvo
    const { localStream, remoteStream, switchAudioInput } = useWebRTC(targetUserId, isCaller);

    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);

    // Estados para Áudio
    const [audioDevices, setAudioDevices] = useState([]);
    const [selectedAudioDevice, setSelectedAudioDevice] = useState('');
    const [volumeLevel, setVolumeLevel] = useState(0);

    // Atualiza o elemento <video> quando o stream muda
    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream]);

    useEffect(() => {
        if (remoteVideoRef.current && remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream;
        }
    }, [remoteStream]);

    // --- 1. Listar Dispositivos de Áudio ---
    useEffect(() => {
        const getDevices = async () => {
            try {
                const devices = await navigator.mediaDevices.enumerateDevices();
                const audioInputs = devices.filter(device => device.kind === 'audioinput');
                setAudioDevices(audioInputs);

                // Tenta selecionar o dispositivo padrão ou o primeiro da lista
                if (audioInputs.length > 0) {
                    // Se já tem um stream, tenta achar o ID da track atual
                    const currentTrack = localStream?.getAudioTracks()[0];
                    const currentSettings = currentTrack?.getSettings();
                    if (currentSettings?.deviceId) {
                        setSelectedAudioDevice(currentSettings.deviceId);
                    } else {
                        setSelectedAudioDevice(audioInputs[0].deviceId);
                    }
                }
            } catch (err) {
                console.error("Erro ao listar dispositivos:", err);
            }
        };

        // Chama uma vez e sempre que o stream mudar (pode ter mudado permissões)
        getDevices();
    }, [localStream]);

    // --- 2. Medidor de Volume (Visualizer) ---
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
            for (let i = 0; i < length; i++) {
                values += array[i];
            }
            const average = values / length;
            setVolumeLevel(average); // Valor médio de volume (0 a ~100-255)
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
        <div className="fixed bottom-5 right-5 bg-gray-800 p-4 rounded-lg shadow-xl border border-gray-700 z-50 flex flex-col gap-4">
            <h3 className="text-white font-bold text-lg mb-2">Chamada de Vídeo</h3>

            <div className="video-container" style={{ display: 'flex', gap: '10px' }}>
                {/* Meu Vídeo (Local) */}
                <div className="video-wrapper relative">
                    <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-40 h-32 bg-black rounded object-cover border-2 border-blue-500"
                    />
                    <span className="absolute bottom-1 left-1 text-xs text-white bg-black/50 px-1 rounded">Você</span>

                    {/* Barra de Volume */}
                    <div className="absolute bottom-1 right-1 w-1 h-8 bg-gray-600 rounded overflow-hidden">
                        <div
                            className="w-full bg-green-500 transition-all duration-100"
                            style={{ height: `${Math.min(volumeLevel * 2, 100)}%` }}
                        />
                    </div>
                </div>

                {/* Vídeo do Outro (Remoto) */}
                <div className="video-wrapper relative">
                    <video
                        ref={remoteVideoRef}
                        autoPlay
                        playsInline
                        className="w-40 h-32 bg-black rounded object-cover border-2 border-green-500"
                    />
                    <span className="absolute bottom-1 left-1 text-xs text-white bg-black/50 px-1 rounded">Remoto</span>
                </div>
            </div>

            {/* Seletor de Microfone */}
            <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-400">Microfone:</label>
                <select
                    value={selectedAudioDevice}
                    onChange={handleDeviceChange}
                    className="bg-gray-700 text-white text-xs p-1 rounded border border-gray-600 focus:border-blue-500 outline-none"
                >
                    {audioDevices.map(device => (
                        <option key={device.deviceId} value={device.deviceId}>
                            {device.label || `Microfone ${device.deviceId.slice(0, 5)}...`}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );
};

export default VideoCall;