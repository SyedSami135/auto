"use client";

import { useCallback, useState } from "react";

export interface FilterState {
  dateFrom: string;
  dateTo: string;
  priority: string;
  status: string;
  customer: string;
  sku: string;
}

const defaultFilters: FilterState = {
  dateFrom: "",
  dateTo: "",
  priority: "",
  status: "",
  customer: "",
  sku: "",
};

interface FiltersProps {
  filterOptions: { priorities: string[]; statuses: string[] };
  onApply: (f: FilterState) => void;
  loading?: boolean;
}

export function Filters({ filterOptions, onApply, loading }: FiltersProps) {
  const [f, setF] = useState<FilterState>(defaultFilters);

  const apply = useCallback(() => {
    onApply(f);
  }, [f, onApply]);

  const clear = useCallback(() => {
    setF(defaultFilters);
    onApply(defaultFilters);
  }, [onApply]);

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/80 p-4 shadow-lg">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-400">Date from</label>
          <input
            type="date"
            value={f.dateFrom}
            onChange={(e) => setF((prev) => ({ ...prev, dateFrom: e.target.value }))}
            className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-400">Date to</label>
          <input
            type="date"
            value={f.dateTo}
            onChange={(e) => setF((prev) => ({ ...prev, dateTo: e.target.value }))}
            className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-400">Priority</label>
          <select
            value={f.priority}
            onChange={(e) => setF((prev) => ({ ...prev, priority: e.target.value }))}
            className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          >
            <option value="">All</option>
            {filterOptions.priorities.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-400">Status</label>
          <select
            value={f.status}
            onChange={(e) => setF((prev) => ({ ...prev, status: e.target.value }))}
            className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          >
            <option value="">All</option>
            {filterOptions.statuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-400">Customer</label>
          <input
            type="text"
            placeholder="Search customer"
            value={f.customer}
            onChange={(e) => setF((prev) => ({ ...prev, customer: e.target.value }))}
            className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-400">SKU</label>
          <input
            type="text"
            placeholder="Search SKU"
            value={f.sku}
            onChange={(e) => setF((prev) => ({ ...prev, sku: e.target.value }))}
            className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={clear}
          className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={apply}
          disabled={loading}
          className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-500 disabled:opacity-50"
        >
          {loading ? "Applying…" : "Apply"}
        </button>
      </div>
    </div>
  );
}
