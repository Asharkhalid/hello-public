import { conversationStates } from '@/lib/conversation/state-tracker';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  
  // Get current state from memory
  const tracker = conversationStates.get(id);
  
  if (!tracker) {
    return Response.json({ 
      error: 'Meeting not found or not active' 
    }, { status: 404 });
  }
  
  return Response.json({
    state: tracker.getState(),
    timestamp: Date.now()
  });
}