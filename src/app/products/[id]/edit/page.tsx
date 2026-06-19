import { notFound, redirect } from "next/navigation";
import { ProductEditor } from "@/components/product-editor";
import { getAdminProductGroup } from "@/lib/admin-products";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { authRequired, groupSku, product, variants } =
    await getAdminProductGroup(id);

  if (authRequired) {
    redirect("/login");
  }

  if (!product) notFound();

  return (
    <ProductEditor id={id} groupSku={groupSku} product={product} variants={variants} />
  );
}
