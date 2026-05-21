// WebRTC utility for NodeCrypt voice and video chat
// NodeCrypt 语音和视频聊天的 WebRTC 工具

import { t } from './util.i18n.js';
import { $, $id, createElement, addClass, removeClass } from './util.dom.js';
import { roomsData, activeRoomIndex } from './room.js';

class WebRTCManager {
    constructor() {
        this.peerConnections = new Map(); // 存储每个用户的连接
        this.localStream = null;
        this.isCallActive = false;
        this.callType = null; // 'audio' 或 'video'
        this.iceServers = [
            { urls: 'stun:stun.cloudflare.com:3478' },
            { urls: 'stun:stun.l.google.com:19302' }
        ];
        
        this.init();
    }

    init() {
        this.setupCallUI();
        this.bindEvents();
    }    // 设置通话 UI
    setupCallUI() {
        // 创建通话控制按钮
        const newMessageWrapper = $('.new-message-wrapper');
        if (!newMessageWrapper) return;

        const callButtonsHtml = `
            <div class="call-buttons" id="call-buttons">
                <button class="call-btn audio-call-btn" id="audio-call-btn" title="${t('call.start_voice_call')}">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                    </svg>
                </button>
                <button class="call-btn video-call-btn" id="video-call-btn" title="${t('call.start_video_call')}">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polygon points="23 7 16 12 23 17 23 7"></polygon>
                        <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                    </svg>
                </button>
            </div>
        `;

        // 在发送按钮之前插入通话按钮
        const sendButton = $('.send-message-btn');
        if (sendButton) {
            sendButton.insertAdjacentHTML('beforebegin', callButtonsHtml);
        } else {
            // 如果没有发送按钮，插入到 new-message-wrapper 的末尾
            newMessageWrapper.insertAdjacentHTML('beforeend', callButtonsHtml);
        }

        // 创建通话窗口
        const callWindowHtml = `
            <div class="call-window hidden" id="call-window">
                <div class="call-header">
                    <h3 id="call-title">${t('call.connecting')}</h3>
                    <button class="call-close-btn" id="call-close-btn">×</button>
                </div>
                <div class="call-content">
                    <div class="video-container">
                        <video id="local-video" muted autoplay playsinline></video>
                        <video id="remote-video" autoplay playsinline></video>
                    </div>
                    <div class="call-controls">
                        <button class="control-btn mute-btn" id="mute-btn" title="${t('call.mute')}">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                            </svg>
                        </button>
                        <button class="control-btn video-btn" id="video-toggle-btn" title="${t('call.toggle_video')}">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polygon points="23 7 16 12 23 17 23 7"></polygon>
                                <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                            </svg>
                        </button>
                        <button class="control-btn hangup-btn" id="hangup-btn" title="${t('call.hang_up')}">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', callWindowHtml);
    }

    // 绑定事件
    bindEvents() {
        const audioCallBtn = $id('audio-call-btn');
        const videoCallBtn = $id('video-call-btn');
        const hangupBtn = $id('hangup-btn');
        const callCloseBtn = $id('call-close-btn');
        const muteBtn = $id('mute-btn');
        const videoToggleBtn = $id('video-toggle-btn');

        if (audioCallBtn) {
            audioCallBtn.addEventListener('click', () => this.startCall('audio'));
        }
        if (videoCallBtn) {
            videoCallBtn.addEventListener('click', () => this.startCall('video'));
        }
        if (hangupBtn) {
            hangupBtn.addEventListener('click', () => this.endCall());
        }
        if (callCloseBtn) {
            callCloseBtn.addEventListener('click', () => this.endCall());
        }
        if (muteBtn) {
            muteBtn.addEventListener('click', () => this.toggleMute());
        }
        if (videoToggleBtn) {
            videoToggleBtn.addEventListener('click', () => this.toggleVideo());
        }
    }    // 开始通话
    async startCall(type) {
        if (this.isCallActive) return;
        if (activeRoomIndex < 0 || !roomsData[activeRoomIndex] || !roomsData[activeRoomIndex].nodeCrypt) return;

        // 检查房间是否有其他用户
        const userList = roomsData[activeRoomIndex].userList || [];
        if (userList.length === 0) {
            alert(t('call.no_users_in_room') || 'No other users in the room to call.');
            return;
        }

        try {
            this.callType = type;
            this.isCallActive = true;

            // 获取媒体流
            const constraints = {
                audio: true,
                video: type === 'video'
            };

            this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
            
            // 显示本地视频
            const localVideo = $id('local-video');
            if (localVideo && this.localStream) {
                localVideo.srcObject = this.localStream;
                if (type === 'audio') {
                    localVideo.style.display = 'none';
                }
            }

            // 显示通话窗口
            this.showCallWindow();

            // 向房间内所有用户发起通话
            this.sendCallSignal('call-offer', {
                type: type,
                callId: Date.now().toString()
            });

        } catch (error) {
            console.error('Failed to start call:', error);
            this.endCall();
            alert(t('call.failed_to_access_media'));
        }
    }    // 处理接收到的通话信令
    async handleCallSignal(data, fromClientId) {
        const { signalType, payload } = data;

        switch (signalType) {
            case 'call-offer':
                await this.handleCallOffer(payload, fromClientId);
                break;
            case 'call-answer':
                await this.handleCallAnswer(payload, fromClientId);
                break;
            case 'webrtc-offer':
                await this.handleWebRTCOffer(payload, fromClientId);
                break;
            case 'webrtc-answer':
                await this.handleWebRTCAnswer(payload, fromClientId);
                break;
            case 'ice-candidate':
                await this.handleIceCandidate(payload, fromClientId);
                break;
            case 'call-end':
                this.handleCallEnd(fromClientId);
                break;
        }
    }

    // 处理通话邀请
    async handleCallOffer(payload, fromClientId) {
        if (this.isCallActive) {
            // 如果已经在通话中，拒绝新的通话
            this.sendCallSignal('call-end', { reason: 'busy' }, fromClientId);
            return;
        }

        const accept = confirm(t('call.incoming_call_from') + ' ' + this.getUserName(fromClientId));
        if (!accept) {
            this.sendCallSignal('call-end', { reason: 'declined' }, fromClientId);
            return;
        }

        try {
            this.callType = payload.type;
            this.isCallActive = true;

            // 获取媒体流
            const constraints = {
                audio: true,
                video: payload.type === 'video'
            };

            this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
            
            // 创建 RTCPeerConnection
            const pc = await this.createPeerConnection(fromClientId);
            
            // 添加本地流
            this.localStream.getTracks().forEach(track => {
                pc.addTrack(track, this.localStream);
            });

            // 显示通话窗口
            this.showCallWindow();

            // 发送应答
            this.sendCallSignal('call-answer', {
                accepted: true,
                type: payload.type
            }, fromClientId);

        } catch (error) {
            console.error('Failed to handle call offer:', error);
            this.sendCallSignal('call-end', { reason: 'error' }, fromClientId);
        }
    }    // 处理通话应答
    async handleCallAnswer(payload, fromClientId) {
        if (!payload.accepted) {
            this.endCall();
            return;
        }

        try {
            // 创建 RTCPeerConnection
            const pc = await this.createPeerConnection(fromClientId);
            
            // 添加本地流
            if (this.localStream) {
                this.localStream.getTracks().forEach(track => {
                    pc.addTrack(track, this.localStream);
                });
            }

            // 创建并发送 Offer
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            this.sendCallSignal('webrtc-offer', {
                sdp: offer
            }, fromClientId);

        } catch (error) {
            console.error('Failed to handle call answer:', error);
            this.endCall();
        }
    }

    // 处理 WebRTC Offer
    async handleWebRTCOffer(payload, fromClientId) {
        try {
            const pc = this.peerConnections.get(fromClientId);
            if (!pc) return;

            await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
            
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            this.sendCallSignal('webrtc-answer', {
                sdp: answer
            }, fromClientId);

        } catch (error) {
            console.error('Failed to handle WebRTC offer:', error);
        }
    }

    // 处理 WebRTC Answer
    async handleWebRTCAnswer(payload, fromClientId) {
        try {
            const pc = this.peerConnections.get(fromClientId);
            if (!pc) return;

            await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));

        } catch (error) {
            console.error('Failed to handle WebRTC answer:', error);
        }
    }

    // 处理 ICE 候选
    async handleIceCandidate(payload, fromClientId) {
        const pc = this.peerConnections.get(fromClientId);
        if (pc && payload.candidate) {
            try {
                await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
            } catch (error) {
                console.error('Failed to add ICE candidate:', error);
            }
        }
    }

    // 处理通话结束
    handleCallEnd(fromClientId) {
        const pc = this.peerConnections.get(fromClientId);
        if (pc) {
            pc.close();
            this.peerConnections.delete(fromClientId);
        }

        // 如果所有连接都关闭了，结束通话
        if (this.peerConnections.size === 0) {
            this.endCall();
        }
    }

    // 创建 RTCPeerConnection
    async createPeerConnection(clientId) {
        const pc = new RTCPeerConnection({
            iceServers: this.iceServers
        });

        // 处理 ICE 候选
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                this.sendCallSignal('ice-candidate', {
                    candidate: event.candidate
                }, clientId);
            }
        };

        // 处理远程流
        pc.ontrack = (event) => {
            const remoteVideo = $id('remote-video');
            if (remoteVideo && event.streams[0]) {
                remoteVideo.srcObject = event.streams[0];
                if (this.callType === 'audio') {
                    remoteVideo.style.display = 'none';
                }
            }
        };

        this.peerConnections.set(clientId, pc);
        return pc;
    }

    // 发送通话信令
    sendCallSignal(signalType, payload, targetClientId = null) {
        if (activeRoomIndex < 0 || !roomsData[activeRoomIndex] || !roomsData[activeRoomIndex].nodeCrypt) {
            return;
        }

        const signalData = {
            signalType,
            payload
        };

        if (targetClientId) {
            // 发送给特定用户
            roomsData[activeRoomIndex].nodeCrypt.sendMessage(
                roomsData[activeRoomIndex].nodeCrypt.encryptServerMessage({
                    a: 'c',
                    p: roomsData[activeRoomIndex].nodeCrypt.encryptClientMessage({
                        a: 'm',
                        t: 'webrtc-signal',
                        d: signalData
                    }, roomsData[activeRoomIndex].nodeCrypt.channel[targetClientId].shared),
                    c: targetClientId
                }, roomsData[activeRoomIndex].nodeCrypt.serverShared)
            );
        } else {
            // 广播给所有用户
            roomsData[activeRoomIndex].nodeCrypt.sendChannelMessage('webrtc-signal', signalData);
        }
    }

    // 显示通话窗口
    showCallWindow() {
        const callWindow = $id('call-window');
        const callTitle = $id('call-title');
        
        if (callWindow) {
            removeClass(callWindow, 'hidden');
            
            if (callTitle) {
                callTitle.textContent = this.callType === 'video' ? 
                    t('call.video_call') : t('call.voice_call');
            }

            // 根据通话类型调整UI
            const localVideo = $id('local-video');
            const remoteVideo = $id('remote-video');
            const videoToggleBtn = $id('video-toggle-btn');

            if (this.callType === 'audio') {
                if (localVideo) localVideo.style.display = 'none';
                if (remoteVideo) remoteVideo.style.display = 'none';
                if (videoToggleBtn) videoToggleBtn.style.display = 'none';
            } else {
                if (localVideo) localVideo.style.display = 'block';
                if (remoteVideo) remoteVideo.style.display = 'block';
                if (videoToggleBtn) videoToggleBtn.style.display = 'block';
            }
        }
    }

    // 结束通话
    endCall() {
        this.isCallActive = false;
        this.callType = null;

        // 关闭所有 RTCPeerConnection
        this.peerConnections.forEach(pc => pc.close());
        this.peerConnections.clear();

        // 停止本地媒体流
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }

        // 隐藏通话窗口
        const callWindow = $id('call-window');
        if (callWindow) {
            addClass(callWindow, 'hidden');
        }

        // 清空视频元素
        const localVideo = $id('local-video');
        const remoteVideo = $id('remote-video');
        if (localVideo) localVideo.srcObject = null;
        if (remoteVideo) remoteVideo.srcObject = null;

        // 发送通话结束信号
        this.sendCallSignal('call-end', { reason: 'ended' });
    }

    // 切换静音
    toggleMute() {
        if (!this.localStream) return;

        const audioTracks = this.localStream.getAudioTracks();
        const muteBtn = $id('mute-btn');
        
        audioTracks.forEach(track => {
            track.enabled = !track.enabled;
        });

        if (muteBtn) {
            if (audioTracks[0] && !audioTracks[0].enabled) {
                addClass(muteBtn, 'muted');
                muteBtn.title = t('call.unmute');
            } else {
                removeClass(muteBtn, 'muted');
                muteBtn.title = t('call.mute');
            }
        }
    }

    // 切换视频
    toggleVideo() {
        if (!this.localStream || this.callType === 'audio') return;

        const videoTracks = this.localStream.getVideoTracks();
        const videoBtn = $id('video-toggle-btn');
        const localVideo = $id('local-video');
        
        videoTracks.forEach(track => {
            track.enabled = !track.enabled;
        });

        if (videoBtn && localVideo) {
            if (videoTracks[0] && !videoTracks[0].enabled) {
                addClass(videoBtn, 'video-off');
                localVideo.style.display = 'none';
                videoBtn.title = t('call.turn_on_video');
            } else {
                removeClass(videoBtn, 'video-off');
                localVideo.style.display = 'block';
                videoBtn.title = t('call.turn_off_video');
            }
        }
    }

    // 获取用户名
    getUserName(clientId) {
        if (activeRoomIndex < 0 || !roomsData[activeRoomIndex]) return clientId;
        
        const nodeCrypt = roomsData[activeRoomIndex].nodeCrypt;
        if (nodeCrypt && nodeCrypt.channel[clientId]) {
            return nodeCrypt.channel[clientId].username || clientId;
        }
        return clientId;
    }
}

// 创建全局 WebRTC 管理器实例
export const webRTCManager = new WebRTCManager();
