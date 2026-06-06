// app/t/[tenantSlug]/pro/analytics/page.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Clock, Calendar, CheckCircle2, TrendingUp } from "lucide-react";
import Link from "next/link";

type Lead = {
  id: string;
  fullName: string;
  email: string | null;
  stage: string;
  createdAt: string;
  lastContactedAt: string | null;
};

type Summary = {
  userId: string;
  name: string;
  email: string;
  totalLeads: number;
  activeLeads: number;
  coldLeads: number;
  deadLeads: number;
  todayHours: number;
  todayEdits: number;
};

type DrilldownPayload = {
  punchInToday: string | null;
  totalHours: number;
  leads: {
    touchedToday: Lead[];
    cold: Lead[];
    dead: Lead[];
    active: Lead[];
  };
  activityGraph: Array<{ date: string; count: number }>;
};

export default function CounselorAnalyticsDashboard() {
  const { tenantSlug } = useParams() as { tenantSlug: string };

  const todayStr = new Date().toISOString().split("T")[0];
  const [from, setFrom] = useState(todayStr);
  const [to, setTo] = useState(todayStr);

  const [summary, setSummary] = useState<Summary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const [drilldown, setDrilldown] = useState<DrilldownPayload | null>(null);
  const [drilldownLoading, setDrilldownLoading] = useState(false);

  // Fetch summary (single‑item array)
  const fetchSummary = async () => {
    setSummaryLoading(true);
    try {
      const res = await fetch(`/api/analytics/summary?from=${from}&to=${to}`);
      if (!res.ok) throw new Error("Failed to fetch summary");
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) setSummary(data[0]);
    } catch (e) {
      console.error(e);
    } finally {
      setSummaryLoading(false);
    }
  };

  // Fetch drilldown for the logged‑in counselor (no counselorId param)
  const fetchDrilldown = async () => {
    setDrilldownLoading(true);
    try {
      const res = await fetch(`/api/analytics/drilldown?from=${from}&to=${to}`);
      if (!res.ok) throw new Error("Failed to fetch drilldown");
      const data = await res.json();
      if (data && !data.error) setDrilldown(data);
    } catch (e) {
      console.error(e);
    } finally {
      setDrilldownLoading(false);
    }
  };

  useEffect(() => {
    if (tenantSlug) {
      fetchSummary();
      fetchDrilldown();
    }
  }, [tenantSlug, from, to]);

  // SVG chart points derived from drilldown.activityGraph
  const chartPoints = useMemo(() => {
    if (!drilldown?.activityGraph?.length) return [];
    const maxVal = Math.max(...drilldown.activityGraph.map((g) => g.count)) || 1;
    const height = 150;
    const width = 500;
    const paddingX = 40;
    const paddingY = 20;
    return drilldown.activityGraph.map((g, i) => {
      const x = paddingX + (i / (drilldown.activityGraph!.length - 1)) * (width - 2 * paddingX);
      const y = height - paddingY - (g.count / maxVal) * (height - 2 * paddingY);
      return { x, y, date: g.date, count: g.count };
    });
  }, [drilldown]);

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      {/* Header with date range */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Counselor Analytics</h1>
          <p className="text-muted-foreground mt-1">Your personal performance dashboard.</p>
        </div>
        <div className="flex items-center gap-3 bg-[var(--card-bg-color)] border border-[var(--card-border-color)] rounded-xl p-3 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Date Range:</span>
          </div>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="bg-transparent text-sm border-none focus:ring-0 focus:outline-none text-foreground cursor-pointer font-medium"
          />
          <span className="text-muted-foreground">to</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="bg-transparent text-sm border-none focus:ring-0 focus:outline-none text-foreground cursor-pointer font-medium"
          />
        </div>
      </div>

      {/* Summary cards row */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="border border-[var(--card-border-color)] bg-[var(--card-bg-color)]">
          <CardHeader className="pb-2">
            <CardTitle>Total Leads</CardTitle>
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
            ) : (
              <span className="text-2xl font-bold">{summary?.totalLeads ?? "-"}</span>
            )}
          </CardContent>
        </Card>
        <Card className="border border-[var(--card-border-color)] bg-[var(--card-bg-color)]">
          <CardHeader className="pb-2">
            <CardTitle>Active Leads</CardTitle>
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
            ) : (
              <span className="text-2xl font-bold">{summary?.activeLeads ?? "-"}</span>
            )}
          </CardContent>
        </Card>
        <Card className="border border-[var(--card-border-color)] bg-[var(--card-bg-color)]">
          <CardHeader className="pb-2">
            <CardTitle>Cold Leads</CardTitle>
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
            ) : (
              <span className="text-2xl font-bold">{summary?.coldLeads ?? "-"}</span>
            )}
          </CardContent>
        </Card>
        <Card className="border border-[var(--card-border-color)] bg-[var(--card-bg-color)]">
          <CardHeader className="pb-2">
            <CardTitle>Dead Leads</CardTitle>
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
            ) : (
              <span className="text-2xl font-bold">{summary?.deadLeads ?? "-"}</span>
            )}
          </CardContent>
        </Card>
        <Card className="border border-[var(--card-border-color)] bg-[var(--card-bg-color)]">
          <CardHeader className="pb-2">
            <CardTitle>Clocked Hours Today</CardTitle>
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
            ) : (
              <Badge variant="outline" className="px-2.5 py-0.5 border-indigo-200/50">
                {summary?.todayHours ?? "-"}h
              </Badge>
            )}
          </CardContent>
        </Card>
        <Card className="border border-[var(--card-border-color)] bg-[var(--card-bg-color)]">
          <CardHeader className="pb-2">
            <CardTitle>Edits Today</CardTitle>
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
            ) : (
              <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                {summary?.todayEdits ?? "-"}
              </span>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Drill‑down detail section */}
      {drilldownLoading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        </div>
      ) : drilldown ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left stats */}
          <Card className="border border-[var(--card-border-color)] bg-[var(--card-bg-color)] p-5">
            <div className="mb-4">
              <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
                Earliest Punch‑In Today
              </p>
              <div className="flex items-center gap-2 mt-1">
                <Clock className="h-4 w-4 text-indigo-600" />
                <span className="font-semibold text-foreground">
                  {drilldown.punchInToday
                    ? new Date(drilldown.punchInToday).toLocaleTimeString()
                    : "Not punched in today"}
                </span>
              </div>
            </div>
            <div className="mb-4">
              <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
                Total Clocked Hours (Range)
              </p>
              <div className="flex items-center gap-2 mt-1">
                <Clock className="h-4 w-4 text-indigo-600" />
                <span className="font-semibold text-foreground">
                  {drilldown.totalHours} hours
                </span>
              </div>
            </div>
            <div className="border rounded-xl p-4 space-y-3">
              <h3 className="font-semibold text-sm text-foreground flex items-center gap-1.5 border-b pb-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Leads Touched Today ({drilldown.leads.touchedToday.length})
              </h3>
              {drilldown.leads.touchedToday.length === 0 ? (
                <p className="text-xs text-muted-foreground">No leads touched today.</p>
              ) : (
                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {drilldown.leads.touchedToday.map((l) => (
                    <div
                      key={l.id}
                      className="flex justify-between items-center bg-muted/20 p-2.5 rounded-lg border border-border/40 hover:bg-muted/40 transition-colors"
                    >
                      <Link
                        href={`/t/${tenantSlug}/admin/leads/${l.id}`}
                        className="text-xs text-indigo-600 hover:underline font-semibold"
                      >
                        {l.fullName}
                      </Link>
                      <Badge variant="secondary" className="text-[10px] scale-90">
                        {l.stage.replace("_", " ")}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* Right 30‑day graph */}
          <Card className="lg:col-span-2 border border-[var(--card-border-color)] bg-[var(--card-bg-color)] p-5">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-indigo-500" />
                30‑Day Edit Activity History
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">Total saves/updates daily</p>
            </div>
            {chartPoints.length > 0 ? (
              <div className="flex-1 flex flex-col justify-center items-center">
                <svg viewBox="0 0 500 150" className="w-full h-44 mt-2 overflow-visible">
                  <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgb(99, 102, 241)" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="rgb(99, 102, 241)" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  {/* Grid lines */}
                  <line x1="40" y1="20" x2="460" y2="20" stroke="rgba(156, 163, 175, 0.15)" strokeDasharray="3,3" />
                  <line x1="40" y1="65" x2="460" y2="65" stroke="rgba(156, 163, 175, 0.15)" strokeDasharray="3,3" />
                  <line x1="40" y1="110" x2="460" y2="110" stroke="rgba(156, 163, 175, 0.15)" strokeDasharray="3,3" />
                  <line x1="40" y1="130" x2="460" y2="130" stroke="rgba(156, 163, 175, 0.3)" />
                  {/* Gradient area */}
                  <path
                    d={`M ${chartPoints[0].x} 130 ${chartPoints
                      .map((p) => `L ${p.x} ${p.y}`)
                      .join(" ")} L ${chartPoints[chartPoints.length - 1].x} 130 Z`}
                    fill="url(#chartGradient)"
                  />
                  {/* Trend line */}
                  <path
                    d={chartPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ")}
                    fill="none"
                    stroke="rgb(99, 102, 241)"
                    strokeWidth="2.5"
                  />
                  {/* Nodes */}
                  {chartPoints.map((p, i) => (
                    <g key={i} className="group cursor-pointer">
                      <circle cx={p.x} cy={p.y} r="3.5" fill="rgb(99, 102, 241)" className="transition-all hover:r-5 hover:fill-indigo-400" />
                      <title>{`${p.date}: ${p.count} edits`}</title>
                    </g>
                  ))}
                </svg>
                <div className="flex justify-between w-full px-10 text-[10px] text-muted-foreground mt-1 font-semibold">
                  <span>{chartPoints[0]?.date}</span>
                  <span>{chartPoints[Math.floor(chartPoints.length / 2)]?.date}</span>
                  <span>{chartPoints[chartPoints.length - 1]?.date}</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center">No activity data available.</p>
            )}
          </Card>
        </div>
      ) : null}
    </div>
  );
}
