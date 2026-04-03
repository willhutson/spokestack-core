/**
 * Marketplace module tool validation.
 * Runs at publish time — blocks modules with forbidden paths, external URLs,
 * invalid methods, or missing parameter types.
 */

export interface ToolDefinition {
  name: string;
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  description: string;
  parameters?: Record<string, ParameterDefinition>;
}

export interface ParameterDefinition {
  type: "string" | "number" | "boolean" | "array" | "object";
  description?: string;
  required?: boolean;
  enum?: string[];
}

export interface SecurityIssue {
  severity: "BLOCKER" | "WARNING";
  tool: string;
  field: string;
  message: string;
}

export interface SecurityReport {
  passed: boolean;
  score: number;
  blockers: SecurityIssue[];
  warnings: SecurityIssue[];
}

const ALLOWED_METHODS = ["GET", "POST", "PATCH", "DELETE"];

const FORBIDDEN_PATH_PREFIXES = [
  "/api/v1/admin/",
  "/api/v1/auth/",
  "/api/v1/marketplace/",
];

export function validateModuleTools(tools: ToolDefinition[]): SecurityReport {
  const blockers: SecurityIssue[] = [];
  const warnings: SecurityIssue[] = [];

  if (!Array.isArray(tools) || tools.length === 0) {
    blockers.push({
      severity: "BLOCKER",
      tool: "manifest",
      field: "tools",
      message: "Module must define at least one tool",
    });
    return { passed: false, score: 0, blockers, warnings };
  }

  if (tools.length > 50) {
    blockers.push({
      severity: "BLOCKER",
      tool: "manifest",
      field: "tools",
      message: "Module cannot define more than 50 tools",
    });
  }

  const toolNames = new Set<string>();

  for (const tool of tools) {
    // Duplicate names
    if (toolNames.has(tool.name)) {
      blockers.push({
        severity: "BLOCKER",
        tool: tool.name,
        field: "name",
        message: `Duplicate tool name: ${tool.name}`,
      });
    }
    toolNames.add(tool.name);

    // Path must start with /api/v1/
    if (!tool.path.startsWith("/api/v1/")) {
      blockers.push({
        severity: "BLOCKER",
        tool: tool.name,
        field: "path",
        message: `Path must start with /api/v1/. Got: ${tool.path}`,
      });
    }

    // Forbidden path prefixes
    for (const prefix of FORBIDDEN_PATH_PREFIXES) {
      if (tool.path.startsWith(prefix)) {
        blockers.push({
          severity: "BLOCKER",
          tool: tool.name,
          field: "path",
          message: `Path prefix '${prefix}' is forbidden in marketplace modules`,
        });
      }
    }

    // No external URLs
    if (/^https?:\/\//.test(tool.path)) {
      blockers.push({
        severity: "BLOCKER",
        tool: tool.name,
        field: "path",
        message: "External URLs are not allowed. Tools must call /api/v1/* only",
      });
    }

    // Valid HTTP methods
    if (!ALLOWED_METHODS.includes(tool.method)) {
      blockers.push({
        severity: "BLOCKER",
        tool: tool.name,
        field: "method",
        message: `Invalid method: ${tool.method}. Must be GET, POST, PATCH, or DELETE`,
      });
    }

    // Tool must have a description
    if (!tool.description || tool.description.length < 10) {
      warnings.push({
        severity: "WARNING",
        tool: tool.name,
        field: "description",
        message: "Tool should have a meaningful description (at least 10 chars)",
      });
    }

    // Parameters should have descriptions and types
    for (const [paramName, paramDef] of Object.entries(tool.parameters || {})) {
      if (!paramDef.description) {
        warnings.push({
          severity: "WARNING",
          tool: tool.name,
          field: `parameters.${paramName}`,
          message: `Parameter '${paramName}' should have a description`,
        });
      }
      if (!paramDef.type) {
        blockers.push({
          severity: "BLOCKER",
          tool: tool.name,
          field: `parameters.${paramName}`,
          message: `Parameter '${paramName}' must have a type`,
        });
      }
    }
  }

  const score = Math.max(
    1,
    10 - blockers.length * 3 - warnings.length * 0.5
  );

  return {
    passed: blockers.length === 0,
    score: Math.min(10, Math.round(score)),
    blockers,
    warnings,
  };
}
