import {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
} from "react";
import {
  VoxeraClient,
  VoxeraConfig,
  ConnectionStatus,
  ConversationStatus,
  SpeakingStatus,
  ConversationMessage,
  VoxeraError,
} from "@voxera/sdk-core";

/**
 * Voxera context type
 */
interface VoxeraContextType {
  client: VoxeraClient | null;
  connectionStatus: ConnectionStatus;
  conversationStatus: ConversationStatus;
  speakingStatus: SpeakingStatus;
  messages: ConversationMessage[];
  error: VoxeraError | null;
}

const VoxeraContext = createContext<VoxeraContextType | undefined>(
  undefined
);

/**
 * Props for VoxeraProvider
 */
export interface VoxeraProviderProps {
  children: ReactNode;
  config: VoxeraConfig;
  autoConnect?: boolean;
}

/**
 * Voxera Provider component
 *
 * Provides the Voxera client context to child components.
 *
 * @example
 * ```tsx
 * function App() {
 *   return (
 *     <VoxeraProvider
 *       config={{
 *         appKey: 'your-api-key',
 *         serverUrl: 'wss://media.voxera-voice.com',
 *       }}
 *       autoConnect
 *     >
 *       <VoiceChat />
 *     </VoxeraProvider>
 *   );
 * }
 * ```
 */
export function VoxeraProvider({
  children,
  config,
  autoConnect = false,
}: VoxeraProviderProps) {
  const [client, setClient] = useState<VoxeraClient | null>(null);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("idle");
  const [conversationStatus, setConversationStatus] =
    useState<ConversationStatus>("idle");
  const [speakingStatus, setSpeakingStatus] = useState<SpeakingStatus>("none");
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [error, setError] = useState<VoxeraError | null>(null);

  useEffect(() => {
    const voxeraClient = new VoxeraClient({
      ...config,
      onConnectionStatusChange: setConnectionStatus,
      onConversationStatusChange: setConversationStatus,
      onSpeakingStatusChange: setSpeakingStatus,
      onMessage: (message: ConversationMessage) => {
        setMessages((prev) => [...prev, message]);
      },
      onError: setError,
    });

    setClient(voxeraClient);

    if (autoConnect) {
      voxeraClient.connect().catch(() => {
        // Error handled by onError callback
      });
    }

    return () => {
      voxeraClient.disconnect();
    };
  }, []);

  const value: VoxeraContextType = {
    client,
    connectionStatus,
    conversationStatus,
    speakingStatus,
    messages,
    error,
  };

  return (
    <VoxeraContext.Provider value={value}>
      {children}
    </VoxeraContext.Provider>
  );
}

/**
 * Hook to access the Voxera context
 *
 * Must be used within a VoxeraProvider.
 *
 * @example
 * ```tsx
 * function VoiceChat() {
 *   const { client, connectionStatus, messages } = useVoxera();
 *
 *   return (
 *     <div>
 *       <p>Status: {connectionStatus}</p>
 *       {messages.map(msg => (
 *         <p key={msg.id}>{msg.content}</p>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useVoxera(): VoxeraContextType {
  const context = useContext(VoxeraContext);

  if (context === undefined) {
    throw new Error("useVoxera must be used within a VoxeraProvider");
  }

  return context;
}
