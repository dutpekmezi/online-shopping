import { SiteLayout } from "~/components/layout/SiteLayout";
import { redirect } from "react-router";
import { isValidLang } from "~/lib/i18n";

export async function loader({ params }: { params: { lang?: string } }) {
  if (!params.lang || !isValidLang(params.lang)) throw redirect("/tr");
  return { lang: params.lang };
}

export default function LangLayout({ loaderData }: { loaderData: Awaited<ReturnType<typeof loader>> }) {
  return <SiteLayout lang={loaderData.lang} />;
}
