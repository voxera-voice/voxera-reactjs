import { useState, useEffect, useCallback, useRef } from "react";
import {
  MayaVoiceClient,
  MayaVoiceConfig,
  ConnectionStatus,
  ConversationStatus,
  SpeakingStatus,
  ConversationMessage,
  MayaVoiceError,
  WebRTCStats,
  RoomMode,
  TranscriptionEntry,
  WaitingRoomEntry,
  MeetingBookmark,
  MeetingSummary,
  MeetingMinutes,
} from "@voxera/sdk-core";
import type { RoomParticipant as CoreRoomParticipant } from "@voxera/sdk-core";

/**
 * Configuration for the useOmniumVoiceChat hook
 */
export interface UseOmniumVoiceChatConfig
  extends Omit<
    MayaVoiceConfig,
    | "onConnectionStatusChange"
    | "onConversationStatusChange"
    | "onSpeakingStatusChange"
    | "onMessage"
    | "onTranscript"
    | "onError"
    | "onAudioLevel"
    | "onAIAudioLevel"
  > {
  /** Auto-connect on mount */
  autoConnect?: boolean;
  /** Auto-start conversation after connecting */
  autoStart?: boolean;
}

/** Participant in a multi-room session */
export interface RoomParticipant {
  clientId: string;
  displayName: string;
}

/**
 * Return type for the useOmniumVoiceChat hook
 */
export interface UseOmniumVoiceChatReturn {
  // Status
  connectionStatus: ConnectionStatus;
  conversationStatus: ConversationStatus;
  speakingStatus: SpeakingStatus;

  // Data
  conversationMessages: ConversationMessage[];
  currentTranscript: string;
  audioLevel: number;
  aiAudioLevel: number;
  error: MayaVoiceError | null;
  localVideoStream: MediaStream | null;
  remoteVideoStream: MediaStream | null;
  audioPlaybackWarning: string | null;

  // Computed
  isConnected: boolean;
  isConnecting: boolean;
  isConversationActive: boolean;
  isSpeaking: boolean;
  isUserSpeaking: boolean;
  isAISpeaking: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;

  // Actions
  connect: () => Promise<void>;
  connectSocket: () => Promise<void>;
  setupRoomWebRTC: () => Promise<void>;
  disconnect: () => Promise<void>;
  startConversation: () => Promise<void>;
  endConversation: () => Promise<void>;
  sendMessage: (content: string) => void;
  setMuted: (muted: boolean) => void;
  enableVideo: () => Promise<void>;
  disableVideo: () => Promise<void>;
  toggleVideo: () => Promise<boolean>;
  startScreenShare: () => Promise<void>;
  stopScreenShare: () => Promise<void>;
  toggleScreenShare: () => Promise<boolean>;
  updateConfig: (config: Partial<MayaVoiceConfig>) => void;
  getStats: () => Promise<WebRTCStats | null>;
  clearError: () => void;
  // Screen share stream
  localScreenStream: MediaStream | null;

  // Multi-room
  roomCode: string | null;
  roomSessionId: string | null;
  roomParticipants: RoomParticipant[];
  isInRoom: boolean;
  createRoom: (displayName: string, roomName?: string, roomMode?: RoomMode) => Promise<{ roomCode: string; sessionId: string; roomMode: RoomMode } | null>;
  joinRoom: (roomCode: string, displayName: string) => Promise<{ sessionId: string; participants: RoomParticipant[]; roomMode?: RoomMode; isHost?: boolean } | null>;
  leaveRoom: () => Promise<void>;
  listRoomParticipants: () => Promise<RoomParticipant[]>;

  // Meeting state
  roomMode: RoomMode | null;
  isHost: boolean;
  isTranscriptionEnabled: boolean;
  isAskAiActive: boolean;
  isRoomLocked: boolean;
  isWaitingRoomEnabled: boolean;
  isInWaitingRoom: boolean;
  transcriptions: TranscriptionEntry[];
  waitingRoom: WaitingRoomEntry[];

  // Host controls
  muteParticipant: (targetClientId: string) => Promise<void>;
  muteAll: () => Promise<void>;
  unmuteAll: () => Promise<void>;
  removeParticipant: (targetClientId: string) => Promise<void>;
  lockRoom: (locked: boolean) => Promise<void>;
  endMeeting: () => Promise<void>;
  transferHost: (targetClientId: string) => Promise<void>;

