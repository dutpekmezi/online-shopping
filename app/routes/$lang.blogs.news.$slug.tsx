import { getBlogPostBySlug } from "~/lib/shopApi.server";

export async function loader({ params }: { params: { slug?: string } }) {
  return { post: await getBlogPostBySlug(params.slug ?? "") };
}

export default function BlogDetail({ loaderData }: { loaderData: Awaited<ReturnType<typeof loader>> }) {
  if (!loaderData.post) return <p>Post not found.</p>;
  return <article className="space-y-2"><h1 className="text-2xl">{loaderData.post.title}</h1><p>{loaderData.post.content}</p></article>;
}
