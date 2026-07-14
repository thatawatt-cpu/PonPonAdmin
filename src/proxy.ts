import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { ponponApiRaw } from "@/lib/ponpon-api";

const ACCESS_COOKIE = "pp_admin_access_token";
const REFRESH_COOKIE = "pp_admin_refresh_token";
const LOGIN_PATH = "/login";
const REFRESH_BEFORE_SECONDS = 30;

type RefreshPayload = {
  accessToken?: string;
  expiresAt?: string;
  refreshToken?: string;
};

export async function proxy(request: NextRequest) {
  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  const isLoginPage = request.nextUrl.pathname === LOGIN_PATH;

  if (accessToken && !shouldRefreshAccessToken(accessToken)) {
    return NextResponse.next();
  }

  if (refreshToken) {
    const refreshed = await refreshSession(refreshToken);

    if (refreshed?.accessToken) {
      const destination = isLoginPage ? new URL("/", request.url) : request.nextUrl;
      const response = NextResponse.redirect(destination);
      setAuthCookies(response, refreshed, request.nextUrl.protocol === "https:");
      return response;
    }
  }

  if (isLoginPage) {
    const response = NextResponse.next();
    clearAuthCookies(response);
    return response;
  }

  const loginUrl = new URL(LOGIN_PATH, request.url);
  loginUrl.searchParams.set(
    "next",
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
  );
  const response = NextResponse.redirect(loginUrl);
  clearAuthCookies(response);
  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\..*).*)",
  ],
};

async function refreshSession(refreshToken: string) {
  try {
    const response = await ponponApiRaw("/api/auth/refresh-token", {
      body: Buffer.from(JSON.stringify({ refreshToken })),
      headers: { "content-type": "application/json" },
      method: "POST",
    });

    if (!response.ok) return null;

    return JSON.parse(response.body.toString("utf8")) as RefreshPayload;
  } catch {
    return null;
  }
}

function setAuthCookies(
  response: NextResponse,
  payload: RefreshPayload,
  secure: boolean,
) {
  const expires = validDate(payload.expiresAt);

  if (payload.accessToken) {
    response.cookies.set(ACCESS_COOKIE, payload.accessToken, {
      expires,
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure,
    });
  }

  if (payload.refreshToken) {
    response.cookies.set(REFRESH_COOKIE, payload.refreshToken, {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure,
    });
  }
}

function clearAuthCookies(response: NextResponse) {
  response.cookies.set(ACCESS_COOKIE, "", { expires: new Date(0), path: "/" });
  response.cookies.set(REFRESH_COOKIE, "", { expires: new Date(0), path: "/" });
}

function validDate(value: string | undefined) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function shouldRefreshAccessToken(token: string) {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== "number") return true;

  return payload.exp <= Math.floor(Date.now() / 1000) + REFRESH_BEFORE_SECONDS;
}

function decodeJwtPayload(token: string): { exp?: number } | null {
  try {
    const encoded = token.split(".")[1];
    if (!encoded) return null;
    return JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as {
      exp?: number;
    };
  } catch {
    return null;
  }
}
