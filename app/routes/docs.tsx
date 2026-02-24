import type { Route } from "./+types/docs";

import PageTemplate, {
  links as pageTemplateLinks,
} from "~/components/docs/pageTemplate/pageTemplate";

export const links: Route.LinksFunction = () => [...pageTemplateLinks()];

export default function DocsRoute() {
  return (
    <PageTemplate>
      <h1>Docs</h1>
      <h2 id="introduction">Introduction</h2>
      <p>This page demonstrates route-level CSS aggregation with Remix links().</p>

      <h2 id="structure">Structure</h2>
      <p>Each component owns its CSS file and exposes a links() function.</p>

      <h2 id="loading">Loading</h2>
      <p>
        The route collects component links and returns them so styles are rendered
        as link tags in the document head.
      </p>
    </PageTemplate>
  );
}
