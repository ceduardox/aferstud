import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { Agent } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock,
  Copy,
  FileText,
  Loader2,
  MapPin,
  PhoneCall,
  PhoneIncoming,
  PhoneMissed,
  Sparkles,
  TrendingUp,
  User2,
} from "lucide-react";
import { cn } from "@/lib/utils";

type CityKey = "santaCruz" | "laPaz" | "cochabamba" | "tarija";
type ProductKey = "citrato" | "berberina" | "berberina2";

type ReportCalls = {
  made: number;
  answered: number;
  missed: number;
  pending: number;
};

type ReportPayload = {
  reportDate: string;
  operatorName: string;
  calls: ReportCalls;
  salesByCity: Record<CityKey, Record<ProductKey, number>>;
};

const CITIES: Array<{ key: CityKey; label: string }> = [
  { key: "santaCruz", label: "Santa Cruz" },
  { key: "laPaz", label: "La Paz" },
  { key: "cochabamba", label: "Cochabamba" },
  { key: "tarija", label: "Tarija" },
];

const PRODUCTS: Array<{ key: ProductKey; label: string }> = [
  { key: "citrato", label: "Citrato de Magnesio" },
  { key: "berberina", label: "Berberina" },
  { key: "berberina2", label: "Berberina 2.0" },
];

const dayNames = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];

function formatReportDate(value: string) {
  if (!value) return "";
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  const day = dayNames[parsed.getDay()] || "";
  const dd = String(parsed.getDate()).padStart(2, "0");
  const mm = String(parsed.getMonth() + 1).padStart(2, "0");
  const yyyy = parsed.getFullYear();
  return `${day} ${dd}/${mm}/${yyyy}`;
}

function parseCount(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
  }
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function createEmptySalesByCity(): Record<CityKey, Record<ProductKey, string>> {
  return {
    santaCruz: { citrato: "0", berberina: "0", berberina2: "0" },
    laPaz: { citrato: "0", berberina: "0", berberina2: "0" },
    cochabamba: { citrato: "0", berberina: "0", berberina2: "0" },
    tarija: { citrato: "0", berberina: "0", berberina2: "0" },
  };
}

function normalizeSalesByCityNumbers(raw?: Record<string, Record<string, number>>) {
  const base: Record<CityKey, Record<ProductKey, number>> = {
    santaCruz: { citrato: 0, berberina: 0, berberina2: 0 },
    laPaz: { citrato: 0, berberina: 0, berberina2: 0 },
    cochabamba: { citrato: 0, berberina: 0, berberina2: 0 },
    tarija: { citrato: 0, berberina: 0, berberina2: 0 },
  };

  if (!raw) return base;

  CITIES.forEach(({ key }) => {
    PRODUCTS.forEach((product) => {
      const value = (raw as any)?.[key]?.[product.key];
      base[key][product.key] = parseCount(value);
    });
  });

  return base;
}

function normalizeSalesByCityStrings(raw?: Record<string, Record<string, number>>) {
  const base = createEmptySalesByCity();
  if (!raw) return base;
  CITIES.forEach(({ key }) => {
    PRODUCTS.forEach((product) => {
      const value = (raw as any)?.[key]?.[product.key];
      base[key][product.key] = String(parseCount(value));
    });
  });
  return base;
}

