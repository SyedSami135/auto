"use client";

import { useCallback, useState, useRef, useEffect, useMemo } from "react";
import { DownloadCsv } from "./DownloadCsv";
import { OmUpdateModal } from "./OmUpdateModal";
import { ReturnDetailsModal } from "./ReturnDetailsModal";
import type { OemReturn } from "@/lib/types";

const STATUS_OPTIONS = ["Open", "In Progress", "Closed"] as const;

const COLS = [
  { key: "ticket_link", label: "Ticket link" },
  { key: "order_number", label: "Order #" },
  { key: "sku", label: "SKU" },
  { key: "customer_name", label: "Customer" },
  { key: "priority", label: "Priority" },
  { key: "om_request", label: "OM Request" },
  { key: "status", label: "Status" },
  { key: "om_update", label: "OM Update" },
  { key: "last_follow_up", label: "Last follow up" },
  { key: "request_date", label: "Request date" },
  { key: "designated_om_agent", label: "Designated OM agent" },
] as const;

interface ReturnsTableProps {
  rows: OemReturn[];
  total: number;
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: "asc" | "desc";
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  onSortChange: (sortBy: string, sortOrder: "asc" | "desc") => void;
  onUpdate: (
    requestId: number,
    payload: { status?: string; om_update?: string; designated_om_agent?: string | null }
  ) => Promise<void>;
  loading?: boolean;
}

function formatCell(value: string | null): string {
  if (value == null || value === "") return "—";
  return value;
}

