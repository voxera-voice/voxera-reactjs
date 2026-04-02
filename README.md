# Voxera SDK - React

React hooks and components for Voxera Voice Platform.

## Installation

```bash
npm install @voxera/sdk-react @voxera/sdk-core
```

## Usage

```tsx
import { useMayaVoice } from '@voxera/sdk-react';

function VoiceChat() {
  const { connect, disconnect, isConnected } = useMayaVoice({ apiKey: 'your-key' });
  return <button onClick={connect}>Start</button>;
}
```

## Build

```bash
npm run build
```
