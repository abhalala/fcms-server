/**
 * Bun-optimized server implementation
 * This uses Bun's native APIs for better performance while maintaining
 * backward compatibility with the existing Express-based API
 */

import { Serve } from "bun";
import { prisma } from "../prisma";
import { promises as fs } from "fs";
import path from "path";

// Import route handlers (we'll adapt them)
import { handleBundleRoutes } from "./routes-bun/bundle.route.bun";
import { handleVariantRoutes } from "./routes-bun/variant.route.bun";
import { handleMoveRoutes } from "./routes-bun/move.route.bun";
import { handleDieMutationRoutes } from "./routes-bun/die-mutation.route.bun";

const PORT = parseInt(process.env.PORT || "3000");
const HOST = process.env.HOST || "0.0.0.0";

// Initialize bundle number file
const initializeBundleNumber = async () => {
  const bundleFilePath = path.join(
    import.meta.dir,
    "..",
    "data",
    "currentBundleNo",
  );
  try {
    await fs.access(bundleFilePath);
  } catch {
    await fs.mkdir(path.dirname(bundleFilePath), { recursive: true });
    await fs.writeFile(bundleFilePath, "1", { encoding: "utf8" });
    console.log("Initialized bundle number file with value: 1");
  }
};

// CORS headers helper
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// JSON response helper
const jsonResponse = (data: any, status = 200, additionalHeaders = {}) => {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
      ...additionalHeaders,
    },
  });
};

// Parse request body helper (using Bun's fast JSON parsing)
const parseBody = async (req: Request) => {
  try {
    return await req.json();
  } catch {
    return null;
  }
};

// URL and query parsing helper
const parseUrl = (url: string) => {
  const urlObj = new URL(url);
  const pathname = urlObj.pathname;
  const query = Object.fromEntries(urlObj.searchParams);
  return { pathname, query };
};

// Main request handler
const handleRequest = async (req: Request): Promise<Response> => {
  const { pathname, query } = parseUrl(req.url);
  const method = req.method;

  // Handle CORS preflight
  if (method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  console.log(`${method} ${pathname}`);

  try {
    // Health check endpoint
    if (pathname === "/api" && method === "GET") {
      return jsonResponse({ status: 200 });
    }

    // Bundle routes
    if (pathname.startsWith("/api/bundle")) {
      const subPath = pathname.replace("/api/bundle", "") || "/";
      const body = method !== "GET" ? await parseBody(req) : null;
      return await handleBundleRoutes(subPath, method, query, body);
    }

    // Variant routes
    if (pathname.startsWith("/api/variant")) {
      const subPath = pathname.replace("/api/variant", "") || "/";
      return await handleVariantRoutes(subPath, method, query);
    }

    // Move routes
    if (pathname.startsWith("/api/move")) {
      const body = await parseBody(req);
      return await handleMoveRoutes(pathname, method, body);
    }

    // Die mutation routes
    if (pathname.startsWith("/api/die-mutation")) {
      const subPath = pathname.replace("/api/die-mutation", "") || "/";
      const body = method !== "GET" ? await parseBody(req) : null;
      return await handleDieMutationRoutes(subPath, method, query, body);
    }

    // 404 Not Found
    return jsonResponse({ error: "Not Found" }, 404);
  } catch (error: any) {
    console.error("Server error:", error);
    return jsonResponse(
      { error: "Internal Server Error", details: error.message },
      500,
    );
  }
};

// Bun server configuration
const server: Serve = {
  port: PORT,
  hostname: HOST,
  
  async fetch(req: Request): Promise<Response> {
    return handleRequest(req);
  },

  // Error handler
  error(error: Error) {
    console.error("Server error:", error);
    return new Response("Internal Server Error", { status: 500 });
  },
};

// Start server
await initializeBundleNumber();

Bun.serve(server);

console.log(`🚀 Bun server ready at: http://${HOST}:${PORT}`);
console.log(`⚡ Running with Bun ${Bun.version} for optimal performance`);
