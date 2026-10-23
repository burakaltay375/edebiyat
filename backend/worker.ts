import handler from "vinext/server/fetch-handler";

type Bindings = { DB: D1Database; ASSETS: Fetcher; AUTH_GATEWAY_SECRET?: string };

export default {
  async fetch(request: Request, env: Bindings, ctx: ExecutionContext) {
    const url = new URL(request.url);
    let pathname: string;
    try { pathname = new URL(decodeURIComponent(url.pathname).replaceAll("\\", "/"), url.origin).pathname; }
    catch { return new Response("Geçersiz dosya yolu.", { status: 400 }); }
    const headers = new Headers(request.headers);
    // Dev identity exists only in Vite's development build and on loopback.
    const local = import.meta.env.DEV && ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname);
    if (local) {
      headers.set("oai-authenticated-user-id", "local_student");
      headers.set("oai-authenticated-user-email", "local@example.test");
    } else {
      // A direct Workers deployment must not trust browser-supplied identity headers.
      const supplied = headers.get("x-edebiyat-gateway-secret");
      if (!env.AUTH_GATEWAY_SECRET || supplied !== env.AUTH_GATEWAY_SECRET) {
        for (const key of [...headers.keys()]) if (key.startsWith("oai-authenticated-")) headers.delete(key);
      }
    }
    headers.delete("x-edebiyat-gateway-secret");
    const trustedRequest = new Request(request, { headers });
    if (pathname.startsWith("/podcasts/")) {
      const uid = headers.get("oai-authenticated-user-id");
      if (!uid || !headers.get("oai-authenticated-user-email")) return new Response("Podcast için giriş yapmalısın.", { status: 401 });
      const participant = await env.DB.prepare("SELECT code FROM research_participants WHERE user_id=? AND consent=1").bind(uid).first();
      if (participant) return new Response("Podcast araştırma protokolüne dahil değil.", { status: 403 });
      const asset = await env.ASSETS.fetch(trustedRequest);
      const response = new Response(asset.body, asset);
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    }
    return handler.fetch(trustedRequest, env, ctx);
  }
};
