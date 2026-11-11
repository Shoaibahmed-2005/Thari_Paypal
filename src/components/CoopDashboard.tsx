"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AgGridReact } from "ag-grid-react";
import {
  AllCommunityModule,
  ModuleRegistry,
  themeQuartz,
  type ColDef,
  type GridApi,
  type ICellRendererParams,
} from "ag-grid-community";
import { BadgeCheck, Download, Play, RotateCcw, Search, X } from "lucide-react";
import { formatUsd } from "@/lib/money";
import type { CoopData, CoopListingRow, CoopOrderRow, CoopPayoutRow } from "@/lib/coop";

ModuleRegistry.registerModules([AllCommunityModule]);

/**
 * AG Grid themed with the brand tokens from BUILD_PLAN section 8 (9.4).
 * The tokens themselves are untouched; they are only referenced here.
 */
const thariTheme = themeQuartz.withParams({
  accentColor: "var(--primary)",
  backgroundColor: "var(--surface)",
  foregroundColor: "var(--ink)",
  borderColor: "var(--line)",
  headerBackgroundColor: "var(--surface-tint)",
  headerTextColor: "var(--ink-muted)",
  oddRowBackgroundColor: "var(--surface)",
  rowHoverColor: "var(--surface-tint)",
  selectedRowBackgroundColor: "var(--blush)",
  fontFamily: "var(--font-sans)",
  headerFontWeight: 700,
  wrapperBorderRadius: "var(--radius-md)",
  spacing: 7,
});

const DEFAULT_COL: ColDef = { sortable: true, filter: true, resizable: true, flex: 1, minWidth: 110 };

function usd(cents: number | null | undefined): string {
  return formatUsd(cents ?? 0);
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="th-card p-4">
      <div className="t-caption text-ink-muted">{label}</div>
      <div className="th-price mt-1" style={{ fontSize: 26, lineHeight: "32px" }}>
        {value}
      </div>
    </div>
  );
}

/** One grid plus its quick search and CSV export (9.4). */
function GridPanel<T>({
  title,
  rows,
  columns,
  getRowId,
  height = 340,
}: {
  title: string;
  rows: T[];
  columns: ColDef<T>[];
  getRowId: (r: T) => string;
  height?: number;
}) {
  const apiRef = useRef<GridApi<T> | null>(null);
  const [quick, setQuick] = useState("");

  return (
    <section className="mt-8">
      <div className="th-row justify-between">
        <h2 className="t-title m-0">{title}</h2>
        <div className="th-row">
          <div className="th-field th-field--search" style={{ width: 260 }}>
            <div className="th-field__box" style={{ minHeight: 40 }}>
              <Search size={18} strokeWidth={1.75} aria-hidden />
              <input
                className="th-field__input"
                placeholder={`Search ${title.toLowerCase()}`}
                aria-label={`Search ${title.toLowerCase()}`}
                value={quick}
                onChange={(e) => setQuick(e.target.value)}
              />
            </div>
          </div>
          <button
            type="button"
            className="th-btn th-btn--secondary"
            style={{ minHeight: 40 }}
            onClick={() => apiRef.current?.exportDataAsCsv({ fileName: `thari-${title.toLowerCase()}.csv` })}
          >
            <Download size={18} strokeWidth={1.75} aria-hidden />
            CSV
          </button>
        </div>
      </div>

      <div style={{ height, marginTop: 12 }}>
        <AgGridReact<T>
          theme={thariTheme}
          rowData={rows}
          columnDefs={columns}
          defaultColDef={DEFAULT_COL}
          quickFilterText={quick}
          getRowId={(p) => getRowId(p.data)}
          onGridReady={(e) => (apiRef.current = e.api)}
          animateRows
          rowHeight={52}
        />
      </div>
    </section>
  );
}

