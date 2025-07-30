// app/harness/page.tsx

import { VoiceHarness } from "@/components/voice-harness";


export default function HarnessPage() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      backgroundColor: '#e0e0e0'
    }}>
      <VoiceHarness />
    </div>
  );
}