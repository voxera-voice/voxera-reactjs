# Voxera SDK — React

React hooks and components for [Voxera Voice Platform](https://voxera-voice.com). Built on top of `@voxera/sdk-core`.

## Platform Endpoints

| Service | URL |
|---------|-----|
| **Media Server (WebSocket)** | `wss://media.voxera-voice.com` |
| **Client API** | `https://client.voxera-voice.com/api/v1` |
| **Admin Dashboard** | `https://app.voxera-voice.com` |

## Meeting Modes

### AI Meeting (`ai-meeting`)

Real-time voice conversation with an AI assistant. The AI listens via STT, processes through a configurable LLM (OpenAI, Anthropic, Ollama), and responds with natural speech via TTS. Multiple participants can share the same AI room.

- Bidirectional voice AI (WebRTC/mediasoup)
- Configurable AI persona, model, temperature, max tokens
- Multiple TTS providers (OpenAI, ElevenLabs, Azure)
- Multiple STT providers (Google, OpenAI Whisper)
- Live transcription, video, screen sharing with AI vision
- AI-generated meeting summaries and minutes
- Bookmarks with action item flags

### Normal Meeting (`normal-meeting`)

Multi-participant audio/video meeting without AI voice. AI features available as text-only.

- Multi-participant real-time audio/video (WebRTC/mediasoup SFU)
- Host controls — mute, remove, transfer host, lock room, end meeting
- Waiting room with admit/deny
- Live transcription (host toggle)
- Ask AI (text) — streamed text responses
- AI summaries, minutes, bookmarks
- Screen sharing

### Common Features

- WebRTC via mediasoup SFU with TURN fallback
- Room management with room codes and display names
- Real-time participant events
- Webhook integration
- Usage tracking and billing

## Installation

```bash
npm install @voxera/sdk-react @voxera/sdk-core
```

## Quick Start — AI Meeting

```tsx
import { useOmniumVoiceChat } from '@voxera/sdk-react';

function AIVoiceChat() {
  const {
    connectionStatus,
    conversationStatus,
    speakingStatus,
    conversationMessages,
    isConnected,
    isConversationActive,
    connect,
    disconnect,
    startConversation,
    endConversation,
    setMuted,
  } = useOmniumVoiceChat({
    appKey: 'your-app-key',                    // from https://app.voxera-voice.com
    serverUrl: 'wss://media.voxera-voice.com',
    chatConfig: {
      systemPrompt: 'You are a helpful assistant.',
      model: 'gpt-4o',
      temperature: 0.7,
    },
    voiceConfig: {
      voiceId: 'nova',
      voiceProvider: 'openai',
    },
  });

  return (
    <div>
      <p>Status: {connectionStatus} / {conversationStatus}</p>
      <p>Speaking: {speakingStatus}</p>
      <button onClick={connect} disabled={isConnected}>Connect</button>
      <button onClick={startConversation} disabled={!isConnected}>Start</button>
      <button onClick={endConversation} disabled={!isConversationActive}>Stop</button>
      <button onClick={disconnect}>Disconnect</button>
      <ul>
        {conversationMessages.map((m, i) => (
          <li key={i}><b>{m.role}:</b> {m.content}</li>
        ))}
      </ul>
    </div>
  );
}
```

## Quick Start — Normal Meeting (Multi-Participant)

```tsx
import { useOmniumVoiceChat } from '@voxera/sdk-react';

function MeetingRoom() {
  const {
    isInRoom,
    roomCode,
    roomParticipants,
    isHost,
    transcriptions,
    summaries,
    askAiTextResponse,
    createRoom,
    joinRoom,
    leaveRoom,
    muteParticipant,
    muteAll,
    unmuteAll,
    removeParticipant,
    lockRoom,
    endMeeting,
    transferHost,
    toggleTranscription,
    askAiText,
    generateSummary,
    generateMinutes,
    addBookmark,
    enableWaitingRoom,
    admitParticipant,
  } = useOmniumVoiceChat({
    appKey: 'your-app-key',
    serverUrl: 'wss://media.voxera-voice.com',
  });

  const handleCreate = () => createRoom('Alice', 'Team Standup', 'normal-meeting');
  const handleJoin = (code: string) => joinRoom(code, 'Bob');

  return (
    <div>
      {!isInRoom ? (
        <>
          <button onClick={handleCreate}>Create Room</button>
          <button onClick={() => handleJoin('ABC123')}>Join Room</button>
        </>
      ) : (
        <>
          <p>Room: {roomCode} ({roomParticipants.length} participants)</p>
          {isHost && (
            <div>
              <button onClick={muteAll}>Mute All</button>
              <button onClick={() => toggleTranscription(true)}>Enable Transcription</button>
              <button onClick={() => enableWaitingRoom(true)}>Enable Waiting Room</button>
              <button onClick={generateSummary}>Generate Summary</button>
              <button onClick={generateMinutes}>Generate Minutes</button>
              <button onClick={endMeeting}>End Meeting</button>
            </div>
          )}
          <button onClick={() => askAiText('What were the key decisions?')}>Ask AI</button>
          <button onClick={() => addBookmark('Important point', true)}>Bookmark</button>
          <button onClick={leaveRoom}>Leave</button>
          {askAiTextResponse && <p>AI: {askAiTextResponse}</p>}
        </>
      )}
    </div>
  );
}
```

## Provider Pattern

```tsx
import { VoxeraProvider, useVoxera } from '@voxera/sdk-react';

function App() {
  return (
    <VoxeraProvider
      config={{
        appKey: 'your-app-key',
        serverUrl: 'wss://media.voxera-voice.com',
      }}
      autoConnect
    >
      <ChatView />
    </VoxeraProvider>
  );
}

function ChatView() {
  const { client, connectionStatus, messages } = useVoxera();
  // Use the shared client instance
}
```

## Hook Return Values

### Status

| Field | Type | Description |
|-------|------|-------------|
| `connectionStatus` | `ConnectionStatus` | `idle` · `connecting` · `connected` · `disconnected` |
| `conversationStatus` | `ConversationStatus` | `idle` · `starting` · `active` · `ending` · `ended` |
| `speakingStatus` | `SpeakingStatus` | `none` · `user` · `ai` |
| `isConnected` | `boolean` | Connected to media server |
| `isConversationActive` | `boolean` | Voice conversation running |
| `isInRoom` | `boolean` | In a multi-participant room |
| `isHost` | `boolean` | Current user is room host |
| `roomMode` | `RoomMode` | `ai-meeting` or `normal-meeting` |

### Data

| Field | Type | Description |
|-------|------|-------------|
| `conversationMessages` | `ConversationMessage[]` | Chat messages |
| `currentTranscript` | `string` | In-progress speech text |
| `audioLevel` / `aiAudioLevel` | `number` | Audio levels (0–1) |
| `roomCode` | `string` | Current room code |
| `roomParticipants` | `RoomParticipant[]` | Participant list |
| `transcriptions` | `TranscriptionEntry[]` | Transcription entries |
| `waitingRoom` | `WaitingRoomEntry[]` | Waiting room entries |
| `bookmarks` | `MeetingBookmark[]` | Meeting bookmarks |
| `summaries` | `MeetingSummary[]` | AI summaries |
| `currentMinutes` | `MeetingMinutes` | AI minutes |
| `askAiTextResponse` | `string` | AI text response |

### Actions

| Method | Description |
|--------|-------------|
| `connect()` | Connect to media server |
| `disconnect()` | Disconnect |
| `startConversation()` | Start voice conversation |
| `endConversation()` | End voice conversation |
| `sendMessage(content)` | Send text message |
| `setMuted(bool)` | Mute/unmute mic |
| `enableVideo()` / `disableVideo()` | Camera control |
| `startScreenShare()` / `stopScreenShare()` | Screen share |
| `createRoom(name, roomName?, mode?)` | Create room |
| `joinRoom(code, name)` | Join room by code |
| `leaveRoom()` | Leave current room |

### Host Controls

| Method | Description |
|--------|-------------|
| `muteParticipant(id)` | Mute a participant |
| `muteAll()` / `unmuteAll()` | Mute/unmute everyone |
| `removeParticipant(id)` | Remove from room |
| `lockRoom(bool)` | Lock/unlock room |
| `endMeeting()` | End meeting for all |
| `transferHost(id)` | Transfer host role |
| `toggleTranscription(bool)` | Toggle live transcription |
| `enableWaitingRoom(bool)` | Toggle waiting room |
| `admitParticipant(id)` / `denyParticipant(id)` | Waiting room decisions |
| `admitAll()` | Admit all waiting |

### AI Features

| Method | Description |
|--------|-------------|
| `askAi()` | AI spoken response (ai-meeting) |
| `cancelAskAi()` | Cancel AI voice |
| `askAiText(prompt?)` | AI text response |
| `generateSummary()` | Generate AI summary |
| `generateMinutes()` | Generate AI minutes |
| `addBookmark(label, isActionItem?)` | Add bookmark |
| `removeBookmark(id)` | Remove bookmark |
| `getTranscript()` | Fetch transcript |

## Configuration

See [`@voxera/sdk-core` README](../sdk-core/README.md) for full `MayaVoiceConfig`, `ChatConfig`, `VoiceConfig`, `VideoConfig`, and `ConnectionOptions` reference.

## Build

```bash
npm run build
```

## License

MIT
