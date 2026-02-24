export async function loader({ request }: { request: Request }) {
  const query = new URL(request.url).searchParams.get("q") ?? "";
  return { query };
}

export default function SearchPage({ loaderData }: { loaderData: Awaited<ReturnType<typeof loader>> }) {
  return <div>Search query: {loaderData.query || "(empty)"}</div>;
}
