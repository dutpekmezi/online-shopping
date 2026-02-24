export type Lang = "tr" | "en";

export type Money = {
  amount: number;
  currencyCode: "TRY" | "USD";
};

export type Collection = {
  handle: string;
  title: string;
  description: string;
  image: string;
};

export type Product = {
  handle: string;
  title: string;
  description: string;
  image: string;
  price: Money;
  collectionHandle: string;
};

export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  publishedAt: string;
};
