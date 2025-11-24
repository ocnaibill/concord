import { useEffect, useRef, useState } from 'react';
import socketService from './services/socketService.js';

const configuration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' } // Servidor STUN público do Google para resolver IPs
    ] 
};

export const useWebRTC = (targetUserId, isInitiator = false) => {
    const [localStream, setLocalStream] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);
    const peerConnection = useRef(null);
    
    // Controle de reinício de conexão sem fechar o componente
    const [restartCount, setRestartCount] = useState(0);
    const isRestarting = useRef(false);

    const safeSend = (type, data) => {
        if (socketService.isConnected && targetUserId) {
            const packet = {
                command: 'signal',
                payload: {
                    targetId: targetUserId,
                    type: type,
                    data: data
                }
            };
            socketService.send(JSON.stringify(packet));
        }
    };

    useEffect(() => {
        let isMounted = true;
        let myStream = null;
        isRestarting.current = false; 

        const startConnection = async () => {
            if (!targetUserId) return;

            try {
                console.log('📷 Solicitando mídia (Sessão ' + restartCount + ')...');
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

                if (!isMounted) {
                    stream.getTracks().forEach(track => track.stop());
                    return;
                }

                console.log('✅ Mídia concedida.');
                myStream = stream;
                setLocalStream(stream);

                peerConnection.current = new RTCPeerConnection(configuration);

                stream.getTracks().forEach(track => {
                    peerConnection.current.addTrack(track, stream);
                });

                peerConnection.current.ontrack = (event) => {
                    console.log('📡 Stream remoto recebido!');
                    if (isMounted) setRemoteStream(event.streams[0]);
                };

                peerConnection.current.onicecandidate = (event) => {
                    if (event.candidate) {
                        safeSend('candidate', event.candidate);
                    }
                };

                safeSend('ready', {});

                if (isInitiator) {
                    createAndSendOffer();
                }

            } catch (err) {
                console.error("❌ Erro WebRTC/Mídia:", err);
            }
        };

        const createAndSendOffer = async () => {
            if (!peerConnection.current) return;
            console.log('🚀 Criando oferta WebRTC...');
            try {
                const offer = await peerConnection.current.createOffer();
                await peerConnection.current.setLocalDescription(offer);
                safeSend('offer', offer);
            } catch (err) { console.error(err); }
        };

        startConnection();

        // CLEANUP
        return () => {
            isMounted = false;
            
            // Só enviamos HANGUP se NÃO estivermos apenas reiniciando internamente
            if (!isRestarting.current) {
                console.log("📴 Encerrando chamada localmente (Componente desmontado)...");
                safeSend('hangup', {});
            } else {
                console.log("🔄 Reiniciando conexão local (Sem enviar hangup)...");
            }

            if (peerConnection.current) {
                peerConnection.current.close();
                peerConnection.current = null;
            }
            if (myStream) {
                myStream.getTracks().forEach(track => track.stop());
            }
            setLocalStream(null);
            setRemoteStream(null);
        };
    }, [targetUserId, isInitiator, restartCount]); // Dependência restartCount recria a conexão


    // Listener de Socket
    useEffect(() => {
        const handleSocketMessage = async (rawMessage) => {
            try {
                const packet = JSON.parse(rawMessage);
                if (packet.status !== 'signal') return;

                const body = packet.body || {}; 
                const { type, data } = body;

                if (type === 'hangup') {
                    console.log("📴 Usuário remoto desligou. Mantendo tela ativa e aguardando retorno...");
                    
                    // Em vez de fechar a UI, marcamos para reiniciar a conexão WebRTC
                    isRestarting.current = true;
                    setRestartCount(prev => prev + 1); // Isso dispara o useEffect acima novamente
                    return;
                }

                if (!peerConnection.current) return;

                if (type === 'ready') {
                    if (isInitiator) {
                        console.log('👋 O outro usuário voltou/está pronto. Enviando oferta...');
                        const offer = await peerConnection.current.createOffer();
                        await peerConnection.current.setLocalDescription(offer);
                        safeSend('offer', offer);
                    }
                }
                else if (type === 'offer') {
                    if (!isInitiator) { 
                        console.log('📩 Aceitando Oferta...');
                        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(data));
                        const answer = await peerConnection.current.createAnswer();
                        await peerConnection.current.setLocalDescription(answer);
                        safeSend('answer', answer);
                    }
                } 
                else if (type === 'answer') {
                    console.log('📩 Resposta recebida. Conectando...');
                    if (peerConnection.current.signalingState === 'have-local-offer') {
                        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(data));
                    }
                } 
                else if (type === 'candidate') {
                    try {
                        await peerConnection.current.addIceCandidate(new RTCIceCandidate(data));
                    } catch (e) { }
                }

            } catch (err) {
                console.error("Erro socket message:", err);
            }
        };

        socketService.on('data', handleSocketMessage);
        return () => { socketService.off('data', handleSocketMessage); };
    }, [targetUserId, isInitiator]); 

    const switchAudioInput = async (deviceId) => {
        try {
            if (!localStream) return;
            const audioStream = await navigator.mediaDevices.getUserMedia({
                audio: { deviceId: { exact: deviceId } },
                video: false
            });
            const newAudioTrack = audioStream.getAudioTracks()[0];
            const videoTrack = localStream.getVideoTracks()[0];
            const newStream = new MediaStream([videoTrack, newAudioTrack]);
            setLocalStream(newStream);

            if (peerConnection.current) {
                const sender = peerConnection.current.getSenders().find(s => s.track.kind === 'audio');
                if (sender) sender.replaceTrack(newAudioTrack);
            }
        } catch (e) { console.error(e); }
    };

    return { localStream, remoteStream, switchAudioInput };
};