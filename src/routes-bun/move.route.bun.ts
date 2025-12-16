/**
 * Bun-optimized move routes
 */

import { prisma } from "../../prisma";
import { jsonResponse } from "./helpers";
import { Bundle } from "@prisma/client";

function parseRange(range: string): {
  isValid: boolean;
  numbers: string[];
  message?: string;
} {
  const result = range.split(",");
  return { isValid: true, numbers: result };
}

export async function handleMoveRoutes(
  pathname: string,
  method: string,
  body: any,
): Promise<Response> {
  // POST /api/move
  if (pathname === "/api/move" && method === "POST") {
    console.clear();
    const moveData: string = body?.moveData;
    const ref: string = body?.ref;
    let errored: string[] = [];

    const { isValid, message, numbers } = parseRange(moveData);
    
    if (!isValid) {
      return jsonResponse({ done: false, message });
    }

    // Use Promise.all for parallel processing (Bun optimization)
    const promises = numbers.map(async (n) => {
      try {
        const bundleCheck = await prisma.soldBundle.findUnique({
          where: { sr_no: n },
        });

        if (bundleCheck == null) {
          let foundBundle = await prisma.bundle.findUnique({
            where: { sr_no: n },
          });

          let movedBundle: Bundle;
          if (foundBundle !== null) {
            foundBundle.status = "SOLD";

            movedBundle = await prisma.soldBundle.create({
              data: {
                reference: ref,
                ...foundBundle,
              },
            });
            console.log("MOVED TO SOLD: " + movedBundle.sr_no);

            if (movedBundle !== undefined || movedBundle !== null) {
              const delBundle = await prisma.bundle.delete({
                where: { uid: movedBundle.uid },
              });

              console.log("DELETED FROM BUNDLES: " + delBundle.sr_no);
            }
          }
        } else {
          const oBundleCheck = await prisma.bundle.findUnique({
            where: { sr_no: bundleCheck.sr_no },
          });

          if (oBundleCheck === null) {
            console.log("BUNDLE ALREADY MOVED TO SOLD: " + bundleCheck.sr_no);
          } else {
            const delBundle = await prisma.bundle.delete({
              where: { uid: oBundleCheck.uid },
            });
            console.log(
              "BUNDLE ALREADY MOVED TO SOLD [DELETE GHOST]: " + delBundle.sr_no,
            );
          }
        }
      } catch (err) {
        errored.push(n);
      }
    });

    await Promise.all(promises);
    
    console.log(`Total errored bundles: ${errored.length}`);
    console.log(errored);

    return jsonResponse({ done: true });
  }

  return jsonResponse({ error: "Not Found" }, 404);
}
