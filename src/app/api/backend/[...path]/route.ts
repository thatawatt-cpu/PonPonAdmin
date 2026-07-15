import { NextRequest, NextResponse } from "next/server";
import { ponponApiRaw } from "@/lib/ponpon-api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Context = {
  params: Promise<{ path: string[] }>;
};

type ApiRawResponse = Awaited<ReturnType<typeof ponponApiRaw>>;

export async function GET(request: NextRequest, context: Context) {
  return proxy(request, context);
}

export async function POST(request: NextRequest, context: Context) {
  return proxy(request, context);
}

export async function PATCH(request: NextRequest, context: Context) {
  return proxy(request, context);
}

export async function PUT(request: NextRequest, context: Context) {
  return proxy(request, context);
}

export async function DELETE(request: NextRequest, context: Context) {
  return proxy(request, context);
}

export async function proxyBackendRequest(
  request: NextRequest,
  context: Context,
  pathPrefix: string[] = [],
) {
  const { path } = await context.params;
  const search = request.nextUrl.search;
  const targetPath = `/api/${[...pathPrefix, ...path].join("/")}${search}`;
  let body = await getBody(request);
  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  const authorization = request.headers.get("authorization");
  const cookieToken = request.cookies.get("pp_admin_access_token")?.value;
  const cookieRefreshToken = request.cookies.get(
    "pp_admin_refresh_token",
  )?.value;

  if (contentType) {
    headers.set("content-type", contentType);
  }

  if (authorization) {
    headers.set("authorization", authorization);
  } else if (cookieToken) {
    headers.set("authorization", `Bearer ${cookieToken}`);
  }

  if (targetPath === "/api/auth/logout") {
    body = Buffer.from(
      JSON.stringify({ refreshToken: cookieRefreshToken ?? "" }),
    );
    headers.set("content-type", "application/json");
  }

  let apiResponse: ApiRawResponse;
  let refreshedTokenBody: Buffer | null = null;

  try {
    apiResponse = await ponponApiRaw(targetPath, {
      body,
      headers,
      method: request.method,
    });

    if (
      apiResponse.status === 401 &&
      cookieRefreshToken &&
      shouldRefreshToken(targetPath)
    ) {
      const refreshResponse = await refreshAccessToken(cookieRefreshToken);

      if (refreshResponse.ok) {
        const refreshedToken = getAccessToken(refreshResponse.body);

        if (refreshedToken) {
          headers.set("authorization", `Bearer ${refreshedToken}`);
          apiResponse = await ponponApiRaw(targetPath, {
            body,
            headers,
            method: request.method,
          });
          refreshedTokenBody = refreshResponse.body;
        }
      } else {
        const response = NextResponse.json(
          { message: "Session expired" },
          { status: 401 },
        );
        clearAuthCookies(response);
        return response;
      }
    }
  } catch (error) {
    if (targetPath === "/api/auth/logout") {
      const response = NextResponse.json({ success: true });
      clearAuthCookies(response);
      return response;
    }

    throw error;
  }

  const responseBody = [204, 205, 304].includes(apiResponse.status)
    ? null
    : Uint8Array.from(apiResponse.body).buffer;
  const response = new NextResponse(responseBody, {
    headers: responseHeaders(apiResponse.headers),
    status: apiResponse.status,
  });

  if (refreshedTokenBody) {
    setAuthCookies(response, refreshedTokenBody);
  }

  if (
    (targetPath === "/api/admin/auth/login" ||
      targetPath === "/api/auth/refresh-token") &&
    apiResponse.ok
  ) {
    setAuthCookies(response, apiResponse.body);
  }

  if (targetPath === "/api/auth/logout") {
    clearAuthCookies(response);
  }

  return response;
}

async function proxy(request: NextRequest, context: Context) {
  return proxyBackendRequest(request, context);
}

async function refreshAccessToken(refreshToken: string) {
  return ponponApiRaw("/api/auth/refresh-token", {
    body: Buffer.from(JSON.stringify({ refreshToken })),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
}

function shouldRefreshToken(targetPath: string) {
  return ![
    "/api/admin/auth/login",
    "/api/auth/logout",
    "/api/auth/refresh-token",
  ].includes(targetPath);
}

function getAccessToken(body: Buffer) {
  try {
    const payload = JSON.parse(body.toString("utf8")) as {
      accessToken?: string;
    };

    return payload.accessToken;
  } catch {
    return undefined;
  }
}

async function getBody(request: NextRequest) {
  if (["GET", "HEAD"].includes(request.method)) {
    return undefined;
  }

  return Buffer.from(await request.arrayBuffer());
}

function responseHeaders(headers: Record<string, string | string[] | undefined>) {
  const nextHeaders = new Headers();
  const contentType = headers["content-type"];

  if (typeof contentType === "string") {
    nextHeaders.set("content-type", contentType);
  }

  return nextHeaders;
}

function setAuthCookies(response: NextResponse, body: Buffer) {
  try {
    const payload = JSON.parse(body.toString("utf8")) as {
      accessToken?: string;
      expiresAt?: string;
      refreshToken?: string;
    };
    const expires = payload.expiresAt ? new Date(payload.expiresAt) : undefined;

    if (payload.accessToken) {
      response.cookies.set("pp_admin_access_token", payload.accessToken, {
        expires,
        httpOnly: true,
        sameSite: "lax",
        secure: false,
        path: "/",
      });
    }

    if (payload.refreshToken) {
      response.cookies.set("pp_admin_refresh_token", payload.refreshToken, {
        httpOnly: true,
        sameSite: "lax",
        secure: false,
        path: "/",
      });
    }
  } catch {
    // If the auth response is not JSON, keep proxy behavior unchanged.
  }
}

function clearAuthCookies(response: NextResponse) {
  response.cookies.set("pp_admin_access_token", "", {
    expires: new Date(0),
    path: "/",
  });
  response.cookies.set("pp_admin_refresh_token", "", {
    expires: new Date(0),
    path: "/",
  });
}
