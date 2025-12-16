/**
 * Shared helpers for Bun-optimized routes
 */

// CORS headers
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// JSON response helper
export const jsonResponse = (data: any, status = 200, additionalHeaders = {}) => {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
      ...additionalHeaders,
    },
  });
};

// File operations using Bun's optimized file API
const filePath = `${import.meta.dir}/../../data/currentBundleNo`;

export async function getStateFromFile(): Promise<string> {
  try {
    const file = Bun.file(filePath);
    return await file.text();
  } catch (error) {
    console.error("Failed to read from file:", error);
    return "";
  }
}

export async function setStateToFile(newState: string): Promise<void> {
  try {
    await Bun.write(filePath, newState);
  } catch (error) {
    console.error("Failed to write to file:", error);
  }
}
