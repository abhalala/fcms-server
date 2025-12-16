import { Router } from "express";
import { prisma } from "../../prisma";

const variantRouter = Router();

// Default range value for malformed/empty range strings
const DEFAULT_RANGE = '{"start":0,"end":0}';

/**
 * Normalizes a range string to ensure it's valid JSON.
 * If the range is empty, falsy, or invalid JSON, returns the default range.
 * Logs when normalization occurs.
 */
function normalizeRange(range: string | null | undefined, variantId: string): string {
  // Check if range is falsy or empty
  if (!range || range.trim() === '') {
    console.log(`[Variant API] Normalizing empty range for variant ${variantId} - using default range`);
    return DEFAULT_RANGE;
  }

  // Try to parse the range to validate it's proper JSON
  try {
    JSON.parse(range);
    return range; // Valid JSON, return as-is
  } catch (error) {
    console.log(`[Variant API] Normalizing invalid range for variant ${variantId} - using default range. Original value: "${range}"`);
    return DEFAULT_RANGE;
  }
}

// variantRouter.get("/:sid", async (req, res) => {
//   const sid = req.params.sid;
//   await prisma.variant
//     .findUnique({
//       where: {
//         s_no: sid,
//       },
//     })
//     .then(
//       (variant) => {
//         res.json(variant);
//       },
//       (reject) => {
//         res.json({ rejection: reject });
//       }
//     )
//     .catch((err) => {
//       res.json({ err });
//     });
// });

variantRouter.get("/all", async (req, res) => {
  const variants = await prisma.variant.findMany({
    select: {
      s_no: true,
	  series: true,
	  range: true,
    },
  });
  
  // Normalize range values to ensure they're always safe to parse
  const normalizedVariants = variants.map(variant => ({
    ...variant,
    range: normalizeRange(variant.range, variant.s_no)
  }));
  
  res.send({ variants: normalizedVariants });
});

export { variantRouter };