function buildReportText(data: ReportPayload) {
  const lines: string[] = [];
  lines.push("INFORME");
  const formattedDate = formatReportDate(data.reportDate);
  if (formattedDate) {
    lines.push(formattedDate);
  }
  if (data.operatorName.trim()) {
    lines.push(`OPERADOR: ${data.operatorName.trim()}`);
  }

  const callLines = [
    { label: "Llamadas realizadas", value: parseCount(data.calls.made) },
    { label: "Llamadas contestadas", value: parseCount(data.calls.answered) },
    { label: "No contestada", value: parseCount(data.calls.missed) },
    { label: "Pendientes", value: parseCount(data.calls.pending) },
  ].filter((item) => item.value > 0);

  if (callLines.length > 0) {
    lines.push("");
    callLines.forEach((item) => lines.push(`${item.label}: ${item.value}`));
  }

  const totalsByCity: Record<CityKey, number> = {
    santaCruz: 0,
    laPaz: 0,
    cochabamba: 0,
    tarija: 0,
  };
  CITIES.forEach(({ key }) => {
    const city = data.salesByCity[key];
    totalsByCity[key] = PRODUCTS.reduce((sum, product) => sum + parseCount(city[product.key]), 0);
  });

  CITIES.forEach(({ key, label }) => {
    const totalCity = totalsByCity[key];
    if (totalCity <= 0) return;
    lines.push("");
    lines.push(`VENTAS ${label.toUpperCase()}: ${totalCity}`);
    PRODUCTS.forEach((product) => {
      const value = parseCount(data.salesByCity[key][product.key]);
      if (value <= 0) return;
      lines.push(`${product.label}: ${value}`);
    });
  });

  const totalSales = CITIES.reduce((sum, city) => sum + totalsByCity[city.key], 0);
  lines.push("");
  lines.push(`Total Ventas: ${totalSales}`);

  return lines.join("\n").trim();
}

