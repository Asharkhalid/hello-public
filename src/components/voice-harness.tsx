// voice-harness.tsx

"use client";

import { useRealtimeAgent } from "@/hooks/use-realtime-agent";


export const VoiceHarness = () => {
  const { status, connect, disconnect, isUserSpeaking, isAgentSpeaking, isListening } = useRealtimeAgent();
  
  // For Phase 1, we will hard-code these.
  // In a real app, you'd get these from the page context or user session.
  const MOCK_MEETING_ID = "rDNwX2ekv1ULrS94xrd75"; 
  const MOCK_AUTH_TOKEN = "ROKG5eLxvcWM2ggpjqgstbmSlBnUCS40";

  const handleConnect = () => {
    connect(MOCK_MEETING_ID, MOCK_AUTH_TOKEN);
  };

  const handleDisconnect = () => {
    disconnect();
  };

  const isConnected = status === 'connected';

 const getStatusIndicator = () => {
    if (status !== 'connected') return null;

    if (isUserSpeaking) return <div style={{color: '#3b82f6', fontWeight: 'bold'}}>You are Speaking...</div>;
    if (isAgentSpeaking) return <div style={{color: '#8b5cf6', fontWeight: 'bold'}}>Agent is Speaking...</div>;
    if (isListening) return <div style={{color: 'green', fontWeight: 'bold'}}>Listening...</div>;
    
    return null;
  }
  
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: '40px',
      border: '1px solid #ccc',
      borderRadius: '8px',
      backgroundColor: '#f9f9f9',
      gap: '20px',
      fontFamily: 'sans-serif',
      minWidth: '300px'
    }}>
      <h2 style={{ margin: 0 }}>Phase 1 Voice Agent Test</h2>
      <p style={{ margin: 0 }}>
        Session Status: <span style={{ fontWeight: 'bold', color: status === 'connected' ? 'green' : 'red' }}>{status.toUpperCase()}</span>
      </p>
      
      {status !== 'connected' ? (
        <button 
          onClick={handleConnect} 
          disabled={status === 'connecting'}
          style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer', border: '1px solid #333', borderRadius: '5px' }}
        >
          {status === 'connecting' ? 'Connecting...' : 'Connect'}
        </button>
      ) : (
        <button 
          onClick={handleDisconnect}
          style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer', border: '1px solid #333', borderRadius: '5px', backgroundColor: '#ffdddd' }}
        >
          Disconnect
        </button>
      )}

      <div style={{ marginTop: '20px', minHeight: '40px', textAlign: 'center' }}>
        <p><strong>Live Status:</strong></p>
        {getStatusIndicator()}
      </div>

      {status === 'error' && <p style={{ color: 'red' }}>❌ Connection failed. Check the console.</p>}
    </div>
  );
};
