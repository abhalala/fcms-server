/**
 * Bun-optimized bundle routes
 */

import { prisma } from "../../prisma";
import { jsonResponse, getStateFromFile, setStateToFile } from "./helpers";
import { generateLabel } from "../lib/labelGenerator";

export async function handleBundleRoutes(
  subPath: string,
  method: string,
  query: Record<string, string>,
  body: any,
): Promise<Response> {
  // GET /api/bundle/current-number
  if (subPath === "/current-number" && method === "GET") {
    try {
      const currentState = await getStateFromFile();
      return jsonResponse({ currentNumber: currentState });
    } catch (error) {
      return jsonResponse({ error: "Failed to read bundle number" }, 500);
    }
  }

  // POST /api/bundle/set-number
  if (subPath === "/set-number" && method === "POST") {
    try {
      const newNumber = body?.number;
      if (!newNumber || isNaN(parseInt(newNumber))) {
        return jsonResponse({ error: "Invalid bundle number" }, 400);
      }

      await setStateToFile(newNumber.toString());
      return jsonResponse({ success: true, newNumber });
    } catch (error) {
      return jsonResponse({ error: "Failed to update bundle number" }, 500);
    }
  }

  // POST /api/bundle/create
  if (subPath === "/create" && method === "POST") {
    try {
      const length: number = parseFloat(body.cutlength);
      const quantity: number = parseInt(body.quantity);
      const weight: number = parseFloat(body.weight);
      const cast_id: string = body.cast_id;
      const vs_no: string = body.vs_no;
      const po_no: string = body.po_no;
      const loction: number = parseInt(body.location);

      // BUNDLE NUMBER LOGIC
      const d = new Date();
      let currentState = await getStateFromFile();
      let month = d.getMonth();
      const prefix_bundle_number: string[] = [
        "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L",
      ];
      const twoDigitYear = String(new Date().getFullYear() % 100).padStart(2, "0");
      const bundle_number: string = `${twoDigitYear}${[prefix_bundle_number[month]]}${currentState}`;
      
      console.info(`Current State : ${currentState}`);
      console.info(`New bundle    :${bundle_number}`);

      const createdBundle = await prisma.bundle.create({
        data: {
          sr_no: bundle_number,
          length,
          quantity,
          weight,
          vs_no,
          cast_id,
          po_no: po_no.toUpperCase(),
          loction,
        },
      });

      let newState: string = `${parseInt(currentState) + 1}`;
      console.info(newState);
      await setStateToFile(newState);

      return jsonResponse(createdBundle);
    } catch (err: any) {
      return jsonResponse({ err: err.message }, 500);
    }
  }

  // GET /api/bundle/recents
  if (subPath === "/recents" && method === "GET") {
    try {
      const recentBundles = await prisma.bundle.findMany({
        orderBy: { created_at: "desc" },
      });
      return jsonResponse({ recentBundles });
    } catch (error: any) {
      return jsonResponse({ error: error.message }, 500);
    }
  }

  // GET /api/bundle/:uid
  if (subPath.match(/^\/[a-zA-Z0-9_-]+$/) && method === "GET") {
    try {
      const uid = subPath.substring(1);
      const bundle = await prisma.bundle.findUnique({
        where: { uid },
        include: { section: {} },
      });

      if (!bundle) {
        return jsonResponse({ error: "Bundle not found" }, 404);
      }

      return jsonResponse(bundle);
    } catch (err: any) {
      return jsonResponse({ err: err.message }, 500);
    }
  }

  // PUT /api/bundle/modify/:uid
  if (subPath.startsWith("/modify/") && method === "PUT") {
    try {
      const uid = subPath.replace("/modify/", "");

      const selectedBundle = await prisma.bundle.findUnique({
        where: { uid },
      });

      if (!selectedBundle) {
        return jsonResponse({ status: 404, err: "not_found" }, 404);
      }

      const length: number = parseFloat(body.cutlength);
      const quantity: number = parseInt(body.quantity);
      const weight: number = parseFloat(body.weight);
      const cast_id: string = body.cast_id;
      const vs_no: string = body.vs_no;
      const po_no: string = body.po_no;
      const loction: number = parseInt(body.location);

      const modifiedBundle = await prisma.bundle.update({
        data: {
          length,
          quantity,
          weight,
          vs_no,
          cast_id,
          po_no: po_no.toUpperCase(),
          loction,
        },
        where: { uid },
      });

      return jsonResponse(modifiedBundle);
    } catch (err: any) {
      return jsonResponse({ err: err.message }, 500);
    }
  }

  // GET /api/bundle/print/:layout/:uid
  if (subPath.match(/^\/print\/\d+\/[a-zA-Z0-9_-]+$/) && method === "GET") {
    try {
      const parts = subPath.split("/");
      const layout = parseInt(parts[2]);
      const uid = parts[3];

      if (layout === 0) {
        await generateLabel(uid, 0);
        // Use Bun's fetch (optimized) - fire and forget with error handling
        fetch(`http://${process.env.HOST}/bt/printLabel`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uid: `${uid}.png`, layout: 0 }),
        }).catch((err) => console.error("Print label request failed:", err));
      } else {
        let currBundle = await prisma.bundle.findUnique({
          where: { uid: uid },
          include: { section: { select: { print_series: true } } },
        });

        if (!currBundle) {
          return jsonResponse({ print: 0 });
        }

        // Fire and forget print request with error handling
        fetch(`http://${process.env.HOST}/bt/printLabel`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uid: currBundle.uid,
            layout: layout,
            weight: `${currBundle.weight.toFixed(3)}`,
            weight_each: `${(currBundle.weight / currBundle.quantity).toPrecision(3)}`,
            weight12ft: `${((currBundle.weight / currBundle.quantity / currBundle.length) * 12).toPrecision(3)}`,
            sr_no: `${currBundle.sr_no}`,
            quantity: currBundle.quantity,
            length: `${currBundle.length.toFixed(3)}`,
            series: currBundle.section.print_series,
            po: `${currBundle.po_no}`,
          }),
        }).catch((err) => console.error("Print label request failed:", err));
      }

      return jsonResponse({ print: 1 });
    } catch (error: any) {
      return jsonResponse({ error: error.message }, 500);
    }
  }

  return jsonResponse({ error: "Not Found" }, 404);
}
