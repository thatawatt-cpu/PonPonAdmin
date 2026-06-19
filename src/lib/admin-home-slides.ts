import { cookies } from "next/headers";
import { PonPonApiError, ponponApiJson } from "@/lib/ponpon-api";
import type { HomeSlide } from "@/lib/home-slides";

export async function getAdminHomeSlides(): Promise<{
  authRequired: boolean;
  error?: string;
  slides: HomeSlide[];
}> {
  try {
    const token = await getAccessToken();
    const slides = await ponponApiJson<HomeSlide[]>("/api/admin/home-slides", {
      headers: token ? { authorization: `Bearer ${token}` } : undefined,
    });

    return { authRequired: false, slides };
  } catch (error) {
    if (error instanceof PonPonApiError && error.status === 401) {
      return { authRequired: true, slides: [] };
    }

    return {
      authRequired: false,
      error: error instanceof Error ? error.message : "Cannot load home slides",
      slides: fallbackHomeSlides,
    };
  }
}

async function getAccessToken() {
  const cookieStore = await cookies();
  return cookieStore.get("pp_admin_access_token")?.value;
}

const fallbackHomeSlides: HomeSlide[] = [
  {
    id: "mock-slide-1",
    image: "/images/products/milk-tea.png",
    badge: "SALE",
    title: "โปรเด็ดวันนี้ ลดสูงสุด 50%",
    description: "ราคาพิเศษเฉพาะวันนี้",
    linkUrl: "/products",
    ctaLabel: "ช้อปเลย",
    status: 1,
    startsAt: "2026-06-18T00:00:00Z",
    endsAt: "2026-06-30T23:59:00Z",
    sortOrder: 1,
    createdAt: "2026-06-18T00:00:00Z",
    updatedAt: null,
  },
];
