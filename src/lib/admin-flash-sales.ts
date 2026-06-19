import { cookies } from "next/headers";
import { PonPonApiError, ponponApiJson } from "@/lib/ponpon-api";

export type FlashSaleStatus = "upcoming" | "active" | "ended";

export type FlashSaleProduct = {
  productId: string;
  salePrice: number;
  productName: string;
  originalPrice: number;
  imageUrl: string;
};

export type FlashSale = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  slots: string[];
  status: FlashSaleStatus;
  products: FlashSaleProduct[];
};

export async function getAdminFlashSales(): Promise<{
  authRequired: boolean;
  flashSales: FlashSale[];
  error?: string;
}> {
  try {
    const token = await getAccessToken();
    const flashSales = await ponponApiJson<FlashSale[]>("/api/admin/flash-sales", {
      headers: token ? { authorization: `Bearer ${token}` } : undefined,
    });
    return { authRequired: false, flashSales };
  } catch (error) {
    if (error instanceof PonPonApiError && error.status === 401) {
      return { authRequired: true, flashSales: [] };
    }
    return {
      authRequired: false,
      flashSales: [],
      error: error instanceof Error ? error.message : "Cannot load flash sales",
    };
  }
}

export async function getAdminFlashSale(id: string): Promise<{
  authRequired: boolean;
  flashSale?: FlashSale;
  error?: string;
}> {
  try {
    const token = await getAccessToken();
    const flashSale = await ponponApiJson<FlashSale>(`/api/admin/flash-sales/${id}`, {
      headers: token ? { authorization: `Bearer ${token}` } : undefined,
    });
    return { authRequired: false, flashSale };
  } catch (error) {
    if (error instanceof PonPonApiError && error.status === 401) {
      return { authRequired: true };
    }
    return {
      authRequired: false,
      error: error instanceof Error ? error.message : "Cannot load flash sale",
    };
  }
}

async function getAccessToken() {
  const cookieStore = await cookies();
  return cookieStore.get("pp_admin_access_token")?.value;
}
