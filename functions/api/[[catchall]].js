/**
 * Cloudflare Pages Function — Dynamic API Tunnel Bridge for Paperclip
 *
 * Intercepts all requests to /api/* on the Cloudflare Pages edge (*.pages.dev)
 * and proxies them to your local PC backend through a Cloudflare Quick Tunnel
 * (or Named Tunnel).
 *
 * How the Tunnel URL is resolved (in priority order):
 *   1. `x-tunnel-origin` request header (sent automatically by frontend if configured in localStorage)
 *   2. `paperclip_tunnel_origin` cookie
 *   3. `tunnel_origin` query parameter (?tunnel_origin=https://xxxx.trycloudflare.com)
 *   4. `TUNNEL_ORIGIN` environment variable configured in wrangler.toml / Cloudflare Pages dashboard
 */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, x-tunnel-origin, X-Paperclip-Tab-Visible, X-Paperclip-Route",
};

function getCookie(cookieHeader, name) {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp("(?:^|;\\s*)" + name + "=([^;]*)"));
  return match ? decodeURIComponent(match[1]) : null;
}

export async function onRequest(context) {
  const { request, env } = context;

  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const url = new URL(request.url);

  // Resolve target tunnel origin
  let tunnelOrigin =
    request.headers.get("x-tunnel-origin") ||
    getCookie(request.headers.get("cookie"), "paperclip_tunnel_origin") ||
    url.searchParams.get("tunnel_origin") ||
    (env && env.TUNNEL_ORIGIN ? env.TUNNEL_ORIGIN : "");

  tunnelOrigin = (tunnelOrigin || "").trim().replace(/\/+$/, "");

  // Special bridge status/config endpoint: GET /api/bridge/status
  if (url.pathname === "/api/bridge/status") {
    return new Response(
      JSON.stringify({
        ok: Boolean(tunnelOrigin),
        tunnelOrigin: tunnelOrigin || null,
        pagesHost: url.host,
        message: tunnelOrigin
          ? "Cloudflare Pages API Bridge is active and pointing to tunnel."
          : "No tunnel origin configured. Pass ?tunnel_origin=https://xxxx.trycloudflare.com or set TUNNEL_ORIGIN in Cloudflare Pages.",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...CORS_HEADERS,
        },
      },
    );
  }

  if (!tunnelOrigin) {
    return new Response(
      JSON.stringify({
        error: "Backend tunnel not configured",
        hint: "Start your local tunnel with start_tunnel.bat, or open the app with ?tunnel_origin=https://YOUR-TUNNEL.trycloudflare.com",
      }),
      {
        status: 503,
        headers: {
          "Content-Type": "application/json",
          ...CORS_HEADERS,
        },
      },
    );
  }

  // Construct target URL on the tunnel
  const targetUrl = new URL(url.pathname + url.search, tunnelOrigin);
  targetUrl.searchParams.delete("tunnel_origin");

  // Clone headers and prepare for proxying
  const proxyHeaders = new Headers(request.headers);
  proxyHeaders.delete("host");
  proxyHeaders.delete("cf-connecting-ip");
  proxyHeaders.delete("cf-ipcountry");
  proxyHeaders.delete("cf-ray");
  proxyHeaders.delete("cf-visitor");
  proxyHeaders.delete("x-tunnel-origin");
  // Present the canonical Cloudflare Pages hostname as the first X-Forwarded-Host
  // so Paperclip's privateHostnameGuard validates against the registered Pages domain
  // even when temporary Quick Tunnel URLs rotate.
  proxyHeaders.set("X-Forwarded-Host", "paperclip-control-plane.pages.dev");

  const init = {
    method: request.method,
    headers: proxyHeaders,
    redirect: "manual",
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body;
  }

  try {
    const upstreamResponse = await fetch(targetUrl.toString(), init);
    const responseHeaders = new Headers(upstreamResponse.headers);

    for (const [k, v] of Object.entries(CORS_HEADERS)) {
      responseHeaders.set(k, v);
    }

    // If user passed ?tunnel_origin=... in query, persist it as a cookie for convenience
    const queryTunnel = url.searchParams.get("tunnel_origin");
    if (queryTunnel) {
      responseHeaders.append(
        "Set-Cookie",
        `paperclip_tunnel_origin=${encodeURIComponent(tunnelOrigin)}; Path=/; Max-Age=2592000; SameSite=Lax`,
      );
    }

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: responseHeaders,
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: "Failed to reach local backend via Cloudflare Tunnel",
        tunnelOrigin,
        details: err && err.message ? err.message : String(err),
      }),
      {
        status: 502,
        headers: {
          "Content-Type": "application/json",
          ...CORS_HEADERS,
        },
      },
    );
  }
}
