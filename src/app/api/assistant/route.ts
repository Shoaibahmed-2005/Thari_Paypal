import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { env, requireEnv } from "@/lib/env";
import { getCurrentUser } from "@/lib/session";
import {
  TOOL_DESCRIPTIONS,
  createCheckout,
  getListing,
  searchListings,
  type CheckoutResult,
  type ToolListing,
} from "@/lib/tools";

/**
 * BUILD_PLAN 12.1: the buyer assistant. Gemini with function calling over the
 * same three tools MCP exposes.
 *
 * The assistant can find pieces and prepare a payment. It cannot pay — only a
 * human approves, in PayPal.
 */

const Body = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "model"]), text: z.string() }))
    .max(20),
});

const SYSTEM = [
  "You help buyers find authentic handwoven pieces on Thari, a marketplace where Indian handloom weavers sell directly to buyers abroad.",
  "Only recommend items returned by the tools. Never invent a piece, a price or a certification.",
  "Always mention the weaver's name and whether the piece is verified handwoven. 'Verified handwoven' means a weavers' co-op watched footage of the piece on the loom and vouched for it; say so plainly if asked.",
  "Prices are in US dollars and shipping is charged separately.",
  "Before creating a checkout, confirm the piece and the total with the buyer.",
  "You cannot complete a payment. create_checkout only prepares one; the buyer approves it themselves in PayPal. Say this rather than implying you have paid.",
  "Be warm and brief. No superlatives, no emoji.",
].join("\n");

/** Gemini function declarations, written by hand to keep the shapes small. */
const FUNCTIONS = [
  {
    name: "search_listings",
    description: TOOL_DESCRIPTIONS.search_listings,
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "free text: colour, weave, motif, weaver name" },
        fabric: { type: "string", description: "silk, cotton, silk-cotton" },
        color: { type: "string" },
        maxPriceUsd: { type: "number" },
        category: { type: "string", enum: ["saree", "dupatta", "stole", "fabric"] },
        verifiedOnly: { type: "boolean" },
      },
    },
  },
  {
    name: "get_listing",
    description: TOOL_DESCRIPTIONS.get_listing,
    parameters: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
  },
  {
    name: "create_checkout",
    description: TOOL_DESCRIPTIONS.create_checkout,
    parameters: { type: "object", properties: { listingId: { type: "string" } }, required: ["listingId"] },
  },
];

type Part = { text?: string; functionCall?: { name: string; args: Record<string, unknown> }; functionResponse?: unknown };
type Content = { role: string; parts: Part[] };

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad request" }, { status: 400 });

  if (env.AI_MODE === "mock" || !env.GEMINI_API_KEY) {
    return NextResponse.json(mockReply(parsed.data.messages.at(-1)?.text ?? ""));
  }

  const session = await getCurrentUser();
  const buyerId = session?.role === "BUYER" ? session.userId : undefined;

  const contents: Content[] = parsed.data.messages.map((m) => ({ role: m.role, parts: [{ text: m.text }] }));
  const model = requireEnv("GEMINI_MODEL");
  const apiKey = requireEnv("GEMINI_API_KEY");

  let listings: ToolListing[] = [];
  let checkout: CheckoutResult | null = null;

  // Up to three rounds: search, maybe fetch details, maybe prepare checkout.
  for (let round = 0; round < 3; round++) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "x-goog-api-key": apiKey, "content-type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents,
        tools: [{ functionDeclarations: FUNCTIONS }],
      }),
      cache: "no-store",
    });

    const body = (await res.json()) as {
      candidates?: { content?: Content }[];
      error?: { message?: string };
    };
    if (!res.ok) {
      console.error("[thari] assistant failed", body.error?.message);
      return NextResponse.json({ error: "The assistant is unavailable just now." }, { status: 502 });
    }

    const content = body.candidates?.[0]?.content;
    const calls = (content?.parts ?? []).filter((p) => p.functionCall).map((p) => p.functionCall!);

    if (calls.length === 0) {
      const text = (content?.parts ?? []).map((p) => p.text ?? "").join("").trim();
      return NextResponse.json({ text: text || "I couldn't find anything for that.", listings, checkout });
    }

    contents.push({ role: "model", parts: content?.parts ?? [] });

    const responses: Part[] = [];
    for (const call of calls) {
      const result = await runTool(call.name, call.args, buyerId);
      if (call.name === "search_listings") listings = (result as ToolListing[]) ?? [];
      if (call.name === "create_checkout") checkout = result as CheckoutResult;
      responses.push({ functionResponse: { name: call.name, response: { result } } } as Part);
    }
    contents.push({ role: "user", parts: responses });
  }

  return NextResponse.json({
    text: "I found these — tell me which one you'd like.",
    listings,
    checkout,
  });
}

async function runTool(name: string, args: Record<string, unknown>, buyerId?: string): Promise<unknown> {
  switch (name) {
    case "search_listings":
      return searchListings(args as Parameters<typeof searchListings>[0]);
    case "get_listing":
      return getListing(args as Parameters<typeof getListing>[0]);
    case "create_checkout":
      return createCheckout(args as Parameters<typeof createCheckout>[0], "ASSISTANT", buyerId);
    default:
      return { error: `unknown tool ${name}` };
  }
}

/** Mock mode: still really searches, so the UI is honest without a key. */
async function mockReply(question: string) {
  const listings = await searchListings({ query: question.split(/\s+/).slice(0, 3).join(" ") });
  return {
    text: listings.length
      ? `Here are some pieces that match. ${listings[0].verified ? `${listings[0].title} is verified handwoven — the co-op confirmed it.` : ""}`.trim()
      : "I couldn't find anything for that. Try a colour, a fabric, or a weave like Kanchipuram.",
    listings,
    checkout: null,
    mock: true,
  };
}
