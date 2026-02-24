import { redirect } from "react-router";
import { detectLangFromRequest } from "~/lib/i18n";

export async function loader({ request }: { request: Request }) {
  const lang = detectLangFromRequest(request);
  throw redirect(`/${lang}`);
}

export default function IndexRedirect() {
  return null;
}
