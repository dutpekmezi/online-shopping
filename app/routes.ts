import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/index.tsx"),
  route("home", "routes/home.tsx"),
  route("shop", "routes/shop.tsx"),
  route("contact-us", "routes/contact-us.tsx"),
  route("shipping-info", "routes/shipping-info.tsx"),
  route("gallery", "routes/gallery.tsx"),
  route("about-us", "routes/about-us.tsx"),
  route("compare-products", "routes/compare-products.tsx"),
] satisfies RouteConfig;
