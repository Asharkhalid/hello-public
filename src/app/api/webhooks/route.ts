import { NextRequest } from "next/server";
import { POST as webhookHandler } from "../webhook/route";
 
// Forward to the correct webhook endpoint without external fetch
export async function POST(req: NextRequest) {
  // Directly call the webhook handler to avoid SSL issues
  return webhookHandler(req);
} 