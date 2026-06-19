import { notFound, redirect } from "next/navigation";
import { FlashSaleEditor, type FlashSaleInitialData } from "@/components/flash-sale-editor";
import { getAdminFlashSale } from "@/lib/admin-flash-sales";
import { getAdminProducts } from "@/lib/admin-products";

export default async function EditFlashSalePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [{ authRequired: authA, flashSale }, { authRequired: authB, products }] =
    await Promise.all([getAdminFlashSale(id), getAdminProducts()]);

  if (authA || authB) redirect("/login");
  if (!flashSale) notFound();

  const initialData: FlashSaleInitialData = {
    id: flashSale.id,
    name: flashSale.name,
    startDate: flashSale.startDate,
    endDate: flashSale.endDate,
    slots: flashSale.slots,
    products: flashSale.products.map((p) => ({
      id: p.productId,
      name: p.productName,
      image: p.imageUrl,
      originalPrice: p.originalPrice,
      salePrice: p.salePrice,
      zortSku: "",
    })),
  };

  return <FlashSaleEditor products={products} initialData={initialData} />;
}
