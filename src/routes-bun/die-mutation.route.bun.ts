/**
 * Bun-optimized die mutation routes
 */

import { prisma } from "../../prisma";
import { jsonResponse } from "./helpers";

export async function handleDieMutationRoutes(
  subPath: string,
  method: string,
  query: Record<string, string>,
  body: any,
): Promise<Response> {
  // POST /api/die-mutation/tasks - Create mutation tasks
  if (subPath === "/tasks" && method === "POST") {
    try {
      const { bundles, reason, notes } = body || {};

      if (!bundles || !Array.isArray(bundles) || bundles.length === 0) {
        return jsonResponse(
          {
            success: false,
            error: "Invalid request: 'bundles' must be a non-empty array",
          },
          400,
        );
      }

      const validReasons = ["defective", "lost", "damaged", "other"];
      if (reason && !validReasons.includes(reason)) {
        return jsonResponse(
          {
            success: false,
            error: `Invalid reason. Must be one of: ${validReasons.join(", ")}`,
          },
          400,
        );
      }

      const results: Array<{
        sr_no: string;
        status: string;
        uid?: string;
        error?: string;
      }> = [];
      const errors: Array<{ sr_no: string; error: string }> = [];
      let processed = 0;
      let failed = 0;

      // Use Promise.all for parallel processing (Bun handles this efficiently)
      await Promise.all(
        bundles.map(async (sr_no) => {
          try {
            const bundle = await prisma.bundle.findUnique({
              where: { sr_no: sr_no.toString() },
            });

            if (!bundle) {
              errors.push({ sr_no, error: "Bundle not found" });
              results.push({ sr_no, status: "not_found" });
              failed++;
              return;
            }

            const updatedBundle = await prisma.bundle.update({
              where: { uid: bundle.uid },
              data: { status: "RETURNED" },
            });

            results.push({
              sr_no,
              status: "mutated",
              uid: updatedBundle.uid,
            });
            processed++;

            console.log(
              `[Die Mutation] Bundle ${sr_no} mutated. Reason: ${reason || "not specified"}`,
            );
          } catch (error: any) {
            console.error(`[Die Mutation] Error processing bundle ${sr_no}:`, error);
            errors.push({ sr_no, error: error.message || "Unknown error" });
            results.push({ sr_no, status: "error", error: error.message });
            failed++;
          }
        }),
      );

      return jsonResponse({
        success: failed === 0,
        processed,
        failed,
        results,
        errors: errors.length > 0 ? errors : undefined,
      });
    } catch (error: any) {
      console.error("[Die Mutation] Unexpected error:", error);
      return jsonResponse(
        {
          success: false,
          error: "Internal server error processing die mutation tasks",
          details: error.message,
        },
        500,
      );
    }
  }

  // GET /api/die-mutation/tasks - Get mutated bundles
  if (subPath === "/tasks" && method === "GET") {
    try {
      const limit = parseInt(query.limit) || 100;
      const offset = parseInt(query.offset) || 0;

      const [bundles, total] = await Promise.all([
        prisma.bundle.findMany({
          where: { status: "RETURNED" },
          orderBy: { modified_at: "desc" },
          take: limit,
          skip: offset,
          include: {
            section: {
              select: {
                s_no: true,
                name: true,
                series: true,
              },
            },
          },
        }),
        prisma.bundle.count({
          where: { status: "RETURNED" },
        }),
      ]);

      return jsonResponse({
        bundles,
        total,
        limit,
        offset,
      });
    } catch (error: any) {
      console.error("[Die Mutation] Error fetching mutated bundles:", error);
      return jsonResponse(
        {
          success: false,
          error: "Failed to fetch mutated bundles",
          details: error.message,
        },
        500,
      );
    }
  }

  // DELETE /api/die-mutation/tasks/:uid - Delete mutated bundle
  if (subPath.startsWith("/tasks/") && method === "DELETE") {
    try {
      const uid = subPath.replace("/tasks/", "");

      const bundle = await prisma.bundle.findUnique({
        where: { uid },
      });

      if (!bundle) {
        return jsonResponse(
          {
            success: false,
            error: "Bundle not found",
          },
          404,
        );
      }

      if (bundle.status !== "RETURNED") {
        return jsonResponse(
          {
            success: false,
            error: "Can only delete bundles with RETURNED status",
            currentStatus: bundle.status,
          },
          400,
        );
      }

      const deleted = await prisma.bundle.delete({
        where: { uid },
      });

      console.log(`[Die Mutation] Permanently deleted bundle ${deleted.sr_no} (${uid})`);

      return jsonResponse({
        success: true,
        deleted: {
          uid: deleted.uid,
          sr_no: deleted.sr_no,
        },
      });
    } catch (error: any) {
      console.error("[Die Mutation] Error deleting bundle:", error);
      return jsonResponse(
        {
          success: false,
          error: "Failed to delete bundle",
          details: error.message,
        },
        500,
      );
    }
  }

  return jsonResponse({ error: "Not Found" }, 404);
}
