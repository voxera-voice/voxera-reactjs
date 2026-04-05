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
 *     serverUrl: 'wss://api.voxera.ai',
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
export { VoxeraProvider, useVoxera } from "./VoxeraProvider";
export type { VoxeraProviderProps } from "./VoxeraProvider";

// Backward-compatible aliases (deprecated)
export { VoxeraProvider as MayaVoiceProvider, useVoxera as useMayaVoice } from "./VoxeraProvider";
export type { VoxeraProviderProps as MayaVoiceProviderProps } from "./VoxeraProvider";

// Re-export types from core
export {
  type VoxeraConfig,
  type ChatConfig,
  type VoiceConfig,
  type ConnectionOptions,
  type ConversationMessage,
  type ConnectionStatus,
  type ConversationStatus,
  type SpeakingStatus,
  type WebRTCStats,
  type RoomMode,
  VoxeraError,
  ErrorCodes,
} from "@voxera/sdk-core";

// Backward-compatible aliases from core (deprecated)
export { type VoxeraConfig as MayaVoiceConfig, VoxeraError as MayaVoiceError } from "@voxera/sdk-core";

// Version
export const VERSION = "1.0.0";
