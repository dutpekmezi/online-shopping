export type NavigationItem = {
  label: string;
  href: string;
};

export const navigationItems: NavigationItem[] = [
  { label: "Anasayfa", href: "/home" },
  { label: "Dining", href: "/collections?group=dining" },
  { label: "Living", href: "/collections?group=living" },
  { label: "Happy Customers", href: "#" },
  { label: "İletişim", href: "#" },
];
