// Run with: bun test src/routes/__tests__/bundle.route.bun.test.ts
// Uses a fake Prisma client and a fake BarTender server; touches no database.
import { describe, expect, test, mock, beforeAll, afterAll, beforeEach } from "bun:test";
import { mkdtempSync, readFileSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import path from "path";

const dir = mkdtempSync(path.join(tmpdir(), "fcms-test-"));
const counterFile = path.join(dir, "currentBundleNo");
process.env.BUNDLE_COUNTER_FILE = counterFile;

let createImpl: (args: any) => Promise<any> = async (args) => ({ uid: "u1", ...args.data });
const calls: any[] = [];
const fakePrisma = {
  bundle: {
    create: (args: any) => {
      calls.push(["create", args]);
      return createImpl(args);
    },
    update: async (args: any) => {
      calls.push(["update", args]);
      return { uid: args.where.uid, ...args.data };
    },
    findUnique: async (args: any) => {
      calls.push(["findUnique", args]);
      if (args.where.uid === "missing") return null;
      return {
        uid: args.where.uid,
        sr_no: "26K1",
        weight: 60,
        quantity: 20,
        length: 16,
        po_no: null,
        section: { print_series: "S" },
      };
    },
    findMany: async (args: any) => {
      calls.push(["findMany", args]);
      return [];
    },
  },
};
mock.module(path.resolve(import.meta.dir, "../../../prisma"), () => ({ prisma: fakePrisma }));

const express = (await import("express")).default;
const { bundleRouter } = await import("../bundle.route");

let app: any;
let base = "";
let bt: any;
let btMode: "ok" | "hang" | "500" = "ok";
const btBodies: any[] = [];

beforeAll(async () => {
  bt = Bun.serve({
    port: 0,
    async fetch(req) {
      btBodies.push(await req.json().catch(() => null));
      if (btMode === "hang") await new Promise((r) => setTimeout(r, 30_000));
      if (btMode === "500") return new Response("boom", { status: 500 });
      return new Response("<ok/>");
    },
  });
  // The route posts to http://${HOST}/bt/printLabel
  process.env.HOST = `127.0.0.1:${bt.port}`;
  const a = express();
  a.use(express.json());
  a.use("/api/bundle", bundleRouter);
  await new Promise<void>((r) => {
    app = a.listen(0, () => r());
  });
  base = `http://127.0.0.1:${app.address().port}/api/bundle`;
});

afterAll(() => {
  app?.close();
  bt?.stop(true);
});

beforeEach(() => {
  calls.length = 0;
  btBodies.length = 0;
  btMode = "ok";
  writeFileSync(counterFile, "41");
  createImpl = async (args) => ({ uid: "u1", ...args.data });
});

const post = (url: string, body: any) =>
  fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

describe("create", () => {
  test("missing P.O. number saves null and does not crash", async () => {
    const res = await post(`${base}/create`, { cutlength: 16, quantity: 20, weight: 60, vs_no: "5531" });
    expect(res.status).toBe(200);
    const created = calls.find((c) => c[0] === "create")[1];
    expect(created.data.po_no).toBeNull();
    expect(readFileSync(counterFile, "utf8")).toBe("42");
  });

  test("blank and lowercase P.O. numbers are normalised", async () => {
    await post(`${base}/create`, { cutlength: 16, quantity: 20, weight: 60, vs_no: "5531", po_no: "   " });
    expect(calls.at(-1)[1].data.po_no).toBeNull();
    await post(`${base}/create`, { cutlength: 16, quantity: 20, weight: 60, vs_no: "5531", po_no: " ab12 " });
    expect(calls.at(-1)[1].data.po_no).toBe("AB12");
  });

  test("a failed save returns 500, keeps the counter, and the server keeps serving", async () => {
    createImpl = async () => {
      throw new Error("Unique constraint failed on sr_no");
    };
    const res = await post(`${base}/create`, { cutlength: 16, quantity: 20, weight: 60, vs_no: "5531", po_no: "1" });
    expect(res.status).toBe(500);
    expect(readFileSync(counterFile, "utf8")).toBe("41");
    const again = await fetch(`${base}/recents`);
    expect(again.status).toBe(200);
  });
});

describe("modify", () => {
  test("missing P.O. number does not crash", async () => {
    const res = await fetch(`${base}/modify/abc`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ cutlength: 16, quantity: 20, weight: 60, vs_no: "5531" }),
    });
    expect(res.status).toBe(200);
    expect(calls.find((c) => c[0] === "update")[1].data.po_no).toBeNull();
  });
});

describe("recents", () => {
  test("is capped at 200 by default and supports search", async () => {
    await fetch(`${base}/recents`);
    expect(calls.at(-1)[1].take).toBe(200);
    await fetch(`${base}/recents?q=26k5`);
    expect(calls.at(-1)[1].where.sr_no.contains).toBe("26k5");
  });
});

describe("print", () => {
  test("reports success when BarTender accepts, and never sends the word null", async () => {
    const res = await (await fetch(`${base}/print/1/abc`)).json();
    expect(res).toEqual({ print: 1 });
    expect(btBodies[0].po).toBe("");
  });

  test("reports failure when BarTender answers 500", async () => {
    btMode = "500";
    const res = await (await fetch(`${base}/print/1/abc`)).json();
    expect(res.print).toBe(2);
    expect(res.error).toContain("500");
  });

  test("reports failure when BarTender is unreachable", async () => {
    const saved = process.env.HOST;
    process.env.HOST = "127.0.0.1:1";
    const res = await (await fetch(`${base}/print/1/abc`)).json();
    process.env.HOST = saved;
    expect(res.print).toBe(2);
  });

  test("unknown bundle still returns print 0", async () => {
    const res = await (await fetch(`${base}/print/1/missing`)).json();
    expect(res).toEqual({ print: 0 });
  });
});
