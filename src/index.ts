/**
 * Voxera React SDK
 *
 * React hooks and components for the Voxera Voice platform.
 *
 * @example
 * ```tsx
 * import { useOmniumVoiceChat } from '@voxera/sdk-react';
 *
 * function VoiceChat() {
 *   const {
 *     connect,
 *     startConversation,
 *     conversationMessages,
 *     isUserSpeaking,
 *     isAISpeaking,
 *   } = useOmniumVoiceChat({
 *     appKey: 'your-api-key',
 *     serverUrl: 'wss://api.maya-voice.com',
 *   });
 *
 *   return (
 *     <div>
 *       <button onClick={connect}>Connect</button>
 *       <button onClick={startConversation}>Start</button>
 *     </div>
 *   );
 * }
 * ```
 */

// Main hook
export { useOmniumVoiceChat } from "./useOmniumVoiceChat";
export type {
  UseOmniumVoiceChatConfig,
  UseOmniumVoiceChatReturn,
  RoomParticipant,
} from "./useOmniumVoiceChat";

// Provider and context hook
export { MayaVoiceProvider, useMayaVoice } from "./MayaVoiceProvider";
export type { MayaVoiceProviderProps } from "./MayaVoiceProvider";

// Re-export types from core
export {
  type MayaVoiceConfig,
  type ChatConfig,
  type VoiceConfig,
  type ConnectionOptions,
  type ConversationMessage,
  type ConnectionStatus,
  type ConversationStatus,
  type SpeakingStatus,
  type WebRTCStats,
  MayaVoiceError,
  ErrorCodes,
} from "@voxera/sdk-core";

// Version
export const VERSION = "1.0.0";
