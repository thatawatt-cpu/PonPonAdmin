import { NextRequest, NextResponse } from "next/server";
import { ponponApiRaw } from "@/lib/ponpon-api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Context = {
  params: Promise<{ path: string[] }>;
};

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

async function proxy(request: NextRequest, context: Context) {
  const { path } = await context.params;
  const search = request.nextUrl.search;
  const targetPath = `/api/${path.join("/")}${search}`;
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

  let apiResponse;

  try {
    apiResponse = await ponponApiRaw(targetPath, {
      body,
      headers,
      method: request.method,
    });
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
    : apiResponse.body.toString("utf8");
  const response = new NextResponse(responseBody, {
    headers: responseHeaders(apiResponse.headers),
    status: apiResponse.status,
  });

  if (targetPath === "/api/admin/auth/login" && apiResponse.ok) {
    setAuthCookies(response, apiResponse.body);
  }

  if (targetPath === "/api/auth/logout") {
    clearAuthCookies(response);
  }

  return response;
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