export default function ReportPage() {
  const { toast } = useToast();
  const { isAdmin, isAgent } = useAuth();
  const today = new Date();
  const todayValue = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const [reportDate, setReportDate] = useState(todayValue);
  const [operatorName, setOperatorName] = useState("");
  const [callsMade, setCallsMade] = useState("0");
  const [callsAnswered, setCallsAnswered] = useState("0");
  const [callsMissed, setCallsMissed] = useState("0");
  const [callsPending, setCallsPending] = useState("0");

  const [salesByCity, setSalesByCity] = useState<Record<CityKey, Record<ProductKey, string>>>(() => createEmptySalesByCity());

  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const saveTimerRef = useRef<number | null>(null);
  const lastPayloadRef = useRef<string>("");

  const [adminDate, setAdminDate] = useState(todayValue);
  const [adminAgentId, setAdminAgentId] = useState<number | null>(null);

  const canEdit = isAgent;
  const cardBase = "border-slate-700/50 bg-slate-900/55 backdrop-blur-sm rounded-2xl shadow-[0_18px_40px_rgba(2,6,23,.45)]";
  const inputBase = "bg-slate-900/70 border-slate-600/60 text-white placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-0";
  const textareaBase = "bg-slate-950/70 border-slate-700/60 text-slate-100 text-sm shadow-inner";
  const tileBase = "rounded-2xl border border-slate-700/60 bg-slate-900/45 p-3 space-y-2 shadow-lg shadow-black/20";
  const sectionIconBase = "h-9 w-9 rounded-xl flex items-center justify-center shadow-lg";

  const salesByCityNumbers = useMemo(() => {
    const values: Record<CityKey, Record<ProductKey, number>> = {
      santaCruz: { citrato: 0, berberina: 0, berberina2: 0 },
      laPaz: { citrato: 0, berberina: 0, berberina2: 0 },
      cochabamba: { citrato: 0, berberina: 0, berberina2: 0 },
      tarija: { citrato: 0, berberina: 0, berberina2: 0 },
    };
    CITIES.forEach(({ key }) => {
      PRODUCTS.forEach((product) => {
        values[key][product.key] = parseCount(salesByCity[key][product.key]);
      });
    });
    return values;
  }, [salesByCity]);

  const totalsByCity = useMemo(() => {
    const totals: Record<CityKey, number> = {
      santaCruz: 0,
      laPaz: 0,
      cochabamba: 0,
      tarija: 0,
    };
    CITIES.forEach(({ key }) => {
      const city = salesByCityNumbers[key];
      totals[key] = PRODUCTS.reduce((sum, product) => sum + parseCount(city[product.key]), 0);
    });
    return totals;
  }, [salesByCityNumbers]);

  const totalSales = useMemo(() => {
    return CITIES.reduce((sum, city) => sum + totalsByCity[city.key], 0);
  }, [totalsByCity]);

  const currentPayload = useMemo<ReportPayload>(() => ({
    reportDate,
    operatorName: operatorName.trim(),
    calls: {
      made: parseCount(callsMade),
      answered: parseCount(callsAnswered),
      missed: parseCount(callsMissed),
      pending: parseCount(callsPending),
    },
    salesByCity: salesByCityNumbers,
  }), [reportDate, operatorName, callsMade, callsAnswered, callsMissed, callsPending, salesByCityNumbers]);

  const reportText = useMemo(() => buildReportText(currentPayload), [currentPayload]);
  const callTotals = currentPayload.calls;
  const answerRate = callTotals.made > 0 ? Math.round((callTotals.answered / callTotals.made) * 100) : 0;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(reportText);
      toast({ title: "Reporte copiado" });
    } catch (error) {
      toast({ title: "No se pudo copiar", variant: "destructive" });
    }
  };

  const updateCityValue = (cityKey: CityKey, productKey: ProductKey, value: string) => {
    setSalesByCity((prev) => ({
      ...prev,
      [cityKey]: {
        ...prev[cityKey],
        [productKey]: value,
      },
    }));
  };

  const applyReportData = (report: ReportPayload | null, fallbackOperatorName?: string | null) => {
    const nextOperator = report?.operatorName?.trim() || fallbackOperatorName?.trim() || "";
    const nextCalls = report?.calls || { made: 0, answered: 0, missed: 0, pending: 0 };
    const nextSales = report?.salesByCity ? normalizeSalesByCityStrings(report.salesByCity) : createEmptySalesByCity();

    setOperatorName(nextOperator);
    setCallsMade(String(nextCalls.made ?? 0));
    setCallsAnswered(String(nextCalls.answered ?? 0));
    setCallsMissed(String(nextCalls.missed ?? 0));
    setCallsPending(String(nextCalls.pending ?? 0));
    setSalesByCity(nextSales);

    const baselinePayload: ReportPayload = {
      reportDate,
      operatorName: nextOperator,
      calls: {
        made: parseCount(nextCalls.made),
        answered: parseCount(nextCalls.answered),
        missed: parseCount(nextCalls.missed),
        pending: parseCount(nextCalls.pending),
      },
      salesByCity: normalizeSalesByCityNumbers(report?.salesByCity),
    };

    lastPayloadRef.current = JSON.stringify(baselinePayload);
  };

  useEffect(() => {
    if (!isAgent) return;
    let cancelled = false;
    setIsHydrated(false);
    setSaveStatus("idle");

    const loadReport = async () => {
      try {
        const res = await fetch(`/api/reports/me?date=${encodeURIComponent(reportDate)}`);
        if (!res.ok) throw new Error("No se pudo cargar reporte");
        const data = await res.json();
        if (cancelled) return;
        applyReportData(data?.report || null, data?.latestOperatorName || null);
      } catch (error) {
        if (!cancelled) {
          toast({ title: "Error", description: "No se pudo cargar reporte", variant: "destructive" });
        }
      } finally {
        if (!cancelled) {
          setIsHydrated(true);
        }
      }
    };

    void loadReport();

    return () => {
      cancelled = true;
    };
  }, [isAgent, reportDate, toast]);

  useEffect(() => {
    if (!canEdit || !isHydrated) return;

    const payload = currentPayload;
    const payloadKey = JSON.stringify(payload);
    if (payloadKey === lastPayloadRef.current) return;

    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }

    setSaveStatus("saving");
    saveTimerRef.current = window.setTimeout(async () => {
      try {
        const res = await fetch("/api/reports/me", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("No se pudo guardar");
        lastPayloadRef.current = payloadKey;
        setSaveStatus("saved");
        setLastSavedAt(new Date().toISOString());
      } catch (error) {
        setSaveStatus("error");
        toast({ title: "Error", description: "No se pudo guardar el reporte", variant: "destructive" });
      }
    }, 800);

    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, [canEdit, currentPayload, isHydrated, toast]);

  const { data: agents = [] } = useQuery<Agent[]>({
    queryKey: ["/api/agents", "report"],
    enabled: isAdmin,
    queryFn: async () => {
      const res = await fetch("/api/agents");
      if (!res.ok) throw new Error("No se pudo cargar agentes");
      return res.json();
    },
  });

  useEffect(() => {
    if (!isAdmin) return;
    if (agents.length > 0 && adminAgentId === null) {
      setAdminAgentId(agents[0].id);
    }
  }, [agents, adminAgentId, isAdmin]);

  const { data: adminReportResponse, isLoading: adminReportLoading } = useQuery<{
    report: ReportPayload | null;
  }>({
    queryKey: ["/api/reports/agent", adminAgentId, adminDate],
    enabled: isAdmin && Number.isInteger(adminAgentId),
    queryFn: async () => {
      const res = await fetch(`/api/reports/agent/${adminAgentId}?date=${encodeURIComponent(adminDate)}`);
      if (!res.ok) throw new Error("No se pudo cargar reporte");
      return res.json();
    },
  });

  const adminReport = adminReportResponse?.report
    ? {
        ...adminReportResponse.report,
        salesByCity: normalizeSalesByCityNumbers(adminReportResponse.report.salesByCity),
      }
    : null;
  const adminReportText = adminReport ? buildReportText(adminReport) : "Sin reporte para esta fecha.";

  const lastSavedLabel = useMemo(() => {
    if (!lastSavedAt) return "";
    try {
      return new Date(lastSavedAt).toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  }, [lastSavedAt]);

  const handleCopyAdmin = async () => {
    try {
      await navigator.clipboard.writeText(adminReportText);
      toast({ title: "Reporte copiado" });
    } catch (error) {
      toast({ title: "No se pudo copiar", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-foreground flex flex-col relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-24 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.12),_transparent_55%)]" />
      </div>
      <div className="relative z-10 flex flex-col min-h-screen">
        <div className="flex flex-col gap-3 px-4 py-4 border-b border-emerald-500/20 bg-slate-900/70 backdrop-blur-xl md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon" className="text-slate-200 hover:text-white" data-testid="button-back-report">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <FileText className="h-5 w-5 text-slate-950" />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-semibold text-white">Informe diario</h1>
              <p className="text-xs text-slate-400">Resume llamadas y ventas por ciudad.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canEdit && (
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
                  saveStatus === "saving" && "border-amber-500/40 bg-amber-500/10 text-amber-200",
                  saveStatus === "saved" && "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
                  saveStatus === "error" && "border-rose-500/40 bg-rose-500/10 text-rose-200",
                  saveStatus === "idle" && "border-slate-600/60 bg-slate-800/60 text-slate-300",
                )}
              >
                {saveStatus === "saving" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {saveStatus === "saved" && <CheckCircle2 className="h-3.5 w-3.5" />}
                {saveStatus === "error" && <AlertTriangle className="h-3.5 w-3.5" />}
                {saveStatus === "idle" && <Sparkles className="h-3.5 w-3.5" />}
                {saveStatus === "saving" && "Guardando..."}
                {saveStatus === "saved" && `Guardado${lastSavedLabel ? ` ${lastSavedLabel}` : ""}`}
                {saveStatus === "error" && "Error al guardar"}
                {saveStatus === "idle" && "Auto-guardado"}
              </span>
            )}
            {!canEdit && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-600/60 bg-slate-800/60 px-3 py-1 text-xs text-slate-300">
                Solo lectura
              </span>
            )}
            {reportDate && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-600/60 bg-slate-800/60 px-3 py-1 text-xs text-slate-200">
                <CalendarDays className="h-3.5 w-3.5 text-emerald-300" />
                {formatReportDate(reportDate)}
              </span>
            )}
          </div>
        </div>

        <div className="flex-1 w-full p-4 md:p-6 grid gap-4 lg:grid-cols-[1fr_380px]">
          <div className="space-y-3">
          <Card className={cn(cardBase, "transition-all duration-300 hover:shadow-2xl hover:shadow-black/40")}>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={cn(sectionIconBase, "bg-gradient-to-br from-emerald-500 to-cyan-500 text-slate-950 shadow-emerald-500/30")}>
                  <CalendarDays className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base text-white">Datos generales</CardTitle>
                  <p className="text-xs text-slate-400">Fecha del informe y operador asignado.</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="report-date" className="text-xs uppercase tracking-wide text-slate-300 flex items-center gap-2">
                  <CalendarDays className="h-3.5 w-3.5 text-emerald-300" />
                  Fecha
                </Label>
                <Input
                  id="report-date"
                  type="date"
                  value={reportDate}
                  onChange={(e) => setReportDate(e.target.value)}
                  disabled={!canEdit}
                  className={inputBase}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="operator-name" className="text-xs uppercase tracking-wide text-slate-300 flex items-center gap-2">
                  <User2 className="h-3.5 w-3.5 text-cyan-300" />
                  Operador
                </Label>
                <Input
                  id="operator-name"
                  placeholder="Nombre completo"
                  value={operatorName}
                  onChange={(e) => setOperatorName(e.target.value)}
                  disabled={!canEdit}
                  className={inputBase}
                />
              </div>
            </CardContent>
          </Card>

          <Card className={cn(cardBase, "transition-all duration-300 hover:shadow-2xl hover:shadow-black/40")}>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={cn(sectionIconBase, "bg-gradient-to-br from-cyan-500 to-blue-500 text-slate-950 shadow-cyan-500/30")}>
                  <PhoneCall className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base text-white">Llamadas</CardTitle>
                  <p className="text-xs text-slate-400">Actividad telefonica del dia.</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-600/60 bg-slate-900/60 px-2.5 py-1 text-xs text-slate-200">
                <PhoneCall className="h-3.5 w-3.5 text-cyan-300" />
                Total {callTotals.made}
              </span>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className={cn(tileBase, "border-emerald-500/20")}>
                <Label htmlFor="calls-made" className="text-xs uppercase tracking-wide text-slate-300 flex items-center gap-2">
                  <span className="h-7 w-7 rounded-lg border border-emerald-500/30 bg-emerald-500/15 flex items-center justify-center text-emerald-300">
                    <PhoneCall className="h-4 w-4" />
                  </span>
                  Realizadas
                </Label>
                <Input
                  id="calls-made"
                  type="number"
                  min={0}
                  step={1}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={callsMade}
                  onChange={(e) => setCallsMade(e.target.value)}
                  placeholder="Ej: 27"
                  disabled={!canEdit}
                  className={inputBase}
                />
                <p className="text-[11px] text-slate-500">Total de llamadas del dia.</p>
              </div>
              <div className={cn(tileBase, "border-cyan-500/20")}>
                <Label htmlFor="calls-answered" className="text-xs uppercase tracking-wide text-slate-300 flex items-center gap-2">
                  <span className="h-7 w-7 rounded-lg border border-cyan-500/30 bg-cyan-500/15 flex items-center justify-center text-cyan-300">
                    <PhoneIncoming className="h-4 w-4" />
                  </span>
                  Contestadas
                </Label>
                <Input
                  id="calls-answered"
                  type="number"
                  min={0}
                  step={1}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={callsAnswered}
                  onChange={(e) => setCallsAnswered(e.target.value)}
                  placeholder="Ej: 13"
                  disabled={!canEdit}
                  className={inputBase}
                />
                <p className="text-[11px] text-slate-500">Llamadas con respuesta.</p>
              </div>
              <div className={cn(tileBase, "border-rose-500/20")}>
                <Label htmlFor="calls-missed" className="text-xs uppercase tracking-wide text-slate-300 flex items-center gap-2">
                  <span className="h-7 w-7 rounded-lg border border-rose-500/30 bg-rose-500/15 flex items-center justify-center text-rose-300">
                    <PhoneMissed className="h-4 w-4" />
                  </span>
                  No contestada
                </Label>
                <Input
                  id="calls-missed"
                  type="number"
                  min={0}
                  step={1}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={callsMissed}
                  onChange={(e) => setCallsMissed(e.target.value)}
                  placeholder="Ej: 19"
                  disabled={!canEdit}
                  className={inputBase}
                />
                <p className="text-[11px] text-slate-500">Sin respuesta del cliente.</p>
              </div>
              <div className={cn(tileBase, "border-amber-500/20")}>
                <Label htmlFor="calls-pending" className="text-xs uppercase tracking-wide text-slate-300 flex items-center gap-2">
                  <span className="h-7 w-7 rounded-lg border border-amber-500/30 bg-amber-500/15 flex items-center justify-center text-amber-300">
                    <Clock className="h-4 w-4" />
                  </span>
                  Pendientes
                </Label>
                <Input
                  id="calls-pending"
                  type="number"
                  min={0}
                  step={1}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={callsPending}
                  onChange={(e) => setCallsPending(e.target.value)}
                  placeholder="Ej: 0"
                  disabled={!canEdit}
                  className={inputBase}
                />
                <p className="text-[11px] text-slate-500">Por llamar o reintentar.</p>
              </div>
            </CardContent>
          </Card>

          <Card className={cn(cardBase, "transition-all duration-300 hover:shadow-2xl hover:shadow-black/40")}>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={cn(sectionIconBase, "bg-gradient-to-br from-emerald-500 to-teal-500 text-slate-950 shadow-emerald-500/30")}>
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base text-white">Ventas por ciudad</CardTitle>
                  <p className="text-xs text-slate-400">Detalle por producto y zona.</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200">
                <TrendingUp className="h-3.5 w-3.5" />
                Total ventas {totalSales}
              </span>
            </CardHeader>
            <CardContent className="grid grid-cols-1 xl:grid-cols-2 gap-3">
              {CITIES.map((city) => (
                <div key={city.key} className="group relative rounded-2xl border border-slate-700/60 bg-slate-900/45 p-3 shadow-lg shadow-black/20 overflow-hidden">
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg border border-slate-600/60 bg-slate-900/70 flex items-center justify-center text-slate-300 group-hover:text-emerald-300">
                        <MapPin className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-white">{city.label}</h3>
                        <p className="text-[11px] text-slate-400">Ventas por producto</p>
                      </div>
                    </div>
                    <span className="text-xs text-slate-300 rounded-full border border-slate-600/60 bg-slate-900/70 px-2.5 py-1">
                      Total {totalsByCity[city.key]}
                    </span>
                  </div>
                  <div className="relative grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {PRODUCTS.map((product) => (
                      <div key={product.key} className="space-y-1">
                        <Label htmlFor={`${city.key}-${product.key}`} className="text-[11px] uppercase tracking-wide text-slate-300">
                          {product.label}
                        </Label>
                        <Input
                          id={`${city.key}-${product.key}`}
                          type="number"
                          min={0}
                          step={1}
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={salesByCity[city.key][product.key]}
                          onChange={(e) => updateCityValue(city.key, product.key, e.target.value)}
                          placeholder="0"
                          disabled={!canEdit}
                          className={inputBase}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {canEdit && (
            <Card className={cn(cardBase, "transition-all duration-300 hover:shadow-2xl hover:shadow-black/40")}>
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={cn(sectionIconBase, "bg-gradient-to-br from-emerald-500 to-cyan-500 text-slate-950 shadow-emerald-500/30")}>
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base text-white">Resumen rapido</CardTitle>
                    <p className="text-xs text-slate-400">Indicadores clave del dia.</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-200">
                  {answerRate}% respuesta
                </span>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-3">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <TrendingUp className="h-4 w-4 text-emerald-300" />
                    Total ventas
                  </div>
                  <div className="text-2xl font-semibold text-white">{totalSales}</div>
                </div>
                <div className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-3">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <PhoneCall className="h-4 w-4 text-cyan-300" />
                    Llamadas
                  </div>
                  <div className="text-2xl font-semibold text-white">{callTotals.made}</div>
                </div>
                <div className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-3">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <PhoneIncoming className="h-4 w-4 text-emerald-300" />
                    Contestadas
                  </div>
                  <div className="text-2xl font-semibold text-white">{callTotals.answered}</div>
                </div>
                <div className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-3">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <PhoneMissed className="h-4 w-4 text-rose-300" />
                    No contestadas
                  </div>
                  <div className="text-2xl font-semibold text-white">{callTotals.missed}</div>
                </div>
              </CardContent>
            </Card>
          )}

          {isAdmin && (
            <Card className={cn(cardBase, "transition-all duration-300 hover:shadow-2xl hover:shadow-black/40")}>
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={cn(sectionIconBase, "bg-gradient-to-br from-violet-500 to-fuchsia-500 text-slate-950 shadow-violet-500/30")}>
                    <ClipboardList className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base text-white">Reporte por agente</CardTitle>
                    <p className="text-xs text-slate-400">Consulta por fecha y agente.</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="admin-report-date" className="text-xs uppercase tracking-wide text-slate-300 flex items-center gap-2">
                    <CalendarDays className="h-3.5 w-3.5 text-emerald-300" />
                    Fecha
                  </Label>
                  <Input
                    id="admin-report-date"
                    type="date"
                    value={adminDate}
                    onChange={(e) => setAdminDate(e.target.value)}
                    className={inputBase}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wide text-slate-300 flex items-center gap-2">
                    <User2 className="h-3.5 w-3.5 text-cyan-300" />
                    Agente
                  </Label>
                  <Select
                    value={adminAgentId ? String(adminAgentId) : ""}
                    onValueChange={(value) => setAdminAgentId(Number(value))}
                  >
                    <SelectTrigger className={inputBase}>
                      <SelectValue placeholder="Seleccione agente" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700 text-slate-200">
                      {agents.map((agent) => (
                        <SelectItem key={agent.id} value={String(agent.id)}>
                          {agent.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">
                    {adminReportLoading ? "Cargando..." : adminReport ? "Reporte encontrado" : "Sin reporte"}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyAdmin}
                    disabled={!adminReport}
                    className="border-slate-600/60 text-slate-200 hover:bg-slate-800/70"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar
                  </Button>
                </div>
                <Textarea
                  value={adminReportText}
                  readOnly
                  className={cn(textareaBase, "min-h-[280px]")}
                />
              </CardContent>
            </Card>
          )}

          {canEdit && (
            <Card className={cn(cardBase, "sticky top-4 transition-all duration-300 hover:shadow-2xl hover:shadow-black/40")}>
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={cn(sectionIconBase, "bg-gradient-to-br from-emerald-500 to-cyan-500 text-slate-950 shadow-emerald-500/30")}>
                    <ClipboardList className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base text-white">Texto para copiar</CardTitle>
                    <p className="text-xs text-slate-400">Se actualiza en vivo.</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  className="border-emerald-500/40 text-emerald-100 hover:bg-emerald-500/10"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar
                </Button>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={reportText}
                  readOnly
                  className={cn(textareaBase, "min-h-[360px]")}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  </div>
  );
}


