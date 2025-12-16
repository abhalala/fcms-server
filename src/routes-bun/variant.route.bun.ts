/**
 * Bun-optimized variant routes
 */

import { prisma } from "../../prisma";
import { jsonResponse } from "./helpers";

const DEFAULT_RANGE = '{"start":0,"end":0}';

function normalizeRange(range: string | null | undefined, variantId: string): string {
  if (!range || range.trim() === '') {
    console.log(`[Variant API] Normalizing empty range for variant ${variantId}`);
    return DEFAULT_RANGE;
  }

  try {
    JSON.parse(range);
    return range;
  } catch (error) {
    console.log(`[Variant API] Normalizing invalid range for variant ${variantId}`);
    return DEFAULT_RANGE;
  }
}

export async function handleVariantRoutes(
  subPath: string,
  method: string,
  query: Record<string, string>,
): Promise<Response> {
  // GET /api/variant/all
  if (subPath === "/all" && method === "GET") {
    try {
      const variants = await prisma.variant.findMany({
        select: {
          s_no: true,
          series: true,
          range: true,
        },
      });

      const normalizedVariants = variants.map((variant) => ({
        ...variant,
        range: normalizeRange(variant.range, variant.s_no),
      }));

      return jsonResponse({ variants: normalizedVariants });
    } catch (error: any) {
      console.error("Error fetching variants:", error);
      return jsonResponse({ error: error.message }, 500);
    }
  }

  return jsonResponse({ error: "Not Found" }, 404);
}
