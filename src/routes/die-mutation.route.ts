import { Router } from "express";
import { prisma } from "../../prisma";

const dieMutationRouter = Router();

/**
 * Die Mutation Tasks Endpoint
 * 
 * Handles mutations (modifications) to bundles that are marked for removal or archival.
 * This endpoint allows for batch operations on bundles that need to be mutated in the system.
 */

/**
 * POST /api/die-mutation/tasks
 * 
 * Process a list of bundle serial numbers for die mutation.
 * Die mutation marks bundles as obsolete/removed from active inventory.
 * 
 * Request body:
 * {
 *   "bundles": ["25A123", "25B456", "25C789"],  // Array of bundle serial numbers
 *   "reason": "defective",                      // Reason for mutation: "defective", "lost", "damaged", "other"
 *   "notes": "Optional notes"                   // Optional notes about the mutation
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "processed": 3,
 *   "failed": 0,
 *   "results": [
 *     { "sr_no": "25A123", "status": "mutated", "uid": "..." },
 *     { "sr_no": "25B456", "status": "mutated", "uid": "..." },
 *     { "sr_no": "25C789", "status": "mutated", "uid": "..." }
 *   ],
 *   "errors": []
 * }
 */
dieMutationRouter.post("/tasks", async (req, res) => {
  try {
    const { bundles, reason, notes } = req.body;

    // Validation
    if (!bundles || !Array.isArray(bundles) || bundles.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Invalid request: 'bundles' must be a non-empty array",
      });
    }

    const validReasons = ["defective", "lost", "damaged", "other"];
    if (reason && !validReasons.includes(reason)) {
      return res.status(400).json({
        success: false,
        error: `Invalid reason. Must be one of: ${validReasons.join(", ")}`,
      });
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

    // Process each bundle
    for (const sr_no of bundles) {
      try {
        // Find the bundle
        const bundle = await prisma.bundle.findUnique({
          where: { sr_no: sr_no.toString() },
        });

        if (!bundle) {
          errors.push({ sr_no, error: "Bundle not found" });
          results.push({ sr_no, status: "not_found" });
          failed++;
          continue;
        }

        // Update bundle status to indicate it's being removed
        // In this implementation, we'll update the status to RETURNED
        // which indicates the bundle is out of active inventory
        const updatedBundle = await prisma.bundle.update({
          where: { uid: bundle.uid },
          data: {
            status: "RETURNED",
            // Store mutation metadata in a comment or log
            // Note: This would ideally go to a separate mutation_log table
            // but we're working with existing schema
          },
        });

        results.push({
          sr_no,
          status: "mutated",
          uid: updatedBundle.uid,
        });
        processed++;

        console.log(
          `[Die Mutation] Bundle ${sr_no} mutated. Reason: ${reason || "not specified"}, Notes: ${notes || "none"}`,
        );
      } catch (error: any) {
        console.error(`[Die Mutation] Error processing bundle ${sr_no}:`, error);
        errors.push({ sr_no, error: error.message || "Unknown error" });
        results.push({ sr_no, status: "error", error: error.message });
        failed++;
      }
    }

    res.json({
      success: failed === 0,
      processed,
      failed,
      results,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error("[Die Mutation] Unexpected error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error processing die mutation tasks",
      details: error.message,
    });
  }
});

/**
 * GET /api/die-mutation/tasks
 * 
 * Retrieve all bundles that have been mutated (marked as RETURNED)
 * 
 * Query parameters:
 * - limit: number (default: 100) - Maximum number of results
 * - offset: number (default: 0) - Offset for pagination
 * 
 * Response:
 * {
 *   "bundles": [...],
 *   "total": 42,
 *   "limit": 100,
 *   "offset": 0
 * }
 */
dieMutationRouter.get("/tasks", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;

    // Get mutated bundles (those with RETURNED status)
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

    res.json({
      bundles,
      total,
      limit,
      offset,
    });
  } catch (error: any) {
    console.error("[Die Mutation] Error fetching mutated bundles:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch mutated bundles",
      details: error.message,
    });
  }
});

/**
 * DELETE /api/die-mutation/tasks/:uid
 * 
 * Permanently remove a mutated bundle from the database
 * This is a destructive operation and should be used with caution
 * 
 * Response:
 * {
 *   "success": true,
 *   "deleted": { ... }
 * }
 */
dieMutationRouter.delete("/tasks/:uid", async (req, res) => {
  try {
    const { uid } = req.params;

    // Verify bundle exists and is in RETURNED status
    const bundle = await prisma.bundle.findUnique({
      where: { uid },
    });

    if (!bundle) {
      return res.status(404).json({
        success: false,
        error: "Bundle not found",
      });
    }

    if (bundle.status !== "RETURNED") {
      return res.status(400).json({
        success: false,
        error: "Can only delete bundles with RETURNED status",
        currentStatus: bundle.status,
      });
    }

    // Delete the bundle
    const deleted = await prisma.bundle.delete({
      where: { uid },
    });

    console.log(`[Die Mutation] Permanently deleted bundle ${deleted.sr_no} (${uid})`);

    res.json({
      success: true,
      deleted: {
        uid: deleted.uid,
        sr_no: deleted.sr_no,
      },
    });
  } catch (error: any) {
    console.error("[Die Mutation] Error deleting bundle:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete bundle",
      details: error.message,
    });
  }
});

export { dieMutationRouter };
