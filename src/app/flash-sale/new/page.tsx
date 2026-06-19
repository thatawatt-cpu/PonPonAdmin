import { redirect } from "next/navigation";
import { FlashSaleEditor } from "@/components/flash-sale-editor";
import { getAdminProducts } from "@/lib/admin-products";

export default async function NewFlashSalePage() {
  const { authRequired, products } = await getAdminProducts();

  if (authRequired) {
    redirect("/login");
  }

  return <FlashSaleEditor products={products} />;
}
