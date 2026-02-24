import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/_index.tsx"),
  route(":lang", "routes/$lang.tsx", [
    index("routes/$lang._index.tsx"),
    route("collections/:handle", "routes/$lang.collections.$handle.tsx"),
    route("products/:handle", "routes/$lang.products.$handle.tsx"),
    route("pages/contact", "routes/$lang.pages.contact.tsx"),
    route("pages/happy-customers", "routes/$lang.pages.happy-customers.tsx"),
    route("blogs/news", "routes/$lang.blogs.news._index.tsx"),
    route("blogs/news/:slug", "routes/$lang.blogs.news.$slug.tsx"),
    route("search", "routes/$lang.search.tsx"),
    route("account/login", "routes/$lang.account.login.tsx"),
    route("cart", "routes/$lang.cart.tsx"),
  ]),
] satisfies RouteConfig;
