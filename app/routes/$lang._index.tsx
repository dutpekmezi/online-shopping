import { BlogPreview } from "~/components/home/BlogPreview";
import { BestSellers } from "~/components/home/BestSellers";
import { CollectionsGrid } from "~/components/home/CollectionsGrid";
import { EmailSubscribe } from "~/components/home/EmailSubscribe";
import { Hero } from "~/components/home/Hero";
import { OurStoryVideo } from "~/components/home/OurStoryVideo";
import { getBlogPosts, getCollections } from "~/lib/shopApi.server";
import type { Lang } from "~/lib/types";

export async function loader({ params }: { params: { lang?: string } }) {
  const lang = (params.lang ?? "tr") as Lang;
  const [collections, posts] = await Promise.all([getCollections(), getBlogPosts()]);
  return { lang, collections, posts };
}

export default function LangHome({ loaderData }: { loaderData: Awaited<ReturnType<typeof loader>> }) {
  return <div className="space-y-6"><Hero /><CollectionsGrid lang={loaderData.lang} collections={loaderData.collections} /><BestSellers /><OurStoryVideo /><EmailSubscribe /><BlogPreview lang={loaderData.lang} posts={loaderData.posts} /></div>;
}
