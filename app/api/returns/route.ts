import { NextRequest, NextResponse } from "next/server";
import pool, { getQualifiedTable } from "@/lib/db";
import type { OemReturn, ReturnsQueryParams } from "@/lib/types";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

function parseQuery(req: NextRequest): ReturnsQueryParams {
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(10, parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10))
  );
  return {
    page,
    limit,
    dateFrom: searchParams.get("dateFrom") ?? undefined,
    dateTo: searchParams.get("dateTo") ?? undefined,
    priority: searchParams.get("priority") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    customer: searchParams.get("customer") ?? undefined,
    sku: searchParams.get("sku") ?? undefined,
    sortBy: searchParams.get("sortBy") ?? "request_date",
    sortOrder: (searchParams.get("sortOrder") as "asc" | "desc") ?? "desc",
  };
}

function mapRow(r: Record<string, unknown>): OemReturn {
  const fmt = (v: unknown) => (v == null ? null : String(v));
  const requestId = r.request_id != null ? Number(r.request_id) : 0;
  return {
    request_id: Number.isNaN(requestId) ? 0 : requestId,
    ticket_link: fmt(r.ticket_link) ?? "",
    order_number: fmt(r.order_number) ?? "",
    sku: fmt(r.sku) ?? "",
    customer_name: fmt(r.customer_name) ?? "",
    priority: fmt(r.priority) ?? "",
    om_request: fmt(r.om_request) ?? "",
    status: fmt(r.status) ?? "",
    om_update: r.om_update != null ? fmt(r.om_update) : null,
    last_follow_up: r.last_follow_up != null ? fmt(r.last_follow_up) : null,
    request_date: r.request_date != null ? fmt(r.request_date) : null,
    designated_om_agent: r.designated_om_agent != null ? fmt(r.designated_om_agent) : null,
  };
}

const ALLOWED_SORT: Record<string, string> = {
  ticket_link: "ticket_link",
  order_number: "order_number",
  sku: "sku",
  customer_name: "customer_name",
  priority: "priority",
  status: "status",
  request_date: "request_date",
  last_follow_up: "last_follow_up",
  om_update: "om_update",
  designated_om_agent: "designated_om_agent",
};

export async function GET(req: NextRequest) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured" },
      { status: 503 }
    );
  }

  const params = parseQuery(req);
  const table = getQualifiedTable();
  const conditions: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (params.dateFrom) {
    conditions.push(`(request_date::date >= $${idx})`);
    values.push(params.dateFrom);
    idx++;
  }
  if (params.dateTo) {
    conditions.push(`(request_date::date <= $${idx})`);
    values.push(params.dateTo);
    idx++;
  }
  if (params.priority) {
    conditions.push(`priority = $${idx}`);
    values.push(params.priority);
    idx++;
  }
  if (params.status) {
    conditions.push(`status = $${idx}`);
    values.push(params.status);
    idx++;
  }
  if (params.customer) {
    conditions.push(`customer_name ILIKE $${idx}`);
    values.push(`%${params.customer}%`);
    idx++;
  }
  if (params.sku) {
    conditions.push(`sku ILIKE $${idx}`);
    values.push(`%${params.sku}%`);
    idx++;
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const orderCol = ALLOWED_SORT[params.sortBy ?? ""] ?? "request_date";
  const orderDir = params.sortOrder === "asc" ? "ASC" : "DESC";
  const orderNulls = orderDir === "DESC" ? "NULLS LAST" : "NULLS FIRST";
  const offset = ((params.page ?? 1) - 1) * (params.limit ?? DEFAULT_LIMIT);
  const limitVal = params.limit ?? DEFAULT_LIMIT;

  const countSql = `SELECT COUNT(*)::int AS total FROM ${table} ${whereClause}`;
  const statsSql = `
    SELECT status, priority, COUNT(*)::int AS cnt
    FROM ${table}
    ${whereClause}
    GROUP BY status, priority
  `;
  const dataSql = `
    SELECT request_id, ticket_link, order_number, sku, customer_name, priority, om_request, status, om_update, last_follow_up, request_date, designated_om_agent
    FROM ${table}
    ${whereClause}
    ORDER BY ${orderCol} ${orderDir} ${orderNulls}
    LIMIT $${idx} OFFSET $${idx + 1}
  `;

  try {
    const [countRes, statsRes, dataRes] = await Promise.all([
      pool.query(countSql, values),
      pool.query(statsSql, values),
      pool.query(dataSql, [...values, limitVal, offset]),
    ]);

    const total = (countRes.rows[0]?.total as number) ?? 0;
    const byStatus: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    for (const row of statsRes.rows as { status: string; priority: string; cnt: number }[]) {
      byStatus[row.status] = (byStatus[row.status] ?? 0) + row.cnt;
      byPriority[row.priority] = (byPriority[row.priority] ?? 0) + row.cnt;
    }

    const rows = (dataRes.rows as Record<string, unknown>[]).map(mapRow);

    return NextResponse.json({
      rows,
      total,
      stats: {
        totalReturns: total,
        byStatus,
        byPriority,
      },
    });
  } catch (err) {
    console.error("Returns API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Database error" },
      { status: 500 }
    );
  }
}

