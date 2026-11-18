import { NextRequest } from "next/server";
import { subscribe } from "@/lib/realtime";
import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get("event");

  const session = await getSessionUser();

  const responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();

  const sendEvent = async (data: any) => {
    try {
      await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
    } catch {
      // client disconnected
    }
  };

  const unsubscribes: (() => void)[] = [];

  // 1. Subscribe to event channel (seats, tasks)
  if (eventId) {
    unsubscribes.push(subscribe(`event:${eventId}`, sendEvent));
  }

  // 2. Subscribe to user channel (notifications)
  if (session?.userId) {
    unsubscribes.push(subscribe(`user:${session.userId}`, sendEvent));

    if (session.role === "ADMIN") {
      unsubscribes.push(subscribe("admin", sendEvent));
    }
  }

  // Send initial connection ping
  sendEvent({ kind: "connected", timestamp: Date.now() });

  // Heartbeat every 25 seconds
  const heartbeat = setInterval(() => {
    writer.write(encoder.encode(": heartbeat\n\n")).catch(() => clearInterval(heartbeat));
  }, 25000);

  // Clean up on disconnect
  req.signal.addEventListener("abort", () => {
    clearInterval(heartbeat);
    unsubscribes.forEach((unsub) => unsub());
    writer.close().catch(() => {});
  });

  return new Response(responseStream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