export function CoopDashboard({ data, coopName }: { data: CoopData; coopName: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [clip, setClip] = useState<{ title: string; url: string } | null>(null);

  const act = useCallback(
    async (key: string, url: string, body?: unknown, confirmMessage?: string) => {
      if (confirmMessage && !window.confirm(confirmMessage)) return;
      setBusy(key);
      setNote(null);
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: body === undefined ? undefined : JSON.stringify(body),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "That didn't work.");
        setNote(
          json.recoverPayoutsManually
            ? "Refunded. The payouts had already gone out — recover them from the weaver and co-op by hand."
            : "Done.",
        );
        router.refresh();
      } catch (err) {
        setNote(err instanceof Error ? err.message : "That didn't work.");
      } finally {
        setBusy(null);
      }
    },
    [router],
  );

  const listingCols = useMemo<ColDef<CoopListingRow>[]>(
    () => [
      {
        headerName: "",
        field: "photoUrl",
        width: 64,
        maxWidth: 64,
        flex: 0,
        sortable: false,
        filter: false,
        cellRenderer: (p: ICellRendererParams<CoopListingRow>) =>
          p.data?.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.data.photoUrl} alt="" style={{ width: 36, height: 36, objectFit: "cover", borderRadius: 8 }} />
          ) : (
            <div className="th-weave" style={{ width: 36, height: 36, borderRadius: 8 }} />
          ),
      },
      { headerName: "Piece", field: "title", minWidth: 240 },
      { headerName: "Weaver", field: "weaver", minWidth: 130 },
      { headerName: "Town", field: "town", minWidth: 120 },
      {
        headerName: "Price",
        field: "priceUsdCents",
        valueFormatter: (p) => usd(p.value as number),
        minWidth: 100,
      },
      { headerName: "Status", field: "status", minWidth: 120 },
      {
        headerName: "Verified",
        field: "confirmed",
        minWidth: 110,
        valueFormatter: (p) => (p.value ? "Yes" : "—"),
      },
      {
        headerName: "Loom clip",
        field: "loomClipUrl",
        sortable: false,
        filter: false,
        minWidth: 110,
        cellRenderer: (p: ICellRendererParams<CoopListingRow>) =>
          p.data?.loomClipUrl ? (
            <button
              type="button"
              className="th-btn th-btn--ghost"
              style={{ minHeight: 32 }}
              onClick={() => setClip({ title: p.data!.title, url: p.data!.loomClipUrl! })}
            >
              <Play size={16} strokeWidth={1.75} aria-hidden />
              Play
            </button>
          ) : (
            <span className="t-caption text-ink-muted">none</span>
          ),
      },
      {
        headerName: "Confirm",
        colId: "confirm",
        sortable: false,
        filter: false,
        minWidth: 150,
        cellRenderer: (p: ICellRendererParams<CoopListingRow>) => {
          const row = p.data!;
          const key = `confirm-${row.id}`;
          return (
            <button
              type="button"
              className={row.confirmed ? "th-btn th-btn--ghost" : "th-btn th-btn--primary"}
              style={{ minHeight: 32 }}
              disabled={busy === key || (!row.loomClipUrl && !row.confirmed)}
              title={!row.loomClipUrl && !row.confirmed ? "No loom clip to vouch for" : undefined}
              onClick={() =>
                act(key, `/api/listings/${row.id}/confirm`, { confirmed: !row.confirmed })
              }
            >
              <BadgeCheck size={16} strokeWidth={1.75} aria-hidden />
              {row.confirmed ? "Undo" : "Confirm"}
            </button>
          );
        },
      },
    ],
    [act, busy],
  );

  const orderCols = useMemo<ColDef<CoopOrderRow>[]>(
    () => [
      { headerName: "Piece", field: "piece", minWidth: 220 },
      { headerName: "Weaver", field: "weaver", minWidth: 130 },
      { headerName: "Buyer", field: "buyerCountry", minWidth: 100 },
      { headerName: "Total", field: "totalUsdCents", valueFormatter: (p) => usd(p.value as number), minWidth: 100 },
      { headerName: "Status", field: "status", minWidth: 120 },
      { headerName: "Tracking", field: "tracking", valueFormatter: (p) => (p.value as string) ?? "—", minWidth: 140 },
      {
        headerName: "Refund",
        colId: "refund",
        sortable: false,
        filter: false,
        minWidth: 130,
        cellRenderer: (p: ICellRendererParams<CoopOrderRow>) => {
          const row = p.data!;
          const key = `refund-${row.id}`;
          const refundable = row.status === "PAID" || row.status === "SHIPPED" || row.status === "DELIVERED";
          return (
            <button
              type="button"
              className="th-btn th-btn--secondary"
              style={{ minHeight: 32 }}
              disabled={!refundable || busy === key}
              onClick={() =>
                act(
                  key,
                  `/api/refunds/${row.id}`,
                  { relist: true },
                  `Refund ${usd(row.totalUsdCents)} for "${row.piece}" and put it back on sale? This cannot be undone.`,
                )
              }
            >
              <RotateCcw size={16} strokeWidth={1.75} aria-hidden />
              Refund
            </button>
          );
        },
      },
    ],
    [act, busy],
  );

  const payoutCols = useMemo<ColDef<CoopPayoutRow>[]>(
    () => [
      { headerName: "To", field: "recipient", minWidth: 110 },
      { headerName: "Account", field: "receiverEmail", minWidth: 240 },
      { headerName: "Amount", field: "amountUsdCents", valueFormatter: (p) => usd(p.value as number), minWidth: 110 },
      { headerName: "Status", field: "status", minWidth: 120 },
      {
        headerName: "PayPal batch",
        field: "paypalBatchId",
        valueFormatter: (p) => (p.value as string) ?? "—",
        minWidth: 150,
      },
      { headerName: "Error", field: "error", valueFormatter: (p) => (p.value as string) ?? "", minWidth: 160 },
      {
        headerName: "Retry",
        colId: "retry",
        sortable: false,
        filter: false,
        minWidth: 120,
        cellRenderer: (p: ICellRendererParams<CoopPayoutRow>) => {
          const row = p.data!;
          const key = `retry-${row.orderId}`;
          const failed = row.status === "FAILED" || row.status === "PENDING";
          return (
            <button
              type="button"
              className="th-btn th-btn--secondary"
              style={{ minHeight: 32 }}
              disabled={!failed || busy === key}
              onClick={() => act(key, `/api/payouts/${row.orderId}/retry`)}
            >
              <RotateCcw size={16} strokeWidth={1.75} aria-hidden />
              Retry
            </button>
          );
        },
      },
    ],
    [act, busy],
  );

  return (
    <>
      <header className="th-row justify-between">
        <div>
          <h1 className="t-title-lg m-0">{coopName}</h1>
          <p className="t-caption m-0 text-ink-muted">Co-op dashboard</p>
        </div>
        <a href="/api/logout" className="th-btn th-btn--ghost">
          Sign out
        </a>
      </header>

      <div className="mt-5 grid gap-4 md:grid-cols-4">
        <Stat label="Pieces live" value={String(data.stats.live)} />
        <Stat label="Sold this month" value={String(data.stats.soldThisMonth)} />
        <Stat label="Paid to weavers" value={usd(data.stats.paidToWeaversUsdCents)} />
        <Stat label="Awaiting confirmation" value={String(data.stats.pendingConfirmations)} />
      </div>

      {note && (
        <p className="th-card mt-4 p-3 t-body" role="status">
          {note}
        </p>
      )}

      <GridPanel
        title="Listings"
        rows={data.listings}
        columns={listingCols}
        getRowId={(r) => r.id}
        height={420}
      />
      <GridPanel title="Orders" rows={data.orders} columns={orderCols} getRowId={(r) => r.id} />
      <GridPanel title="Payouts" rows={data.payouts} columns={payoutCols} getRowId={(r) => r.id} />

      <section className="mt-8">
        <h2 className="t-title">Recent activity</h2>
        <ul className="th-card m-0 list-none p-0">
          {data.log.length === 0 && <li className="t-body p-4 text-ink-muted">Nothing yet.</li>}
          {data.log.map((l) => (
            <li key={l.id} className="th-row justify-between border-b border-[var(--line)] px-4 py-3 last:border-0">
              <span className="t-body">{l.summary}</span>
              <span className="t-caption text-ink-muted">
                {l.actor} · {new Date(l.at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {clip && (
        <div
          role="dialog"
          aria-label={`Loom clip for ${clip.title}`}
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ background: "rgba(42,22,20,.6)" }}
          onClick={() => setClip(null)}
        >
          <div className="th-card max-w-[720px] p-4" onClick={(e) => e.stopPropagation()}>
            <div className="th-row justify-between">
              <h3 className="t-title m-0">{clip.title}</h3>
              <button type="button" className="th-icon-btn" aria-label="Close" onClick={() => setClip(null)}>
                <X size={20} strokeWidth={1.75} />
              </button>
            </div>
            { }
            <video src={clip.url} controls autoPlay className="mt-3 w-full" style={{ borderRadius: "var(--radius-md)" }} />
          </div>
        </div>
      )}
    </>
  );
}
