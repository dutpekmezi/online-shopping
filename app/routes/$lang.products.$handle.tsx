import { AddToCart } from "~/components/shop/AddToCart";
import { ProductGallery } from "~/components/shop/ProductGallery";
import { ProductInfo } from "~/components/shop/ProductInfo";
import { getProductByHandle } from "~/lib/shopApi.server";

export async function loader({ params }: { params: { handle?: string } }) {
  return { product: await getProductByHandle(params.handle ?? "") };
}

export default function ProductDetail({ loaderData }: { loaderData: Awaited<ReturnType<typeof loader>> }) {
  if (!loaderData.product) return <p>Product not found.</p>;
  return <div className="grid gap-6 md:grid-cols-2"><ProductGallery image={loaderData.product.image} /><div className="space-y-4"><ProductInfo title={loaderData.product.title} description={loaderData.product.description} /><AddToCart /></div></div>;
}
