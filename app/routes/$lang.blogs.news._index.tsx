import { Link } from "react-router";
import { getBlogPosts } from "~/lib/shopApi.server";

export async function loader({ params }: { params: { lang?: string } }) {
  return { lang: params.lang ?? "tr", posts: await getBlogPosts() };
}

export default function BlogIndex({ loaderData }: { loaderData: Awaited<ReturnType<typeof loader>> }) {
  return <div className="space-y-2">{loaderData.posts.map((post) => <Link key={post.slug} to={`/${loaderData.lang}/blogs/news/${post.slug}`}>{post.title}</Link>)}</div>;
}
