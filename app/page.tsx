"use client";

import { useCallback, useEffect, useState } from "react";
import { Filters, type FilterState } from "@/components/Filters";
import { ReturnsTable } from "@/components/ReturnsTable";
import { StatsCards } from "@/components/StatsCards";
import type { ReturnsResponse } from "@/lib/types";

const DEFAULT_LIMIT = 50;

function buildQuery(
  filters: FilterState,
  page: number,
  limit: number,
  sortBy: string,
  sortOrder: "asc" | "desc"
): string {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", String(limit));
  params.set("sortBy", sortBy);
  params.set("sortOrder", sortOrder);
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  if (filters.priority) params.set("priority", filters.priority);
  if (filters.status) params.set("status", filters.status);
  if (filters.customer) params.set("customer", filters.customer);
  if (filters.sku) params.set("sku", filters.sku);
  return params.toString();
}

export default function DashboardPage() {
  const [filters, setFilters] = useState<FilterState>({
    dateFrom: "",
    dateTo: "",
    priority: "",
    status: "",
    customer: "",
    sku: "",
  });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [sortBy, setSortBy] = useState("request_date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [filterOptions, setFilterOptions] = useState<{
    priorities: string[];
    statuses: string[];
  }>({ priorities: [], statuses: [] });
  const [data, setData] = useState<ReturnsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [filtersLoading, setFiltersLoading] = useState(true);

  const fetchFilters = useCallback(async () => {
    setFiltersLoading(true);
    try {
      const res = await fetch("/api/filters");
      if (res.ok) {
        const json = await res.json();
        setFilterOptions({ priorities: json.priorities ?? [], statuses: json.statuses ?? [] });
      }
    } catch {
      // ignore
    } finally {
      setFiltersLoading(false);
    }
  }, []);

  const fetchReturns = useCallback(async () => {
    setLoading(true);
    try {
      const q = buildQuery(filters, page, limit, sortBy, sortOrder);
      const res = await fetch(`/api/returns?${q}`);
      if (res.ok) {
        const json: ReturnsResponse = await res.json();
        setData(json);
      } else {
        setData({ rows: [], total: 0, stats: { totalReturns: 0, byStatus: {}, byPriority: {} } });
      }
    } catch {
      setData({
        rows: [],
        total: 0,
        stats: { totalReturns: 0, byStatus: {}, byPriority: {} },
      });
    } finally {
      setLoading(false);
    }
  }, [filters, page, limit, sortBy, sortOrder]);

  useEffect(() => {
    fetchFilters();
  }, [fetchFilters]);

  useEffect(() => {
    fetchReturns();
  }, [fetchReturns]);

  const handleApplyFilters = useCallback((f: FilterState) => {
    setFilters(f);
    setPage(1);
  }, []);

  const handlePageChange = useCallback((p: number) => setPage(p), []);
  const handleLimitChange = useCallback((l: number) => {
    setLimit(l);
    setPage(1);
  }, []);
  const handleSortChange = useCallback((by: string, order: "asc" | "desc") => {
    setSortBy(by);
    setSortOrder(order);
    setPage(1);
  }, []);

  const handleUpdate = useCallback(
    async (
      requestId: number,
      payload: {
        status?: string;
        om_update?: string;
        designated_om_agent?: string | null;
      }
    ) => {
      const res = await fetch("/api/returns", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request_id: requestId, ...payload }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error ?? "Update failed");
      }
      await fetchReturns();
    },
    [fetchReturns]
  );

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const stats = data?.stats ?? {
    totalReturns: 0,
    byStatus: {},
    byPriority: {},
  };

  return (
    <main className="min-h-screen bg-slate-900">
      <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-white">
            OM Request Dashboard
          </h1>
          <p className="mt-1 text-slate-400">
            Requests from DB → work here (Status, OM Update) → saved back to DB. Filter by date, priority, status, customer, SKU.
          </p>
        </header>

        <section className="mb-6">
          <Filters
            filterOptions={filterOptions}
            onApply={handleApplyFilters}
            loading={filtersLoading}
          />
        </section>

        <section className="mb-6">
          <StatsCards
            totalRequests={stats.totalReturns}
            byStatus={stats.byStatus}
            byPriority={stats.byPriority}
            loading={loading}
          />
        </section>

        <section>
          <ReturnsTable
            rows={rows}
            total={total}
            page={page}
            limit={limit}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onPageChange={handlePageChange}
            onLimitChange={handleLimitChange}
            onSortChange={handleSortChange}
            onUpdate={handleUpdate}
            loading={loading}
          />
        </section>
      </div>
    </main>
  );
}
