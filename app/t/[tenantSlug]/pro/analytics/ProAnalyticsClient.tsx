"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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

export default function ProAnalyticsClient({ viewAll = false }: { viewAll?: boolean }) {
  const { tenantSlug } = useParams() as { tenantSlug: string };

  const todayStr = new Date().toISOString().split("T")[0];
  const [from, setFrom] = useState(todayStr);
  const [to, setTo] = useState(todayStr);

  const [summary, setSummary] = useState<Summary | null>(null);
  const [allSummaries, setAllSummaries] = useState<Summary[]>([]);
  const [selectedCounselorId, setSelectedCounselorId] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const [drilldown, setDrilldown] = useState<DrilldownPayload | null>(null);
  const [drilldownLoading, setDrilldownLoading] = useState(false);

  const fetchSummary = async () => {
    setSummaryLoading(true);
    try {
      const res = await fetch(`/api/analytics/summary?from=${from}&to=${to}`);
      if (!res.ok) throw new Error("Failed to fetch summary");
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        if (viewAll) {
          setAllSummaries(data);
          const activeId = selectedCounselorId ?? data[0].userId;
          setSelectedCounselorId(activeId);
          setSummary(data.find((row: Summary) => row.userId === activeId) ?? data[0]);
        } else {
          setSummary(data[0]);
          setAllSummaries([]);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSummaryLoading(false);
    }
  };

  const fetchDrilldown = async () => {
    setDrilldownLoading(true);
    try {
      const counselorQuery =
        viewAll && selectedCounselorId ? `&counselorId=${selectedCounselorId}` : "";
      const res = await fetch(`/api/analytics/drilldown?from=${from}&to=${to}${counselorQuery}`);
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
    }
  }, [tenantSlug, from, to, viewAll]);

  useEffect(() => {
    if (tenantSlug) {
      fetchDrilldown();
    }
  }, [tenantSlug, from, to, viewAll, selectedCounselorId]);

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
    <div className="flex-1 space-y-6 w-full pb-12 animate-in fade-in duration-500">
      {/* Header with date range */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[var(--card-border-color)] pb-6">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-[var(--text-strong)]">Counselor Analytics</h1>
          <p className="text-xs text-[var(--muted-text)] mt-1">
            {viewAll ? 'Team performance across all counselors.' : 'Your personal performance dashboard.'}
          </p>
        </div>
        <div className="flex items-center gap-3 bg-[var(--card-bg)] border-[0.5px] border-[var(--card-border-color)] rounded-[12px] p-3 shadow-crm-sm">
          <div className="flex items-center gap-2 text-xs text-[var(--muted-text)]">
            <Calendar className="h-4 w-4" />
            <span>Date Range:</span>
          </div>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="bg-transparent text-xs border-none focus:ring-0 focus:outline-none text-[var(--text-strong)] cursor-pointer font-medium"
          />
          <span className="text-xs text-[var(--muted-text)]">to</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="bg-transparent text-xs border-none focus:ring-0 focus:outline-none text-[var(--text-strong)] cursor-pointer font-medium"
          />
        </div>
      </div>

      {viewAll && allSummaries.length > 0 && (
        <Card className="border-[0.5px] border-[var(--card-border-color)] bg-[var(--card-bg)] shadow-crm-sm rounded-[12px] overflow-hidden">
          <CardHeader className="border-b border-[var(--card-border-color)] pb-3">
            <CardTitle className="text-sm font-semibold text-[var(--text-strong)]">All Counselors</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--card-border-color)] text-left text-xs text-[var(--muted-text)]">
                    <th className="px-4 py-3 font-medium">Counselor</th>
                    <th className="px-4 py-3 font-medium text-center">Total</th>
                    <th className="px-4 py-3 font-medium text-center">Active</th>
                    <th className="px-4 py-3 font-medium text-center">Cold</th>
                    <th className="px-4 py-3 font-medium text-center">Dead</th>
                    <th className="px-4 py-3 font-medium text-center">Hours Today</th>
                    <th className="px-4 py-3 font-medium text-center">Edits Today</th>
                  </tr>
                </thead>
                <tbody>
                  {allSummaries.map((row) => (
                    <tr
                      key={row.userId}
                      className={`border-b border-[var(--card-border-color)] cursor-pointer hover:bg-[var(--main-bg)] ${
                        selectedCounselorId === row.userId ? 'bg-indigo-500/5' : ''
                      }`}
                      onClick={() => {
                        setSelectedCounselorId(row.userId);
                        setSummary(row);
                      }}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-[var(--text-strong)]">{row.name}</div>
                        <div className="text-xs text-[var(--muted-text)]">{row.email}</div>
                      </td>
                      <td className="px-4 py-3 text-center">{row.totalLeads}</td>
                      <td className="px-4 py-3 text-center">{row.activeLeads}</td>
                      <td className="px-4 py-3 text-center">{row.coldLeads}</td>
                      <td className="px-4 py-3 text-center">{row.deadLeads}</td>
                      <td className="px-4 py-3 text-center">{row.todayHours}h</td>
                      <td className="px-4 py-3 text-center">{row.todayEdits}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary cards row */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { title: "Total Leads", val: summary?.totalLeads },
          { title: "Active Leads", val: summary?.activeLeads },
          { title: "Cold Leads", val: summary?.coldLeads },
          { title: "Dead Leads", val: summary?.deadLeads },
        ].map((item, idx) => (
          <Card key={idx} className="border-[0.5px] border-[var(--card-border-color)] bg-[var(--card-bg)] shadow-crm-sm rounded-[12px]">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-[var(--muted-text)] uppercase tracking-wider">{item.title}</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {summaryLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
              ) : (
                <span className="text-2xl font-bold text-[var(--text-strong)]">{item.val ?? "-"}</span>
              )}
            </CardContent>
          </Card>
        ))}

        <Card className="border-[0.5px] border-[var(--card-border-color)] bg-[var(--card-bg)] shadow-crm-sm rounded-[12px]">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-[var(--muted-text)] uppercase tracking-wider">Clocked Hours Today</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {summaryLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
            ) : (
              <Badge variant="outline" className="px-2.5 py-0.5 border-indigo-500/20 bg-indigo-500/10 text-indigo-500 text-xs font-medium rounded-full">
                {summary?.todayHours ?? "-"}h
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card className="border-[0.5px] border-[var(--card-border-color)] bg-[var(--card-bg)] shadow-crm-sm rounded-[12px]">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-[var(--muted-text)] uppercase tracking-wider">Edits Today</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {summaryLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
            ) : (
              <span className="text-2xl font-bold text-indigo-500">
                {summary?.todayEdits ?? "-"}
              </span>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Drill-down detail section */}
      {drilldownLoading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        </div>
      ) : drilldown ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left stats */}
          <Card className="border-[0.5px] border-[var(--card-border-color)] bg-[var(--card-bg)] shadow-crm-sm rounded-[12px] p-5 space-y-4">
            <div>
              <p className="text-[11px] text-[var(--muted-text)] uppercase font-semibold tracking-wider">
                Earliest Punch-In Today
              </p>
              <div className="flex items-center gap-2 mt-1">
                <Clock className="h-4 w-4 text-indigo-500" />
                <span className="text-sm font-medium text-[var(--text-strong)]">
                  {drilldown.punchInToday
                    ? new Date(drilldown.punchInToday).toLocaleTimeString()
                    : "Not punched in today"}
                </span>
              </div>
            </div>
            <div>
              <p className="text-[11px] text-[var(--muted-text)] uppercase font-semibold tracking-wider">
                Total Clocked Hours (Range)
              </p>
              <div className="flex items-center gap-2 mt-1">
                <Clock className="h-4 w-4 text-indigo-500" />
                <span className="text-sm font-medium text-[var(--text-strong)]">
                  {drilldown.totalHours} hours
                </span>
              </div>
            </div>
            <div className="border-[0.5px] border-[var(--card-border-color)] bg-[var(--main-bg)] rounded-[8px] p-4 space-y-3">
              <h3 className="font-medium text-xs text-[var(--text-strong)] flex items-center gap-1.5 border-b border-[var(--card-border-color)] pb-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Leads Touched Today ({drilldown.leads.touchedToday.length})
              </h3>
              {drilldown.leads.touchedToday.length === 0 ? (
                <p className="text-xs text-[var(--muted-text)]">No leads touched today.</p>
              ) : (
                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {drilldown.leads.touchedToday.map((l) => (
                    <div
                      key={l.id}
                      className="flex justify-between items-center bg-[var(--card-bg)] p-2.5 rounded-[6px] border-[0.5px] border-[var(--card-border-color)] hover:opacity-80 transition-opacity"
                    >
                      <Link
                        href={`/t/${tenantSlug}/pro/leads/${l.id}`}
                        className="text-xs text-indigo-500 hover:underline font-medium"
                      >
                        {l.fullName}
                      </Link>
                      <Badge variant="secondary" className="text-[10px] scale-90 bg-[var(--main-bg)] text-[var(--text-strong)] border-[0.5px] border-[var(--card-border-color)]">
                        {l.stage.replace("_", " ")}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* Right 30-day graph */}
          <Card className="lg:col-span-2 border-[0.5px] border-[var(--card-border-color)] bg-[var(--card-bg)] shadow-crm-sm rounded-[12px] p-5">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-medium text-xs text-[var(--text-strong)] flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-indigo-500" />
                30-Day Edit Activity History
              </h3>
              <p className="text-[11px] text-[var(--muted-text)]">Total saves/updates daily</p>
            </div>
            {chartPoints.length > 0 ? (
              <div className="flex-1 flex flex-col justify-center items-center">
                <svg viewBox="0 0 500 150" className="w-full h-44 mt-2 overflow-visible">
                  <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgb(99, 102, 241)" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="rgb(99, 102, 241)" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <line x1="40" y1="20" x2="460" y2="20" stroke="var(--card-border-color)" strokeDasharray="3,3" opacity="0.4" />
                  <line x1="40" y1="65" x2="460" y2="65" stroke="var(--card-border-color)" strokeDasharray="3,3" opacity="0.4" />
                  <line x1="40" y1="110" x2="460" y2="110" stroke="var(--card-border-color)" strokeDasharray="3,3" opacity="0.4" />
                  <line x1="40" y1="130" x2="460" y2="130" stroke="var(--card-border-color)" opacity="0.6" />
                  <path
                    d={`M ${chartPoints[0].x} 130 ${chartPoints
                      .map((p) => `L ${p.x} ${p.y}`)
                      .join(" ")} L ${chartPoints[chartPoints.length - 1].x} 130 Z`}
                    fill="url(#chartGradient)"
                  />
                  <path
                    d={chartPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ")}
                    fill="none"
                    stroke="rgb(99, 102, 241)"
                    strokeWidth="2"
                  />
                  {chartPoints.map((p, i) => (
                    <g key={i} className="group cursor-pointer">
                      <circle cx={p.x} cy={p.y} r="3" fill="rgb(99, 102, 241)" className="transition-all hover:r-4" />
                      <title>{`${p.date}: ${p.count} edits`}</title>
                    </g>
                  ))}
                </svg>
                <div className="flex justify-between w-full px-10 text-[10px] text-[var(--muted-text)] mt-1 font-medium">
                  <span>{chartPoints[0]?.date}</span>
                  <span>{chartPoints[Math.floor(chartPoints.length / 2)]?.date}</span>
                  <span>{chartPoints[chartPoints.length - 1]?.date}</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-[var(--muted-text)] text-center py-12">No activity data available.</p>
            )}
          </Card>
        </div>
      ) : null}
    </div>
  );
}