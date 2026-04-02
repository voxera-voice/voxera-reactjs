import {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
} from "react";
import {
  MayaVoiceClient,
  MayaVoiceConfig,
  ConnectionStatus,
  ConversationStatus,
  SpeakingStatus,
  ConversationMessage,
  MayaVoiceError,
} from "@voxera/sdk-core";

/**
 * Maya Voice context type
 */
interface MayaVoiceContextType {
  client: MayaVoiceClient | null;
  connectionStatus: ConnectionStatus;
  conversationStatus: ConversationStatus;
  speakingStatus: SpeakingStatus;
  messages: ConversationMessage[];
  error: MayaVoiceError | null;
}

const MayaVoiceContext = createContext<MayaVoiceContextType | undefined>(
  undefined
);

/**
 * Props for MayaVoiceProvider
 */
export interface MayaVoiceProviderProps {
  children: ReactNode;
  config: MayaVoiceConfig;
  autoConnect?: boolean;
}

/**
 * Maya Voice Provider component
 *
 * Provides the Maya Voice client context to child components.
 *
 * @example
 * ```tsx
 * function App() {
 *   return (
 *     <MayaVoiceProvider
 *       config={{
 *         appKey: 'your-api-key',
 *         serverUrl: 'wss://api.voxera.ai',
 *       }}
 *       autoConnect
 *     >
 *       <VoiceChat />
 *     </MayaVoiceProvider>
 *   );
 * }
 * ```
 */
export function MayaVoiceProvider({
  children,
  config,
  autoConnect = false,
}: MayaVoiceProviderProps) {
  const [client, setClient] = useState<MayaVoiceClient | null>(null);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("idle");
  const [conversationStatus, setConversationStatus] =
    useState<ConversationStatus>("idle");
  const [speakingStatus, setSpeakingStatus] = useState<SpeakingStatus>("none");
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [error, setError] = useState<MayaVoiceError | null>(null);

  useEffect(() => {
    const mayaClient = new MayaVoiceClient({
      ...config,
      onConnectionStatusChange: setConnectionStatus,
      onConversationStatusChange: setConversationStatus,
      onSpeakingStatusChange: setSpeakingStatus,
      onMessage: (message: ConversationMessage) => {
        setMessages((prev) => [...prev, message]);
      },
      onError: setError,
    });

    setClient(mayaClient);

    if (autoConnect) {
      mayaClient.connect().catch(() => {
        // Error handled by onError callback
      });
    }

    return () => {
      mayaClient.disconnect();
    };
  }, []);

  const value: MayaVoiceContextType = {
    client,
    connectionStatus,
    conversationStatus,
    speakingStatus,
    messages,
    error,
  };

  return (
    <MayaVoiceContext.Provider value={value}>
      {children}
    </MayaVoiceContext.Provider>
  );
}

/**
 * Hook to access the Maya Voice context
 *
 * Must be used within a MayaVoiceProvider.
 *
 * @example
 * ```tsx
 * function VoiceChat() {
 *   const { client, connectionStatus, messages } = useMayaVoice();
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
export function useMayaVoice(): MayaVoiceContextType {
  const context = useContext(MayaVoiceContext);

  if (context === undefined) {
    throw new Error("useMayaVoice must be used within a MayaVoiceProvider");
  }

  return context;
}
