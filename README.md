# @voxera/sdk-react

React hooks and components for the [Voxera](https://voxera.ai) voice AI platform. Built on top of `@voxera/sdk-core`.

## Installation

```bash
npm install @voxera/sdk-react @voxera/sdk-core
```

## Quick Start

```tsx
import { useOmniumVoiceChat } from '@voxera/sdk-react';

function VoiceChat() {
  const {
    connect,
    disconnect,
    startConversation,
    endConversation,
    connectionStatus,
    conversationMessages,
    isUserSpeaking,
    isAISpeaking,
  } = useOmniumVoiceChat({
    appKey: 'your-api-key',
    serverUrl: 'wss://api.voxera.ai',
    chatConfig: {
      systemPrompt: 'You are a helpful assistant.',
    },
  });

  return (
    <div>
      <p>Status: {connectionStatus}</p>
      <button onClick={connect}>Connect</button>
      <button onClick={startConversation}>Start</button>
      {conversationMessages.map((msg) => (
        <p key={msg.id}>{msg.role}: {msg.content}</p>
      ))}
    </div>
  );
}
```

## Features

- **`useOmniumVoiceChat`** — all-in-one hook for voice AI, rooms, meetings, video, and transcription
- **`VoxeraProvider` / `useVoxera`** — React context for sharing a client instance across components
- **Real-time State** — reactive `connectionStatus`, `conversationStatus`, `speakingStatus`, audio levels
- **Multi-Room Meetings** — `createRoom`, `joinRoom`, `leaveRoom` with participant tracking
- **Host Controls** — mute/remove participants, lock room, transfer host, waiting room
- **Video & Screen Share** — local/remote video streams, peer video, screen sharing
- **AI Meeting Tools** — live transcription, transcribe-only mode, Ask AI, summaries, minutes, bookmarks
- **Zero Config** — sensible defaults, auto-reconnect, TypeScript support

## `useOmniumVoiceChat` Hook

### Configuration

```typescript
const result = useOmniumVoiceChat({
  appKey: string;          // Required: API key
  serverUrl: string;       // Required: WebSocket URL
  configurationId?: string;
  chatConfig?: {
    systemPrompt?: string;
    aiProvider?: 'openai' | 'anthropic' | 'ollama';
    model?: string;
    temperature?: number;
  };
  voiceConfig?: {
    voiceId?: string;
    voiceProvider?: 'elevenlabs' | 'openai' | 'azure';
    language?: string;
  };
  videoConfig?: {
    enabled?: boolean;
    width?: number;
    height?: number;
  };
});
```

### Returned State

| Property | Type | Description |
|----------|------|-------------|
| `connectionStatus` | `ConnectionStatus` | `'idle'` \| `'connecting'` \| `'connected'` \| `'disconnected'` \| `'error'` |
| `conversationStatus` | `ConversationStatus` | `'idle'` \| `'starting'` \| `'active'` \| `'ending'` \| `'ended'` |
| `conversationMessages` | `ConversationMessage[]` | All messages in the conversation |
| `currentTranscript` | `string` | In-progress user speech transcript |
| `audioLevel` | `number` | Local microphone audio level (0–1) |
| `aiAudioLevel` | `number` | AI audio playback level (0–1) |
| `participantAudioLevels` | `Record<string, number>` | Per-participant audio levels |
| `isConnected` | `boolean` | Whether connected to server |
| `isConversationActive` | `boolean` | Whether conversation is active |
| `isUserSpeaking` | `boolean` | Whether local user is speaking |
| `isAISpeaking` | `boolean` | Whether AI is speaking |
| `error` | `VoxeraError \| null` | Last error |

### Core Actions

| Method | Description |
|--------|-------------|
| `connect()` | Connect to server |
| `disconnect()` | Disconnect |
| `startConversation()` | Start voice conversation |
| `endConversation()` | End conversation |
| `sendMessage(content)` | Send text message |
| `setMuted(muted)` | Mute/unmute mic |

### Video & Screen Share

| Method/Property | Description |
|--------|-------------|
| `localVideoStream` | Local camera stream |
| `remoteVideoStream` | Remote AI video stream |
| `peerVideoStreams` | Map of peer video streams |
| `enableVideo()` / `disableVideo()` / `toggleVideo()` | Camera control |
| `startScreenShare()` / `stopScreenShare()` / `toggleScreenShare()` | Screen sharing |

### Multi-Room

| Method/Property | Description |
|--------|-------------|
| `createRoom(displayName, roomName?, roomMode?)` | Create a room |
| `joinRoom(roomCode, displayName)` | Join by room code |
| `leaveRoom()` | Leave current room |
| `roomCode` | Current room code |
| `roomParticipants` | Participant list |
| `isHost` | Whether local user is host |
| `roomMode` | `'ai-meeting'` or `'normal-meeting'` |

### Host Controls

```typescript
muteParticipant(targetClientId)
muteAll()
unmuteAll()
removeParticipant(targetClientId)
lockRoom(locked)
endMeeting()
transferHost(targetClientId)
```

### Meeting Features

| Method/Property | Description |
|--------|-------------|
| `toggleTranscription(enabled)` | Toggle live transcription |
| `toggleTranscribeOnly(enabled)` | Transcribe without AI |
| `isTranscriptionEnabled` | Transcription state |
| `isTranscribeOnly` | Transcribe-only state |
| `transcriptions` | Live transcription entries |
| `askAi()` / `cancelAskAi()` | Trigger/cancel AI |
| `askAiText(prompt?)` | Ask AI a text question |
| `generateSummary()` | Generate meeting summary |
| `generateMinutes()` | Generate meeting minutes |
| `addBookmark(label, isActionItem?)` | Add bookmark |
| `bookmarks` / `summaries` / `currentMinutes` | Meeting data |

## `VoxeraProvider`

For sharing a client instance across components:

```tsx
import { VoxeraProvider, useVoxera } from '@voxera/sdk-react';

function App() {
  return (
    <VoxeraProvider
      config={{ appKey: 'your-key', serverUrl: 'wss://api.voxera.ai' }}
      autoConnect
    >
      <VoiceChat />
    </VoxeraProvider>
  );
}

function VoiceChat() {
  const { client, connectionStatus, messages } = useVoxera();
  // ...
}
```

## TypeScript

All types are re-exported from `@voxera/sdk-core`:

```typescript
import type {
  VoxeraConfig,
  ConnectionStatus,
  ConversationMessage,
  RoomMode,
  RoomParticipant,
  TranscriptionEntry,
} from '@voxera/sdk-react';
```

## Backward Compatibility

Legacy names are still exported as deprecated aliases:

```typescript
// These still work but are deprecated:
import { MayaVoiceProvider, useMayaVoice } from '@voxera/sdk-react';
```

## License

MIT
