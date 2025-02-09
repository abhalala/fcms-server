import { Router } from "express";
import { prisma } from "../../prisma";
import { generateLabel } from "../lib/labelGenerator";
import { promises as fs } from "fs";
import fetch from "node-fetch";
import path from "path";
const bundleRouter = Router();

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

const filePath: string = path.join(
  __dirname,
  "..",
  "..",
  "..",
  "data",
  "currentBundleNo",
);

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
  const po_no: string = req.body.po_no;
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
  const bundle_number: string = `${[
    prefix_bundle_number[month],
  ]}${currentState}`;
  console.info(`Current State : ${currentState}`);
  console.info(`New bundle    :${bundle_number}`);

  const createdBundle = await prisma.bundle
    .create({
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
    })
    .catch((err: any) => {
      res.send(JSON.stringify({ err }));
    });

  res.send(JSON.stringify(createdBundle));

  let newState: string = `${parseInt(currentState) + 1}`;
  console.info(newState);
  setStateToFile(filePath, newState);
});

bundleRouter.get("/recents", async (_req, res) => {
  const recentBundles = await prisma.bundle.findMany({
    orderBy: {
      created_at: "desc",
    },
  });
  res.json({ recentBundles });
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
    const po_no: string = req.body.po_no;
    const loction: number = parseInt(req.body.location);

    await prisma.bundle
      .update({
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
  const uid = req.params.uid;
  let layout = parseInt(req.params.layout);

  let l = layout;

  if (l == 0) {
    await generateLabel(uid, 0);
    fetch(`http://${process.env.HOST}/bt/printLabel`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ uid: `${uid}.png`, layout: 0 }),
    });
  } else {
    let currBundle;
    currBundle = await prisma.bundle.findUnique({
      where: { uid: uid },
      include: { section: { select: { print_series: true } } },
    });

    if (!currBundle) return res.json({ print: 0 });
    console.log(currBundle.po_no);
    fetch(`http://${process.env.HOST}/bt/printLabel`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        uid: currBundle.uid,
        layout: l,
        weight: `${currBundle.weight.toFixed(3)}`,
        weight_each: `${(currBundle.weight / currBundle.quantity).toPrecision(
          3,
        )}`,
        weight12ft: `${(
          (currBundle.weight / currBundle.quantity / currBundle.length) *
          12
        ).toPrecision(3)}`,
        sr_no: `${currBundle.sr_no}`,
        quantity: currBundle.quantity,
        length: `${currBundle.length.toFixed(3)}`,
        series: currBundle.section.print_series,
        po: `${currBundle.po_no}`,
      }),
    });
  }
  return res.json({ print: 1 });
});

export { bundleRouter };