function formatTimestamp(value: string | null): string {
  if (value == null || value === "") return "—";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString(undefined, {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return value;
  }
}

export function ReturnsTable({
  rows,
  total,
  page,
  limit,
  sortBy,
  sortOrder,
  onPageChange,
  onLimitChange,
  onSortChange,
  onUpdate,
  loading,
}: ReturnsTableProps) {
  const [limitInput, setLimitInput] = useState(String(limit));
  const [omUpdateRow, setOmUpdateRow] = useState<OemReturn | null>(null);
  const [detailsRow, setDetailsRow] = useState<OemReturn | null>(null);
  const [statusUpdating, setStatusUpdating] = useState<number | null>(null);
  const [agentUpdating, setAgentUpdating] = useState<number | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const cardHeaderRef = useRef<HTMLDivElement | null>(null);
  const tableWrapRef = useRef<HTMLDivElement | null>(null);
  const headerRowRef = useRef<HTMLTableRowElement | null>(null);
  const [showFloatingHeader, setShowFloatingHeader] = useState(false);
  const [floatingTableWidth, setFloatingTableWidth] = useState(0);
  const [headerScrollLeft, setHeaderScrollLeft] = useState(0);
  const [tableClientWidth, setTableClientWidth] = useState(0);
  
  // Column width state - default widths for each column
  const defaultWidths: Record<string, number> = {
    ticket_link: 140,
    order_number: 120,
    sku: 120,
    customer_name: 160,
    priority: 100,
    om_request: 250,
    status: 130,
    om_update: 200,
    last_follow_up: 140,
    request_date: 120,
    designated_om_agent: 180,
  };
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(defaultWidths);
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const resizeStartX = useRef<number>(0);
  const resizeStartWidth = useRef<number>(0);
  
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  const handleSort = useCallback(
    (col: string) => {
      const nextOrder =
        sortBy === col && sortOrder === "desc" ? "asc" : "desc";
      onSortChange(col, nextOrder);
    },
    [sortBy, sortOrder, onSortChange]
  );

  const handleLimitSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const n = parseInt(limitInput, 10);
      if (!Number.isNaN(n) && n >= 10 && n <= 200) onLimitChange(n);
    },
    [limitInput, onLimitChange]
  );

  const handleStatusChange = useCallback(
    async (requestId: number, newStatus: string) => {
      setStatusUpdating(requestId);
      try {
        await onUpdate(requestId, { status: newStatus });
      } finally {
        setStatusUpdating(null);
      }
    },
    [onUpdate]
  );

  const handleOmUpdateSave = useCallback(
    async (requestId: number, omUpdate: string) => {
      await onUpdate(requestId, { om_update: omUpdate });
      setOmUpdateRow(null);
    },
    [onUpdate]
  );

  const handleDesignatedAgentBlur = useCallback(
    async (requestId: number, value: string) => {
      setAgentUpdating(requestId);
      try {
        await onUpdate(requestId, {
          designated_om_agent: value.trim() || null,
        });
      } finally {
        setAgentUpdating(null);
      }
    },
    [onUpdate]
  );

  const handleDetailsSave = useCallback(
    async (
      requestId: number,
      payload: { status?: string; om_update?: string; designated_om_agent?: string | null }
    ) => {
      await onUpdate(requestId, payload);
    },
    [onUpdate]
  );

  const handleResizeStart = useCallback((columnKey: string, e: React.MouseEvent) => {
    e.preventDefault();
    setResizingColumn(columnKey);
    resizeStartX.current = e.clientX;
    resizeStartWidth.current = columnWidths[columnKey];
  }, [columnWidths]);

  useEffect(() => {
    const handleResizeMove = (e: MouseEvent) => {
      if (!resizingColumn) return;
      
      const diff = e.clientX - resizeStartX.current;
      const newWidth = Math.max(24, resizeStartWidth.current + diff);
      setColumnWidths(prev => ({
        ...prev,
        [resizingColumn]: newWidth,
      }));
    };

    const handleResizeEnd = () => {
      setResizingColumn(null);
    };

    if (resizingColumn) {
      document.addEventListener("mousemove", handleResizeMove);
      document.addEventListener("mouseup", handleResizeEnd);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleResizeMove);
      document.removeEventListener("mouseup", handleResizeEnd);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [resizingColumn]);

  const syncFloatingHeader = useCallback(() => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const headerHeight = headerRowRef.current?.getBoundingClientRect().height ?? 0;
    setShowFloatingHeader(rect.top <= 0 && rect.bottom > headerHeight);
    const nextWidth = tableWrapRef.current?.clientWidth ?? rect.width;
    setFloatingTableWidth(nextWidth);
    setTableClientWidth(nextWidth);
  }, []);

  useEffect(() => {
    syncFloatingHeader();
    window.addEventListener("scroll", syncFloatingHeader, { passive: true });
    window.addEventListener("resize", syncFloatingHeader);
    return () => {
      window.removeEventListener("scroll", syncFloatingHeader);
      window.removeEventListener("resize", syncFloatingHeader);
    };
  }, [syncFloatingHeader]);

  useEffect(() => {
    syncFloatingHeader();
  }, [columnWidths, syncFloatingHeader]);

  const scaledColumnWidths = useMemo(() => {
    if (!tableClientWidth) return columnWidths;
    const totalWidth = COLS.reduce((sum, { key }) => sum + (columnWidths[key] ?? 0), 0);
    if (totalWidth <= tableClientWidth) return columnWidths;
    const scale = tableClientWidth / totalWidth;
    const minWidth = 24;
    const next: Record<string, number> = {};
    for (const { key } of COLS) {
      next[key] = Math.max(minWidth, Math.floor((columnWidths[key] ?? 0) * scale));
    }
    return next;
  }, [columnWidths, tableClientWidth]);

  const handleTableScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setHeaderScrollLeft(e.currentTarget.scrollLeft);
  }, []);

  if (loading && rows.length === 0) {
    return (
      <div className="rounded-xl border border-slate-700 bg-slate-800/80 p-6">
        <div className="h-8 w-48 animate-pulse rounded bg-slate-600" />
        <div className="mt-4 space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded bg-slate-700" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div ref={cardRef} className="rounded-xl border border-slate-700 bg-slate-800/80 shadow-lg">
        <div
          ref={cardHeaderRef}
          className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-700 p-4"
        >
          <p className="text-sm text-slate-400">
            Showing <span className="font-medium text-slate-200">{from}</span>–
            <span className="font-medium text-slate-200">{to}</span> of{" "}
            <span className="font-medium text-slate-200">{total.toLocaleString()}</span> requests
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <DownloadCsv rows={rows} total={total} disabled={loading} />
            <form onSubmit={handleLimitSubmit} className="flex items-center gap-2">
              <label className="text-sm text-slate-400">Rows:</label>
              <input
                type="number"
                min={10}
                max={200}
                value={limitInput}
                onChange={(e) => setLimitInput(e.target.value)}
                className="w-16 rounded border border-slate-600 bg-slate-900 px-2 py-1 text-center text-slate-100"
              />
              <button
                type="submit"
                className="rounded bg-slate-700 px-2 py-1 text-sm text-slate-200 hover:bg-slate-600"
              >
                OK
              </button>
            </form>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onPageChange(1)}
                disabled={page <= 1}
                className="rounded border border-slate-600 px-2 py-1 text-sm disabled:opacity-40"
              >
                First
              </button>
              <button
                type="button"
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1}
                className="rounded border border-slate-600 px-2 py-1 text-sm disabled:opacity-40"
              >
                Prev
              </button>
              <span className="px-2 text-sm text-slate-400">
                Page {page} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => onPageChange(page + 1)}
                disabled={page >= totalPages}
                className="rounded border border-slate-600 px-2 py-1 text-sm disabled:opacity-40"
              >
                Next
              </button>
              <button
                type="button"
                onClick={() => onPageChange(totalPages)}
                disabled={page >= totalPages}
                className="rounded border border-slate-600 px-2 py-1 text-sm disabled:opacity-40"
              >
                Last
              </button>
            </div>
          </div>
        </div>

        <div
          ref={tableWrapRef}
          onScroll={handleTableScroll}
          className="table-wrap max-h-[70vh] overflow-auto px-4 pb-4 pt-0"
        >
          {showFloatingHeader && (
            <div className="sticky top-0 z-20 -mt-px border-b border-slate-700 bg-slate-800">
              <div className="px-4">
                <table
                  className="border-collapse text-left text-[11px] sm:text-xs lg:text-sm"
                  style={{
                    tableLayout: "fixed",
                    width: floatingTableWidth || "100%",
                    transform: `translateX(-${headerScrollLeft}px)`,
                  }}
                >
                  <thead>
                    <tr className="border-b border-slate-600">
                      {COLS.map(({ key, label }, index) => (
                        <th
                          key={`floating-${key}`}
                          style={{ width: scaledColumnWidths[key], minWidth: 24 }}
                          className="bg-slate-800 relative cursor-pointer whitespace-normal py-2.5 pr-3 font-medium text-slate-400 hover:text-cyan-400 sm:py-3 sm:pr-4"
                          onClick={() => handleSort(key)}
                        >
                          <div className="flex items-center pr-1">
                            <span>{label}</span>
                            {sortBy === key && (
                              <span className="ml-1">{sortOrder === "asc" ? "↑" : "↓"}</span>
                            )}
                          </div>
                          {index < COLS.length - 1 && (
                            <div
                              className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize bg-slate-800 hover:bg-cyan-500/80 transition-colors z-10"
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                handleResizeStart(key, e);
                              }}
                              style={{ marginRight: "-3px" }}
                            />
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                </table>
              </div>
            </div>
          )}
          <table
            className="w-full border-collapse text-left text-[11px] sm:text-xs lg:text-sm"
            style={{ tableLayout: "fixed" }}
          >
            <thead className={showFloatingHeader ? "hidden" : ""}>
              <tr ref={headerRowRef} className="border-b border-slate-600">
                {COLS.map(({ key, label }, index) => (
                  <th
                    key={key}
                    style={{ width: scaledColumnWidths[key], minWidth: 24 }}
                    className="sticky top-0 z-10 bg-slate-800 relative cursor-pointer whitespace-normal py-2.5 pr-3 font-medium text-slate-400 hover:text-cyan-400 sm:py-3 sm:pr-4"
                    onClick={() => handleSort(key)}
                  >
                    <div className="flex items-center pr-1">
                      <span>{label}</span>
                      {sortBy === key && (
                        <span className="ml-1">{sortOrder === "asc" ? "↑" : "↓"}</span>
                      )}
                    </div>
                    {index < COLS.length - 1 && (
                    <div
                      className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize bg-slate-800 hover:bg-cyan-500/80 transition-colors z-10"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        handleResizeStart(key, e);
                      }}
                        style={{ marginRight: "-3px" }}
                      />
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={COLS.length} className="py-8 text-center text-slate-500">
                    No requests match the current filters.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.request_id}
                    onClick={() => setDetailsRow(row)}
                    className="cursor-pointer border-b border-slate-700/80 hover:bg-slate-700/40"
                  >
                    <td style={{ width: scaledColumnWidths.ticket_link }} className="py-2 pr-3 sm:pr-4">
                      {row.ticket_link?.trim() ? (
                        <a
                          href={row.ticket_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center justify-center rounded border border-slate-600 px-2.5 py-1 text-xs font-medium text-slate-200 hover:bg-slate-700"
                        >
                          View Ticket
                        </a>
                      ) : (
                        <button
                          type="button"
                          disabled
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center justify-center rounded border border-slate-700 px-2.5 py-1 text-xs font-medium text-slate-500"
                        >
                          View Ticket
                        </button>
                      )}
                    </td>
                    <td style={{ width: scaledColumnWidths.order_number }} className="py-2 pr-3 text-slate-200 sm:pr-4 whitespace-normal break-words">
                      {formatCell(row.order_number)}
                    </td>
                    <td style={{ width: scaledColumnWidths.sku }} className="py-2 pr-3 text-slate-200 sm:pr-4 whitespace-normal break-words">
                      {formatCell(row.sku)}
                    </td>
                    <td style={{ width: scaledColumnWidths.customer_name }} className="py-2 pr-3 text-slate-200 sm:pr-4 whitespace-normal break-words">
                      {formatCell(row.customer_name)}
                    </td>
                    <td style={{ width: scaledColumnWidths.priority }} className="py-2 pr-3 text-slate-200 sm:pr-4 whitespace-normal break-words">
                      {formatCell(row.priority)}
                    </td>
                    <td style={{ width: scaledColumnWidths.om_request }} className="py-2 pr-3 text-slate-200 break-words whitespace-normal sm:pr-4">
                      {formatCell(row.om_request)}
                    </td>
                    <td style={{ width: scaledColumnWidths.status }} className="py-2 pr-3 sm:pr-4">
                      <select
                        value={row.status || ""}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) =>
                          handleStatusChange(row.request_id, e.target.value)
                        }
                        disabled={statusUpdating === row.request_id}
                        className="w-full rounded border border-slate-600 bg-slate-900 px-2 py-1.5 text-slate-200 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 disabled:opacity-50"
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td style={{ width: scaledColumnWidths.om_update }} className="py-2 pr-3 sm:pr-4">
                      <span className="block text-slate-200 whitespace-normal break-words">
                        {formatCell(row.om_update)}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOmUpdateRow(row);
                        }}
                        className="mt-0.5 text-xs text-cyan-400 hover:underline"
                      >
                        Edit
                      </button>
                    </td>
                    <td style={{ width: scaledColumnWidths.last_follow_up }} className="py-2 pr-3 text-slate-400 sm:pr-4">
                      {formatTimestamp(row.last_follow_up)}
                    </td>
                    <td style={{ width: scaledColumnWidths.request_date }} className="py-2 pr-3 text-slate-400 sm:pr-4 whitespace-normal break-words">
                      {formatTimestamp(row.request_date)}
                    </td>
                    <td style={{ width: scaledColumnWidths.designated_om_agent }} className="py-2 pr-3 sm:pr-4">
                      <input
                        type="text"
                        defaultValue={formatCell(row.designated_om_agent) === "—" ? "" : formatCell(row.designated_om_agent)}
                        placeholder="OM agent"
                        onClick={(e) => e.stopPropagation()}
                        onBlur={(e) =>
                          handleDesignatedAgentBlur(row.request_id, e.target.value)
                        }
                        disabled={agentUpdating === row.request_id}
                        className="w-full rounded border border-slate-600 bg-slate-900 px-2 py-1.5 text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 disabled:opacity-50"
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {omUpdateRow && (
        <OmUpdateModal
          requestId={omUpdateRow.request_id}
          ticketLink={omUpdateRow.ticket_link}
          currentValue={omUpdateRow.om_update}
          onSave={handleOmUpdateSave}
          onClose={() => setOmUpdateRow(null)}
        />
      )}
      {detailsRow && (
        <ReturnDetailsModal
          row={detailsRow}
          statusOptions={STATUS_OPTIONS}
          onSave={handleDetailsSave}
          onClose={() => setDetailsRow(null)}
        />
      )}
    </>
  );
}
