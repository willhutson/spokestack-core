import { NextRequest, NextResponse } from "next/server";
import { ModuleType } from "@prisma/client";
import { authenticate } from "@/lib/auth";
import { moduleGuardCheck } from "@/middleware/moduleGuard";

type RouteHandler = (
  req: NextRequest,
  ctx: { params: Promise<Record<string, string>> }
) => Promise<NextResponse> | NextResponse;

/**
 * Higher-order function that wraps a Next.js App Router route handler
 * with module guard checking.
 *
 * Usage:
 *   export const GET = withModuleGuard(ModuleType.CRM)(handler);
 */
export function withModuleGuard(moduleType: ModuleType) {
  return function (handler: RouteHandler): RouteHandler {
    return async (req, ctx) => {
      const auth = await authenticate(req);
      if (!auth) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const guard = await moduleGuardCheck(auth.organizationId, moduleType);

      if (!guard.allowed) {
        return NextResponse.json(
          {
            error: guard.message,
            upsell: guard.upsell,
            moduleType: guard.moduleType,
            moduleName: guard.moduleName,
            minTier: guard.minTier,
            price: guard.price,
          },
          { status: 403 }
        );
      }

      return handler(req, ctx);
    };
  };
}
