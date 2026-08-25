import { db } from "@/lib/db/pool";
import { getCurrentSessionUserId } from "@/lib/auth/session";
import { getProjectChatAccess } from "@/features/chat/server/get-project-chat-access";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Props = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Props) {
  const { id: projectId } = await params;
  const userId = await getCurrentSessionUserId();
  if (!userId) return new Response("Unauthorized", { status: 401 });
  const access = await getProjectChatAccess(projectId, userId);
  if (!access) return new Response("Forbidden", { status: 403 });

  const client = await db.connect();
  const encoder = new TextEncoder();
  let closed = false;
  let keepAlive: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: string) => {
        if (closed) return;
        try { controller.enqueue(encoder.encode(`event: ${event}\ndata: ${data}\n\n`)); } catch { close(); }
      };
      const onNotification = (message: { channel: string; payload?: string }) => {
        if (message.channel === "stroyselect_chat" && message.payload === projectId) send("change", JSON.stringify({ projectId }));
      };
      const close = async () => {
        if (closed) return;
        closed = true;
        if (keepAlive) clearInterval(keepAlive);
        client.removeListener("notification", onNotification);
        try { await client.query("UNLISTEN stroyselect_chat"); } catch {}
        client.release();
        try { controller.close(); } catch {}
      };

      client.on("notification", onNotification);
      try {
        await client.query("LISTEN stroyselect_chat");
        send("ready", JSON.stringify({ projectId }));
        keepAlive = setInterval(() => send("ping", String(Date.now())), 20_000);
      } catch (error) {
        console.error("Не удалось запустить realtime-канал чата:", error);
        await close();
        return;
      }

      if (request.signal.aborted) await close();
      else request.signal.addEventListener("abort", () => { void close(); }, { once: true });
    },
    async cancel() {
      if (closed) return;
      closed = true;
      if (keepAlive) clearInterval(keepAlive);
      try { await client.query("UNLISTEN stroyselect_chat"); } catch {}
      client.release();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
