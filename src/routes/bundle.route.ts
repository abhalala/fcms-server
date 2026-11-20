import { Router } from "express";
import { prisma } from "../../prisma";
import { generateLabel } from "../lib/labelGenerator";
import { promises as fs } from "fs";
import fetch from "node-fetch";
import path from "path";
const bundleRouter = Router();

// An empty or missing P.O. number used to crash the whole server
// (calling toUpperCase on undefined). Normalise it once, everywhere.
export function normalizePo(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text === "" ? null : text.toUpperCase();
}

const BT_TIMEOUT_MS = 20_000;

// Sends one job to the BarTender integration and reports whether BarTender
// accepted it. Never throws.
async function sendToBarTender(body: unknown): Promise<{ ok: boolean; error?: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), BT_TIMEOUT_MS);
  try {
    const res = await fetch(`http://${process.env.HOST}/bt/printLabel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal as any,
    });
    const text = await res.text().catch(() => "");
    if (!res.ok) {
      console.error(`BarTender HTTP ${res.status}: ${text.slice(0, 300)}`);
      return { ok: false, error: `Print server answered ${res.status}` };
    }
    return { ok: true };
  } catch (err: any) {
    const timedOut = err?.name === "AbortError";
    console.error(`BarTender ${timedOut ? "timeout" : "error"}:`, err?.message ?? err);
    return {
      ok: false,
      error: timedOut ? "Print server did not answer in 20 seconds" : "Could not reach the print server",
    };
  } finally {
    clearTimeout(timer);
  }
}

async function getStateFromFile(filePath: string): Promise<string> {
  try {
    const data = await fs.readFile(filePath, { encoding: "utf8" });
    return data as string;
  } catch (error) {
    console.error("Failed to read from file:", error);
    return ""; // or throw error
  }
}

async function setStateToFile(
  filePath: string,
  newState: string,
): Promise<void> {
  try {
    await fs.writeFile(filePath, newState, { encoding: "utf8" });
  } catch (error) {
    console.error("Failed to write to file:", error);
  }
}

const filePath: string =
  process.env.BUNDLE_COUNTER_FILE ||
  path.join(__dirname, "..", "..", "..", "data", "currentBundleNo");

bundleRouter.get("/current-number", async (_req, res) => {
  try {
    const currentState = await getStateFromFile(filePath);
    res.json({ currentNumber: currentState });
  } catch (error) {
    res.status(500).json({ error: "Failed to read bundle number" });
  }
});

bundleRouter.post("/set-number", async (req, res) => {
  try {
    const newNumber = req.body.number;
    if (!newNumber || isNaN(parseInt(newNumber))) {
      return res.status(400).json({ error: "Invalid bundle number" });
    }

    await setStateToFile(filePath, newNumber.toString());
    res.json({ success: true, newNumber });
  } catch (error) {
    res.status(500).json({ error: "Failed to update bundle number" });
  }
});

bundleRouter.post("/create", async (req, res) => {
  const length: number = parseFloat(req.body.cutlength);
  const quantity: number = parseInt(req.body.quantity);
  const weight: number = parseFloat(req.body.weight);
  const cast_id: string = req.body.cast_id;
  const vs_no: string = req.body.vs_no;
  const po_no = normalizePo(req.body.po_no);
  const loction: number = parseInt(req.body.location);
  // BUNDLE NUMBER LOGIC
  const d = new Date();
  let currentState = await getStateFromFile(filePath);
  let month = d.getMonth();
  const prefix_bundle_number: string[] = [
    "A",
    "B",
    "C",
    "D",
    "E",
    "F",
    "G",
    "H",
    "I",
    "J",
    "K",
    "L",
  ];
  const twoDigitYear = String(new Date().getFullYear() % 100).padStart(2, '0');
  const bundle_number: string = `${twoDigitYear}${[
    prefix_bundle_number[month],
  ]}${currentState}`;
  console.info(`Current State : ${currentState}`);
  console.info(`New bundle    :${bundle_number}`);

  try {
    const createdBundle = await prisma.bundle.create({
      data: {
        sr_no: bundle_number,
        length,
        quantity,
        weight,
        vs_no,
        cast_id,
        po_no,
        loction,
      },
    });

    // Only move the counter when the bundle was really saved.
    const newState: string = `${parseInt(currentState) + 1}`;
    console.info(newState);
    await setStateToFile(filePath, newState);

    res.send(JSON.stringify(createdBundle));
  } catch (err: any) {
    console.error("Bundle create failed:", err?.message ?? err);
    res.status(500).json({ err: "create_failed", message: err?.message ?? String(err) });
  }
});

// Used to return every bundle ever made (600 KB+, growing), which made the
// phones slow. Now: the latest 200, or a bundle-number search.
bundleRouter.get("/recents", async (req, res) => {
  try {
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const take = Math.min(Math.max(parseInt(String(req.query.take ?? "200")) || 200, 1), 1000);
    const recentBundles = await prisma.bundle.findMany({
      where: q ? { sr_no: { contains: q, mode: "insensitive" } } : undefined,
      orderBy: { created_at: "desc" },
      take,
    });
    res.json({ recentBundles });
  } catch (err: any) {
    console.error("Recents failed:", err?.message ?? err);
    res.status(500).json({ err: "recents_failed" });
  }
});

bundleRouter.get("/label", () => {});

bundleRouter.get("/:uid", async (req, res) => {
  const uid = req.params.uid;

  await prisma.bundle
    .findUnique({
      where: {
        uid,
      },
      include: {
        section: {},
      },
    })
    .then(
      (bundle: any) => {
        res.json(bundle);
      },
      (reject: any) => {
        res.json({ rejection: reject });
      },
    )
    .catch((err: any) => {
      res.json({ err });
    });
});

bundleRouter.put("/modify/:uid", async (req, res) => {
  const uid = req.params.uid;

  const selectedBundle = await prisma.bundle.findUnique({
    where: {
      uid,
    },
  });

  if (!selectedBundle) {
    res.json({ status: 404, err: "not_found" });
  } else {
    console.log(req.body.cutlength);
    console.log(parseFloat(req.body.cutlength));

    const length: number = parseFloat(req.body.cutlength);
    const quantity: number = parseInt(req.body.quantity);
    const weight: number = parseFloat(req.body.weight);
    const cast_id: string = req.body.cast_id;
    const vs_no: string = req.body.vs_no;
    const po_no = normalizePo(req.body.po_no);
    const loction: number = parseInt(req.body.location);

    await prisma.bundle
      .update({
        data: {
          length,
          quantity,
          weight,
          vs_no,
          cast_id,
          po_no,
          loction,
        },
        where: { uid },
      })
      .then(
        (modifiedBundle: any) => {
          res.json(modifiedBundle);
        },
        (reject: any) => {
          res.json({ rejection: reject });
        },
      )
      .catch((err: any) => {
        res.json({ err });
      });
  }
});

bundleRouter.get("/print/:layout/:uid", async (req, res) => {
  try {
    const uid = req.params.uid;
    const l = parseInt(req.params.layout);
    let result: { ok: boolean; error?: string };

    if (l == 0) {
      await generateLabel(uid, 0);
      result = await sendToBarTender({ uid: `${uid}.png`, layout: 0 });
    } else {
      const currBundle = await prisma.bundle.findUnique({
        where: { uid: uid },
        include: { section: { select: { print_series: true } } },
      });

      if (!currBundle) return res.json({ print: 0 });
      console.log(currBundle.po_no);
      result = await sendToBarTender({
        uid: currBundle.uid,
        layout: l,
        weight: `${currBundle.weight.toFixed(3)}`,
        weight_each: `${(currBundle.weight / currBundle.quantity).toPrecision(3)}`,
        weight12ft: `${(
          (currBundle.weight / currBundle.quantity / currBundle.length) *
          12
        ).toPrecision(3)}`,
        sr_no: `${currBundle.sr_no}`,
        quantity: currBundle.quantity,
        length: `${currBundle.length.toFixed(3)}`,
        series: currBundle.section.print_series,
        po: currBundle.po_no ?? "",
      });
    }
    return res.json(result.ok ? { print: 1 } : { print: 2, error: result.error });
  } catch (err: any) {
    console.error("Print failed:", err?.message ?? err);
    return res.json({ print: 2, error: "Print failed on the server" });
  }
});

export { bundleRouter };
