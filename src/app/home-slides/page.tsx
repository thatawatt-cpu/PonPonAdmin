import { redirect } from "next/navigation";
import { HomeSlidesManager } from "@/components/home-slides-manager";
import { getAdminHomeSlides } from "@/lib/admin-home-slides";

export default async function HomeSlidesPage() {
  const { authRequired, error, slides } = await getAdminHomeSlides();

  if (authRequired) {
    redirect("/login");
  }

  return <HomeSlidesManager initialError={error} initialSlides={slides} />;
}
