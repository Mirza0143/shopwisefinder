"use client";

import { Send } from "lucide-react";
import { useSupportLinks } from "@/components/SupportLinksProvider";

export default function FloatingTelegramSupport() {
  const { telegramUrl } = useSupportLinks();
  if (!telegramUrl) return null;
  return (
    <a
      href={telegramUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with ShopWiseFinder support on Telegram"
      title="Telegram support"
      className="fixed bottom-5 left-5 z-[80] inline-flex h-14 w-14 items-center justify-center rounded-full bg-sky-500 text-white shadow-xl shadow-sky-900/25 ring-1 ring-white/50 transition duration-200 hover:-translate-y-1 hover:bg-sky-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-300"
    >
      <Send size={23} strokeWidth={2.3} aria-hidden="true" />
      <span className="sr-only">Telegram support</span>
    </a>
  );
}