  // Meeting features
  toggleTranscription: (enabled: boolean) => Promise<void>;
  askAi: () => Promise<void>;
  cancelAskAi: () => Promise<void>;
  enableWaitingRoom: (enabled: boolean) => Promise<void>;
  admitParticipant: (targetClientId: string) => Promise<void>;
  denyParticipant: (targetClientId: string) => Promise<void>;
  admitAll: () => Promise<void>;

  // Phase 2: AI Differentiators
  bookmarks: MeetingBookmark[];
  summaries: MeetingSummary[];
  currentMinutes: MeetingMinutes | null;
  isSummaryGenerating: boolean;
  isMinutesGenerating: boolean;
  generateSummary: () => Promise<void>;
  generateMinutes: () => Promise<void>;
  addBookmark: (label: string, isActionItem?: boolean) => Promise<void>;
  removeBookmark: (bookmarkId: string) => Promise<void>;
  getTranscript: () => Promise<TranscriptionEntry[]>;

  // Phase 3: Text-only AI (normal-meeting mode)
  askAiTextResponse: string | null;
  isAskAiTextProcessing: boolean;
  askAiText: (prompt?: string) => Promise<void>;
}

/**
 * React hook for Maya Voice chat integration
 *
 * @example
 * ```tsx
 * function VoiceChat() {
 *   const {
 *     connect,
 *     disconnect,
 *     startConversation,
 *     endConversation,
 *     connectionStatus,
 *     conversationStatus,
 *     conversationMessages,
 *     isUserSpeaking,
 *     isAISpeaking,
 *   } = useOmniumVoiceChat({
 *     appKey: 'your-api-key',
 *     serverUrl: 'wss://media.voxera-voice.com',
 *     chatConfig: {
 *       systemPrompt: 'You are a helpful assistant.',
 *     },
 *   });
 *
 *   return (
 *     <div>
 *       <button onClick={connect}>Connect</button>
 *       <button onClick={startConversation}>Start</button>
 *       {conversationMessages.map(msg => (
 *         <p key={msg.id}>{msg.role}: {msg.content}</p>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useOmniumVoiceChat(
  config: UseOmniumVoiceChatConfig
): UseOmniumVoiceChatReturn {
  // Client ref
  const clientRef = useRef<MayaVoiceClient | null>(null);

  // State
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("idle");
  const [conversationStatus, setConversationStatus] =
    useState<ConversationStatus>("idle");
  const [speakingStatus, setSpeakingStatus] = useState<SpeakingStatus>("none");
  const [conversationMessages, setConversationMessages] = useState<
    ConversationMessage[]
  >([]);
  const [currentTranscript, setCurrentTranscript] = useState<string>("");
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [aiAudioLevel, setAIAudioLevel] = useState<number>(0);
  const [error, setError] = useState<MayaVoiceError | null>(null);
  const [localVideoStream, setLocalVideoStream] = useState<MediaStream | null>(null);
  const [remoteVideoStream, setRemoteVideoStream] = useState<MediaStream | null>(null);
  const [localScreenStream, setLocalScreenStream] = useState<MediaStream | null>(null);
  const [audioPlaybackWarning, setAudioPlaybackWarning] = useState<string | null>(null);

  // Multi-room state
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [roomSessionId, setRoomSessionId] = useState<string | null>(null);
  const [roomParticipants, setRoomParticipants] = useState<RoomParticipant[]>([]);

  // Meeting state
  const [roomMode, setRoomMode] = useState<RoomMode | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [isTranscriptionEnabled, setIsTranscriptionEnabled] = useState(false);
  const [isAskAiActive, setIsAskAiActive] = useState(false);
  const [isRoomLocked, setIsRoomLocked] = useState(false);
  const [isWaitingRoomEnabled, setIsWaitingRoomEnabled] = useState(false);
  const [isInWaitingRoom, setIsInWaitingRoom] = useState(false);
  const [transcriptions, setTranscriptions] = useState<TranscriptionEntry[]>([]);
  const [waitingRoom, setWaitingRoom] = useState<WaitingRoomEntry[]>([]);

  // Phase 2: AI Differentiators state
  const [bookmarks, setBookmarks] = useState<MeetingBookmark[]>([]);
  const [summaries, setSummaries] = useState<MeetingSummary[]>([]);
  const [currentMinutes, setCurrentMinutes] = useState<MeetingMinutes | null>(null);
  const [isSummaryGenerating, setIsSummaryGenerating] = useState(false);
  const [isMinutesGenerating, setIsMinutesGenerating] = useState(false);

  // Phase 3: Text-only AI state
  const [askAiTextResponse, setAskAiTextResponse] = useState<string | null>(null);
  const [isAskAiTextProcessing, setIsAskAiTextProcessing] = useState(false);

  // Initialize client
  useEffect(() => {
    const client = new MayaVoiceClient({
      ...config,
      onConnectionStatusChange: setConnectionStatus,
      onConversationStatusChange: setConversationStatus,
      onSpeakingStatusChange: setSpeakingStatus,
      onMessage: (message) => {
        setConversationMessages((prev) => [...prev, message]);
      },
      onTranscript: (text, isFinal) => {
        if (isFinal) {
          setCurrentTranscript("");
        } else {
          setCurrentTranscript(text);
        }
      },
      onError: setError,
      onAudioLevel: setAudioLevel,
      onAIAudioLevel: setAIAudioLevel,
      onLocalVideoStream: setLocalVideoStream,
      onRemoteVideoStream: setRemoteVideoStream,
      onLocalScreenStream: setLocalScreenStream,
    });

    // Listen for autoplay warnings
    client.on('warning', (warning: any) => {
      if (warning.type === 'autoplay-blocked') {
        setAudioPlaybackWarning(warning.message);
      }
    });

    // Listen for multi-room events
    const socket = client.getSocket();
    const setupRoomListeners = () => {
      const sock = client.getSocket();
      if (!sock) return;

      // Remove old listeners to prevent duplication on reconnect
      const roomEvents = [
        'participant-joined', 'participant-left', 'participant-removed', 'participants-updated',
        'you-were-muted', 'you-were-removed', 'host-changed', 'meeting-ended', 'room-locked-changed',
        'transcription-toggled', 'live-transcription',
        'ask-ai-started', 'ask-ai-cancelled',
        'waiting-room', 'admitted', 'denied', 'waiting-room-updated', 'waiting-room-toggled',
        'summary-generating', 'summary-generated', 'minutes-generating', 'minutes-generated',
        'bookmark-added', 'bookmark-removed',
        'ask-ai-text-started', 'ask-ai-text-response', 'ask-ai-text-error',
      ];
      roomEvents.forEach(evt => sock.off(evt));

      // Set up meeting listeners on the client
      client.setupMeetingListeners();

      // Participant events
      sock.on('participant-joined', (data: any) => {
        if (data.participants) setRoomParticipants(data.participants);
      });
      sock.on('participant-left', (data: any) => {
        if (data.participants) setRoomParticipants(data.participants);
      });
      sock.on('participant-removed', (data: any) => {
        if (data.participants) setRoomParticipants(data.participants);
      });
      sock.on('participants-updated', (data: any) => {
        if (data.participants) setRoomParticipants(data.participants);
      });

      // Host control events
      sock.on('you-were-muted', () => {
        // UI can react to this - e.g., show toast
      });
      sock.on('you-were-removed', () => {
        setRoomCode(null);
        setRoomSessionId(null);
        setRoomParticipants([]);
        setRoomMode(null);
        setIsHost(false);
      });
      sock.on('host-changed', (data: any) => {
        setIsHost(data.newHostClientId === sock.id);
      });
      sock.on('meeting-ended', () => {
        setRoomCode(null);
        setRoomSessionId(null);
        setRoomParticipants([]);
        setRoomMode(null);
        setIsHost(false);
        setIsAskAiActive(false);
        setTranscriptions([]);
      });
      sock.on('room-locked-changed', (data: any) => {
        setIsRoomLocked(data.locked);
      });

      // Transcription events
      sock.on('transcription-toggled', (data: any) => {
        setIsTranscriptionEnabled(data.enabled);
      });
      sock.on('live-transcription', (entry: TranscriptionEntry) => {
        setTranscriptions(prev => [...prev, entry]);
      });

      // Ask AI events
      sock.on('ask-ai-started', () => {
        setIsAskAiActive(true);
      });
      sock.on('ask-ai-cancelled', () => {
        setIsAskAiActive(false);
      });

      // Waiting room events
      sock.on('waiting-room', () => {
        setIsInWaitingRoom(true);
      });
      sock.on('admitted', (data: any) => {
        setIsInWaitingRoom(false);
        if (data.roomMode) setRoomMode(data.roomMode);
      });
      sock.on('denied', () => {
        setIsInWaitingRoom(false);
        setRoomCode(null);
        setRoomSessionId(null);
      });
      sock.on('waiting-room-updated', (data: any) => {
        setWaitingRoom(data.waitingRoom || []);
      });
      sock.on('waiting-room-toggled', (data: any) => {
        setIsWaitingRoomEnabled(data.enabled);
      });

      // Phase 2: AI Differentiator events
      sock.on('summary-generating', () => {
        setIsSummaryGenerating(true);
      });
      sock.on('summary-generated', (summary: MeetingSummary) => {
        setIsSummaryGenerating(false);
        setSummaries((prev) => [...prev, summary]);
      });
      sock.on('minutes-generating', () => {
        setIsMinutesGenerating(true);
      });
      sock.on('minutes-generated', (minutes: MeetingMinutes) => {
        setIsMinutesGenerating(false);
        setCurrentMinutes(minutes);
      });
      sock.on('bookmark-added', (bookmark: MeetingBookmark) => {
        setBookmarks((prev) => [...prev, bookmark]);
      });
      sock.on('bookmark-removed', (data: { bookmarkId: string }) => {
        setBookmarks((prev) => prev.filter((b) => b.id !== data.bookmarkId));
      });

      // Phase 3: Text-only AI events
      sock.on('ask-ai-text-started', () => {
        setIsAskAiTextProcessing(true);
        setAskAiTextResponse(null);
      });
      sock.on('ask-ai-text-response', (data: { text: string; requestedBy: string; requesterId: string }) => {
        setIsAskAiTextProcessing(false);
        setAskAiTextResponse(data.text);
      });
      sock.on('ask-ai-text-error', () => {
        setIsAskAiTextProcessing(false);
      });
    };
    // Socket may not exist yet — set up listeners after connect
    if (socket) setupRoomListeners();
    client.on('connection:status', (status: any) => {
      if (status === 'connected') setupRoomListeners();
    });

    clientRef.current = client;

    // Auto-connect if specified
    if (config.autoConnect) {
      client
        .connect()
        .then(() => {
          // Auto-start conversation if specified
          if (config.autoStart) {
            client.startConversation();
          }
        })
        .catch(() => {
          // Error handled by onError callback
        });
    }

    // Cleanup on unmount
    return () => {
      client.disconnect();
    };
  }, []); // Only run on mount

  // Update config when it changes
  useEffect(() => {
    if (clientRef.current) {
      clientRef.current.updateConfig(config);
    }
  }, [config.chatConfig, config.voiceConfig]);

  // Actions
  const connect = useCallback(async () => {
    if (clientRef.current) {
      await clientRef.current.connect();
    }
  }, []);

  const connectSocket = useCallback(async () => {
    if (clientRef.current) {
      await clientRef.current.connectSocket();
    }
  }, []);

  const setupRoomWebRTC = useCallback(async () => {
    if (clientRef.current) {
      await clientRef.current.setupRoomWebRTC();
    }
  }, []);

  const disconnect = useCallback(async () => {
    if (clientRef.current) {
      await clientRef.current.disconnect();
      setConversationMessages([]);
      setCurrentTranscript("");
      setRoomCode(null);
      setRoomSessionId(null);
      setRoomParticipants([]);
      setRoomMode(null);
      setIsHost(false);
      setIsTranscriptionEnabled(false);
      setIsAskAiActive(false);
      setIsRoomLocked(false);
      setIsWaitingRoomEnabled(false);
      setIsInWaitingRoom(false);
      setTranscriptions([]);
      setWaitingRoom([]);
      setBookmarks([]);
      setSummaries([]);
      setCurrentMinutes(null);
      setAskAiTextResponse(null);
      setIsAskAiTextProcessing(false);
    }
  }, []);

  const startConversation = useCallback(async () => {
    if (clientRef.current) {
      await clientRef.current.startConversation();
    }
  }, []);

  const endConversation = useCallback(async () => {
    if (clientRef.current) {
      await clientRef.current.endConversation();
    }
  }, []);

  const sendMessage = useCallback((content: string) => {
    if (clientRef.current) {
      clientRef.current.sendMessage(content);
    }
  }, []);

  const setMuted = useCallback((muted: boolean) => {
    if (clientRef.current) {
      clientRef.current.setMuted(muted);
    }
  }, []);

  const updateConfig = useCallback((newConfig: Partial<MayaVoiceConfig>) => {
    if (clientRef.current) {
      clientRef.current.updateConfig(newConfig);
    }
  }, []);

  const getStats = useCallback(async () => {
    if (clientRef.current) {
      return clientRef.current.getStats();
    }
    return null;
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Computed values
  const isConnected = connectionStatus === "connected";
  const isConnecting =
    connectionStatus === "connecting" || connectionStatus === "reconnecting";
  const isConversationActive = conversationStatus === "active";
  const isSpeaking = speakingStatus !== "none";
  const isUserSpeaking = speakingStatus === "user";
  const isAISpeaking = speakingStatus === "ai";
  const isVideoEnabled = localVideoStream !== null;
  const isScreenSharing = localScreenStream !== null;

  // Video control methods
  const enableVideo = useCallback(async () => {
    if (!clientRef.current) return;
    await clientRef.current.enableVideo();
  }, []);

  const disableVideo = useCallback(async () => {
    if (!clientRef.current) return;
    await clientRef.current.disableVideo();
  }, []);

  const toggleVideo = useCallback(async () => {
    if (!clientRef.current) return false;
    try {
      return await clientRef.current.toggleVideo();
    } catch (error: any) {
      console.error('[Maya React] Video toggle error:', error);
      setError(error);
      return false;
    }
  }, []);

  const startScreenShare = useCallback(async () => {
    if (!clientRef.current) return;
    try {
      await clientRef.current.startScreenShare();
    } catch (error: any) {
      console.error('[Maya React] Screen share start error:', error);
      setError(error);
    }
  }, []);

  const stopScreenShare = useCallback(async () => {
    if (!clientRef.current) return;
    await clientRef.current.stopScreenShare();
  }, []);

  const toggleScreenShare = useCallback(async () => {
    if (!clientRef.current) return false;
    try {
      return await clientRef.current.toggleScreenShare();
    } catch (error: any) {
      console.error('[Maya React] Screen share toggle error:', error);
      setError(error);
      return false;
    }
  }, []);

  // ── Multi-room actions ──

  const createRoom = useCallback(async (displayName: string, roomName?: string, roomModeParam?: RoomMode) => {
    const socket = clientRef.current?.getSocket();
    if (!socket) return null;
    try {
      const result: any = await socket.emitWithAck('create-room', {
        clientId: socket.id,
        displayName,
        name: roomName,
        appKey: config.appKey,
        chatConfig: config.chatConfig,
        roomMode: roomModeParam || 'ai-meeting',
      });
      if (result?.error) {
        console.error('[Maya React] create-room error:', result.error);
        return null;
      }
      const mode: RoomMode = result.roomMode || roomModeParam || 'ai-meeting';
      setRoomCode(result.roomCode);
      setRoomSessionId(result.sessionId);
      setRoomParticipants([{ clientId: socket.id!, displayName }]);
      setRoomMode(mode);
      setIsHost(true);
      setIsTranscriptionEnabled(mode === 'ai-meeting'); // AI meetings have transcription on by default

      // Store room mode in client
      clientRef.current?.setRoomInfo(mode, true);

      // Now set up mic + WebRTC against the newly created room session
      await clientRef.current?.setupRoomWebRTC();

      return { roomCode: result.roomCode as string, sessionId: result.sessionId as string, roomMode: mode };
    } catch (err) {
      console.error('[Maya React] create-room error:', err);
      return null;
    }
  }, [config.appKey, config.chatConfig]);

  const joinRoom = useCallback(async (code: string, displayName: string) => {
    const socket = clientRef.current?.getSocket();
    if (!socket) return null;
    try {
      const result: any = await socket.emitWithAck('join-room', {
        clientId: socket.id,
        roomCode: code,
        displayName,
      });
      if (result?.error) {
        console.error('[Maya React] join-room error:', result.error);
        return null;
      }

      // Handle waiting room status
      if (result.status === 'waiting') {
        setRoomSessionId(result.sessionId);
        setRoomCode(code.toUpperCase());
        setIsInWaitingRoom(true);
        return { sessionId: result.sessionId, participants: [], isInWaitingRoom: true } as any;
      }

      const mode: RoomMode = result.roomMode || 'ai-meeting';
      const hostFlag = result.isHost || false;
      setRoomCode(code.toUpperCase());
      setRoomSessionId(result.sessionId);
      setRoomParticipants(result.participants || []);
      setRoomMode(mode);
      setIsHost(hostFlag);

      clientRef.current?.setRoomInfo(mode, hostFlag);

      // Now set up mic + WebRTC against the joined room session
      await clientRef.current?.setupRoomWebRTC();

      return { sessionId: result.sessionId as string, participants: result.participants || [], roomMode: mode, isHost: hostFlag };
    } catch (err) {
      console.error('[Maya React] join-room error:', err);
      return null;
    }
  }, []);

  const leaveRoom = useCallback(async () => {
    const socket = clientRef.current?.getSocket();
    if (!socket || !roomCode) return;
    try {
      await socket.emitWithAck('leave-room', { roomCode });
    } catch (err) {
      console.error('[Maya React] leave-room error:', err);
    }
    setRoomCode(null);
    setRoomSessionId(null);
    setRoomParticipants([]);
  }, [roomCode]);

  const listRoomParticipants = useCallback(async () => {
    const socket = clientRef.current?.getSocket();
    if (!socket || !roomCode) return [];
    try {
      const result: any = await socket.emitWithAck('list-room-participants', { roomCode });
      if (result?.participants) {
        setRoomParticipants(result.participants);
        return result.participants as RoomParticipant[];
      }
    } catch (err) {
      console.error('[Maya React] list-room-participants error:', err);
    }
    return [];
  }, [roomCode]);

  const isInRoom = roomCode !== null;

  // ── Meeting / Host control actions ──

  const muteParticipant = useCallback(async (targetClientId: string) => {
    if (clientRef.current && roomSessionId) {
      await clientRef.current.muteParticipant(roomSessionId, targetClientId);
    }
  }, [roomSessionId]);

  const muteAll = useCallback(async () => {
    if (clientRef.current && roomSessionId) {
      await clientRef.current.muteAll(roomSessionId);
    }
  }, [roomSessionId]);

  const unmuteAll = useCallback(async () => {
    if (clientRef.current && roomSessionId) {
      await clientRef.current.unmuteAll(roomSessionId);
    }
  }, [roomSessionId]);

  const removeParticipant = useCallback(async (targetClientId: string) => {
    if (clientRef.current && roomSessionId) {
      await clientRef.current.removeParticipant(roomSessionId, targetClientId);
    }
  }, [roomSessionId]);

  const lockRoom = useCallback(async (locked: boolean) => {
    if (clientRef.current && roomSessionId) {
      await clientRef.current.lockRoom(roomSessionId, locked);
    }
  }, [roomSessionId]);

  const endMeeting = useCallback(async () => {
    if (clientRef.current && roomSessionId) {
      await clientRef.current.endMeeting(roomSessionId);
    }
  }, [roomSessionId]);

  const transferHost = useCallback(async (targetClientId: string) => {
    if (clientRef.current && roomSessionId) {
      await clientRef.current.transferHost(roomSessionId, targetClientId);
    }
  }, [roomSessionId]);

  const toggleTranscription = useCallback(async (enabled: boolean) => {
    if (clientRef.current && roomSessionId) {
      await clientRef.current.toggleTranscription(roomSessionId, enabled);
    }
  }, [roomSessionId]);

  const askAi = useCallback(async () => {
    if (clientRef.current && roomSessionId) {
      await clientRef.current.askAi(roomSessionId);
    }
  }, [roomSessionId]);

  const cancelAskAi = useCallback(async () => {
    if (clientRef.current && roomSessionId) {
      await clientRef.current.cancelAskAi(roomSessionId);
    }
  }, [roomSessionId]);

  const enableWaitingRoom = useCallback(async (enabled: boolean) => {
    if (clientRef.current && roomSessionId) {
      await clientRef.current.enableWaitingRoom(roomSessionId, enabled);
    }
  }, [roomSessionId]);

  const admitParticipant = useCallback(async (targetClientId: string) => {
    if (clientRef.current && roomSessionId) {
      await clientRef.current.admitParticipant(roomSessionId, targetClientId);
    }
  }, [roomSessionId]);

  const denyParticipant = useCallback(async (targetClientId: string) => {
    if (clientRef.current && roomSessionId) {
      await clientRef.current.denyParticipant(roomSessionId, targetClientId);
    }
  }, [roomSessionId]);

  const admitAll = useCallback(async () => {
    if (clientRef.current && roomSessionId) {
      await clientRef.current.admitAll(roomSessionId);
    }
  }, [roomSessionId]);

  // Phase 2: AI Differentiator actions
  const generateSummary = useCallback(async () => {
    if (clientRef.current && roomSessionId) {
      setIsSummaryGenerating(true);
      await clientRef.current.generateSummary(roomSessionId);
    }
  }, [roomSessionId]);

  const generateMinutes = useCallback(async () => {
    if (clientRef.current && roomSessionId) {
      setIsMinutesGenerating(true);
      await clientRef.current.generateMinutes(roomSessionId);
    }
  }, [roomSessionId]);

  const addBookmark = useCallback(async (label: string, isActionItem: boolean = false) => {
    if (clientRef.current && roomSessionId) {
      await clientRef.current.addBookmark(roomSessionId, label, isActionItem);
    }
  }, [roomSessionId]);

  const removeBookmark = useCallback(async (bookmarkId: string) => {
    if (clientRef.current && roomSessionId) {
      await clientRef.current.removeBookmark(roomSessionId, bookmarkId);
    }
  }, [roomSessionId]);

  const getTranscript = useCallback(async (): Promise<TranscriptionEntry[]> => {
    if (clientRef.current && roomSessionId) {
      const result = await clientRef.current.getTranscript(roomSessionId);
      return result?.transcript || [];
    }
    return [];
  }, [roomSessionId]);

  // Phase 3: Text-only AI action
  const askAiText = useCallback(async (prompt?: string) => {
    if (clientRef.current && roomSessionId) {
      setIsAskAiTextProcessing(true);
      setAskAiTextResponse(null);
      await clientRef.current.askAiText(roomSessionId, prompt);
    }
  }, [roomSessionId]);

  return {
    // Status
    connectionStatus,
    conversationStatus,
    speakingStatus,

    // Data
    conversationMessages,
    currentTranscript,
    audioLevel,
    aiAudioLevel,
    error,
    localVideoStream,
    remoteVideoStream,
    localScreenStream,
    audioPlaybackWarning,

    // Computed
    isConnected,
    isConnecting,
    isConversationActive,
    isSpeaking,
    isUserSpeaking,
    isAISpeaking,
    isVideoEnabled,
    isScreenSharing,

    // Actions
    connect,
    connectSocket,
    setupRoomWebRTC,
    disconnect,
    startConversation,
    endConversation,
    sendMessage,
    setMuted,
    enableVideo,
    disableVideo,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    toggleScreenShare,
    updateConfig,
    getStats,
    clearError,

    // Multi-room
    roomCode,
    roomSessionId,
    roomParticipants,
    isInRoom,
    createRoom,
    joinRoom,
    leaveRoom,
    listRoomParticipants,

    // Meeting state
    roomMode,
    isHost,
    isTranscriptionEnabled,
    isAskAiActive,
    isRoomLocked,
    isWaitingRoomEnabled,
    isInWaitingRoom,
    transcriptions,
    waitingRoom,

    // Host controls
    muteParticipant,
    muteAll,
    unmuteAll,
    removeParticipant,
    lockRoom,
    endMeeting,
    transferHost,

    // Meeting features
    toggleTranscription,
    askAi,
    cancelAskAi,
    enableWaitingRoom,
    admitParticipant,
    denyParticipant,
    admitAll,

    // Phase 2: AI Differentiators
    bookmarks,
    summaries,
    currentMinutes,
    isSummaryGenerating,
    isMinutesGenerating,
    generateSummary,
    generateMinutes,
    addBookmark,
    removeBookmark,
    getTranscript,

    // Phase 3: Text-only AI
    askAiTextResponse,
    isAskAiTextProcessing,
    askAiText,
  };
}
