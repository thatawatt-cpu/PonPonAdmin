import { NextRequest } from "next/server";
import { proxyBackendRequest } from "@/app/api/backend/[...path]/route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Context = {
  params: Promise<{ path: string[] }>;
};

export async function GET(request: NextRequest, context: Context) {
  return proxyBackendRequest(request, context, ["admin"]);
}

export async function POST(request: NextRequest, context: Context) {
  return proxyBackendRequest(request, context, ["admin"]);
}

export async function PATCH(request: NextRequest, context: Context) {
  return proxyBackendRequest(request, context, ["admin"]);
}

export async function PUT(request: NextRequest, context: Context) {
  return proxyBackendRequest(request, context, ["admin"]);
}

export async function DELETE(request: NextRequest, context: Context) {
  return proxyBackendRequest(request, context, ["admin"]);
}
