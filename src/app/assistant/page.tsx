import type { Metadata } from "next";
import { AssistantChat } from "@/components/AssistantChat";
import { BuyerBottomNav, TopNav } from "@/components/Nav";

export const metadata: Metadata = {
  title: "Ask Thari — handwoven pieces",
  description: "Find a handwoven piece by asking. The assistant searches real listings and never pays on your behalf.",
};

export default function AssistantPage() {
  return (
    <>
      <TopNav />
      <main className="mx-auto max-w-[900px] px-4 pb-[120px] pt-4 md:px-6 md:pt-8">
        <AssistantChat />
      </main>
      <BuyerBottomNav current="/assistant" />
    </>
  );
}
