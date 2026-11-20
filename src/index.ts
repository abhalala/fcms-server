import express from "express";
import { bundleRouter, variantRouter, moveRouter, dieMutationRouter } from "./routes";
import cors from "cors";
import { promises as fs } from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

// A single bad request must never take the whole plant system down.
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
});

const app = express();
const PORT = 3000;

app.use(express.json({}));
app.use(
  express.urlencoded({
    extended: true,
  }),
);

app.use(
  cors({
    origin: "*",
  }),
);

app.get("/api", (_req, res) => {
  res.json({ status: 200 });
  console.log("tiged");
});

app.use("/api/bundle", bundleRouter);
app.use("/api/variant", variantRouter);
app.use("/api", moveRouter);
app.use("/api/die-mutation", dieMutationRouter);

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Request failed:", err?.message ?? err);
  if (!res.headersSent) res.status(500).json({ err: "server_error" });
});

const initializeBundleNumber = async () => {
  const bundleFilePath = path.join(
    __dirname,
    "..",
    "..",
    "data",
    "currentBundleNo",
  );
  try {
    await fs.access(bundleFilePath);
  } catch {
    // File doesn't exist, create it with initial value
    await fs
      .writeFile(bundleFilePath, "1", { encoding: "utf8" })
      .catch((err) => console.error(err));
    console.log("Initialized bundle number file with value: 1");
  }
};

const server = app.listen(PORT, async () => {
  await initializeBundleNumber();
  console.log(`🚀 Server ready at: http://${process.env.HOST}:${PORT}`);
});
