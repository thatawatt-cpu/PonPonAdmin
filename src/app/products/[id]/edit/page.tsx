import { notFound } from "next/navigation";
import { ProductEditor } from "@/components/product-editor";
import { adminProducts } from "@/lib/admin-data";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = adminProducts.find((item) => item.id === id);

  if (!product) notFound();

  return <ProductEditor product={product} />;
}
