import express from "express";
import { PrismaClient } from "@prisma/client";
import { bundleRouter, variantRouter, moveRouter } from "./routes";
import cors from "cors";
import { promises as fs } from "fs";
import path from "path";

const prisma = new PrismaClient();
const app = express();
const PORT = 3000;

app.use(express.json({}));
app.use(
  express.urlencoded({
    extended: true,
  })
);

app.use(
  cors({
    origin: "*",
  })
);

app.get("/api", (_req, res) => {
  res.json({ status: 200 });
  console.log("tiged");
});

app.use("/api/bundle", bundleRouter);
app.use("/api/variant", variantRouter);
app.use("/api", moveRouter);

const initializeBundleNumber = async () => {
  const bundleFilePath = path.join(__dirname, "currentBundleNo");
  try {
    await fs.access(bundleFilePath);
  } catch {
    // File doesn't exist, create it with initial value
    await fs.writeFile(bundleFilePath, "1", { encoding: "utf8" });
    console.log("Initialized bundle number file with value: 1");
  }
};

const server = app.listen(PORT, async () => {
  await initializeBundleNumber();
  console.log(`🚀 Server ready at: http://localhost:${PORT}`);
});