const ALLOWED_STATUS = ["Open", "In Progress", "Closed"];

export async function PATCH(req: NextRequest) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured" },
      { status: 503 }
    );
  }

  let body: {
    request_id?: number;
    status?: string;
    om_update?: string;
    designated_om_agent?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const requestId = body.request_id;
  if (requestId == null || Number.isNaN(Number(requestId))) {
    return NextResponse.json(
      { error: "request_id is required" },
      { status: 400 }
    );
  }

  const status =
    body.status != null && body.status !== ""
      ? String(body.status).trim()
      : undefined;
  if (status != null && !ALLOWED_STATUS.includes(status)) {
    return NextResponse.json(
      { error: "status must be one of: Open, In Progress, Closed" },
      { status: 400 }
    );
  }

  const omUpdate =
    body.om_update !== undefined
      ? (body.om_update == null ? null : String(body.om_update))
      : undefined;

  const designatedOmAgent =
    body.designated_om_agent !== undefined
      ? (body.designated_om_agent == null ? null : String(body.designated_om_agent).trim() || null)
      : undefined;

  if (
    status === undefined &&
    omUpdate === undefined &&
    designatedOmAgent === undefined
  ) {
    return NextResponse.json(
      { error: "At least one of status, om_update, or designated_om_agent is required" },
      { status: 400 }
    );
  }

  const table = getQualifiedTable();
  const updates: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (status !== undefined) {
    updates.push(`status = $${idx}`);
    values.push(status);
    idx++;
  }
  if (omUpdate !== undefined) {
    updates.push(`om_update = $${idx}`);
    values.push(omUpdate);
    idx++;
  }
  if (designatedOmAgent !== undefined) {
    updates.push(`designated_om_agent = $${idx}`);
    values.push(designatedOmAgent);
    idx++;
  }
  updates.push(`last_follow_up = CURRENT_TIMESTAMP`);
  values.push(Number(requestId));

  const sql = `
    UPDATE ${table}
    SET ${updates.join(", ")}
    WHERE request_id = $${idx}
    RETURNING request_id, ticket_link, order_number, sku, customer_name, priority, om_request, status, om_update, last_follow_up, request_date, designated_om_agent
  `;

  try {
    const res = await pool.query(sql, values);
    const row = res.rows[0] as Record<string, unknown> | undefined;
    if (!row) {
      return NextResponse.json(
        { error: "No row found for this request_id" },
        { status: 404 }
      );
    }
    return NextResponse.json({ row: mapRow(row) });
  } catch (err) {
    console.error("PATCH returns error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Database error" },
      { status: 500 }
    );
  }
}
