import { useEffect, useRef, useState } from 'react';
// Importe sua instância de socket já existente
import socketService from './services/socketService.js';

const configuration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' } // Servidor STUN público do Google para resolver IPs
    ]
};

export const useWebRTC = (remoteSocketId, isInitiator = false) => {
    const [localStream, setLocalStream] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);
    const peerConnection = useRef(null);

    // Helper para enviar mensagens apenas se o socket estiver aberto
    const safeSend = (msg) => {
        if (socketService.isConnected) {
            const packet = {
                command: 'signal',
                payload: {
                    targetId: remoteUserId,
                    signalData: signalData 
                }
            };
            socketService.send(JSON.stringify(packet));
        } else {
            console.warn('WebSocket não está aberto. Mensagem ignorada:', msg);
        }
    };

    // 1. Inicializar captura de mídia e conexão
    useEffect(() => {
        let timeoutId;
        let myStream = null;
        let isCanceled = false;

        const startConnection = async () => {
            try {
                console.log('Solicitando acesso à câmera/microfone...');
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

                // Se o componente desmontou enquanto aguardava a câmera, limpa tudo e aborta
                if (isCanceled) {
                    console.log('Componente desmontado durante solicitação de mídia. Fechando stream.');
                    stream.getTracks().forEach(track => track.stop());
                    return;
                }

                console.log('Acesso à mídia concedido!', stream);
                myStream = stream; // Guarda referência local para limpeza
                setLocalStream(stream);

                // Cria a conexão Peer-to-Peer
                peerConnection.current = new RTCPeerConnection(configuration);

                // Adiciona as faixas de vídeo/áudio do stream local à conexão
                stream.getTracks().forEach(track => {
                    if (peerConnection.current) {
                        peerConnection.current.addTrack(track, stream);
                    }
                });

                // Evento: Quando o outro par adiciona o vídeo dele, recebemos aqui
                peerConnection.current.ontrack = (event) => {
                    console.log('Stream remoto recebido!');
                    setRemoteStream(event.streams[0]);
                };

                // Evento: Quando encontramos uma rota de rede (ICE Candidate), enviamos via Socket
                peerConnection.current.onicecandidate = (event) => {
                    if (event.candidate) {
                        safeSend({
                            type: 'new-ice-candidate',
                            candidate: event.candidate,
                            targetSocketId: remoteSocketId
                        });
                    }
                };

                // Se este cliente for quem iniciou a chamada, cria a Oferta
                if (isInitiator) {
                    // Pequeno delay para garantir estabilidade
                    timeoutId = setTimeout(async () => {
                        if (!peerConnection.current || isCanceled) return;
                        try {
                            console.log('Criando oferta WebRTC...');
                            const offer = await peerConnection.current.createOffer();
                            await peerConnection.current.setLocalDescription(offer);
                            safeSend({
                                type: 'video-offer',
                                sdp: offer,
                                targetSocketId: remoteSocketId
                            });
                        } catch (err) {
                            console.error('Erro ao criar oferta:', err);
                        }
                    }, 1000);
                }

            } catch (err) {
                if (!isCanceled) {
                    console.error("Erro ao acessar mídia:", err);
                }
            }
        };

        startConnection();

        // Limpeza ao desmontar
        return () => {
            isCanceled = true;
            if (timeoutId) clearTimeout(timeoutId);

            if (peerConnection.current) {
                console.log('Fechando conexão PeerConnection');
                peerConnection.current.close();
                peerConnection.current = null;
            }

            // Parar tracks locais (usando a variável local myStream)
            if (myStream) {
                console.log('Parando tracks locais');
                myStream.getTracks().forEach(track => track.stop());
            }
        };
    }, [remoteSocketId, isInitiator]);

    // 2. Escutar eventos do Socket (Sinalização)
    useEffect(() => {
        const handleSocketMessage = async (dataRaw) => {
            try {
                const packet = JSON.parse(dataRaw);

                if (packet.status !== 'signal') return;
                const data = packet.signalData

                if (!peerConnection.current) return;

                // Recebeu uma Oferta de vídeo (Lado B)
                if (data.type === 'video-offer') {
                    console.log('Recebida oferta de vídeo');
                    await peerConnection.current.setRemoteDescription(new RTCSessionDescription(data.offer));
                    const answer = await peerConnection.current.createAnswer();
                    await peerConnection.current.setLocalDescription(answer);

                    safeSend({
                        type: 'video-answer',
                        sdp: answer,
                        targetSocketId: data.sourceSocketId
                    });
                }

                // Recebeu uma Resposta da oferta (Lado A)
                if (data.type === 'video-answer') {
                    console.log('Recebida resposta de vídeo');
                    await peerConnection.current.setRemoteDescription(new RTCSessionDescription(data.answer));
                }

                // Recebeu candidatos de rede para conexão (Ambos os lados)
                if (data.type === 'new-ice-candidate') {
                    try {
                        await peerConnection.current.addIceCandidate(new RTCIceCandidate(data.candidate));
                    } catch (e) {
                        console.error('Erro ao adicionar ICE candidate', e);
                    }
                }
            } catch (err) {
                console.error("Erro ao processar mensagem do socket:", err);
            }
        };

        // Adicione o listener no seu objeto socket real
        socketService.on('data', handleSocketMessage);

        return () => {
            socketService.off('data', handleSocketMessage);
        };
    }, []);

    // 3. Função para trocar o dispositivo de áudio (Microfone)
    const switchAudioInput = async (deviceId) => {
        try {
            console.log('Trocando microfone para:', deviceId);
            // 1. Pede apenas o áudio do novo dispositivo
            const audioStream = await navigator.mediaDevices.getUserMedia({
                audio: { deviceId: { exact: deviceId } },
                video: false
            });
            const newAudioTrack = audioStream.getAudioTracks()[0];

            // 2. Atualiza o stream local (mantendo o vídeo atual)
            if (localStream) {
                const oldAudioTrack = localStream.getAudioTracks()[0];
                if (oldAudioTrack) {
                    oldAudioTrack.stop(); // Para o mic anterior
                }

                const videoTrack = localStream.getVideoTracks()[0];
                // Cria um novo MediaStream combinando o vídeo antigo com o novo áudio
                const newStream = new MediaStream([videoTrack, newAudioTrack]);
                setLocalStream(newStream);

                // 3. Atualiza a conexão PeerConnection (se existir)
                if (peerConnection.current) {
                    const sender = peerConnection.current.getSenders().find(s => s.track && s.track.kind === 'audio');
                    if (sender) {
                        sender.replaceTrack(newAudioTrack);
                    } else {
                        // Se não tinha sender de áudio, adiciona (caso raro se iniciou mudo)
                        peerConnection.current.addTrack(newAudioTrack, newStream);
                    }
                }
            }
        } catch (err) {
            console.error("Erro ao trocar dispositivo de áudio:", err);
        }
    };

    return { localStream, remoteStream, switchAudioInput };
};