export type NavigationItem = {
  label: string;
  href: string;
};

export const navigationItems: NavigationItem[] = [
  { label: "Anasayfa", href: "/home" },
  { label: "Dining", href: "/home#collections" },
  { label: "Living", href: "/home#collections" },
  { label: "Happy Customers", href: "#" },
  { label: "İletişim", href: "#" },
];
