"use client";

import { useCallback, useEffect, useState } from "react";

interface OmUpdateModalProps {
  requestId: number;
  ticketLink: string;
  currentValue: string | null;
  onSave: (requestId: number, omUpdate: string) => Promise<void>;
  onClose: () => void;
}

export function OmUpdateModal({
  requestId,
  ticketLink,
  currentValue,
  onSave,
  onClose,
}: OmUpdateModalProps) {
  const [value, setValue] = useState(currentValue ?? "");
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await onSave(requestId, value);
      onClose();
    } finally {
      setSaving(false);
    }
  }, [requestId, value, onSave, onClose]);

  useEffect(() => {
    setValue(currentValue ?? "");
  }, [currentValue]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Edit OM Update"
    >
      <div
        className="w-full max-w-lg rounded-xl border border-slate-600 bg-slate-800 p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-2 text-lg font-medium text-white">
          OM Update — Ticket link
        </h3>
        <p className="mb-1 truncate text-xs text-slate-500">{ticketLink}</p>
        <p className="mb-2 text-xs text-slate-400">
          Describe what the OM did (reshipment, follow-up, etc.). Last Follow Up will be set automatically when you save.
        </p>
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="e.g. Initiated reshipment. Customer confirmed address."
          rows={5}
          className="mb-4 w-full resize-y rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-500 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
