import { createMcpHandler } from "mcp-handler";
import {
  TOOL_DESCRIPTIONS,
  createCheckout,
  createCheckoutSchema,
  getListing,
  getListingSchema,
  searchListings,
  searchListingsSchema,
} from "@/lib/tools";

/**
 * BUILD_PLAN 12.2: the same three tools over MCP Streamable HTTP, so an
 * outside agent — Claude, or anything else speaking MCP — can shop Thari.
 *
 * The important line is in create_checkout: it returns a link, not a receipt.
 * An agent can find a piece and prepare the payment; a human approves it in
 * PayPal. That boundary is the whole point of the design, so the tool says so
 * in its own output rather than relying on the caller to be careful.
 */
const handler = createMcpHandler((server) => {
  // registerTool, not the deprecated .tool(), on MCP SDK 1.32.
  server.registerTool(
    "search_listings",
    { description: TOOL_DESCRIPTIONS.search_listings, inputSchema: searchListingsSchema.shape },
    async (args) => {
      const results = await searchListings(args);
      return {
        content: [
          {
            type: "text" as const,
            text:
              results.length === 0
                ? "No pieces matched."
                : JSON.stringify({ count: results.length, results }, null, 2),
          },
        ],
      };
    },
  );

  server.registerTool(
    "get_listing",
    { description: TOOL_DESCRIPTIONS.get_listing, inputSchema: getListingSchema.shape },
    async (args) => {
      const listing = await getListing(args);
      return {
        content: [{ type: "text" as const, text: listing ? JSON.stringify(listing, null, 2) : "No such piece." }],
      };
    },
  );

  server.registerTool(
    "create_checkout",
    { description: TOOL_DESCRIPTIONS.create_checkout, inputSchema: createCheckoutSchema.shape },
    async (args) => {
      const result = await createCheckout(args, "MCP");
      if (!result.ok) return { content: [{ type: "text" as const, text: result.error }], isError: true };
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                ...result,
                paid: false,
                whatHappensNext:
                  "Give the buyer the approveUrl. Nothing is charged until they approve it in PayPal themselves.",
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );
});

export { handler as GET, handler as POST, handler as DELETE };
