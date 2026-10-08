import products from "@/data/products.json";
import { Product } from "@/types/product";

const items = products as Product[];

export function getProducts() {
  return items;
}

export function getProductBySlug(slug: string) {
  return items.find((product) => product.slug === slug);
}

export function getFeaturedProducts() {
  return items.filter((product) => product.featured);
}

export function getTrendingProducts() {
  return items.filter((product) => product.trending);
}