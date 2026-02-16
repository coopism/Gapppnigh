import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  BarChart3, Users, DollarSign, Calendar, TrendingUp, Shield,
  Activity, Settings, LogOut, Search, Plus, Trash2, Eye,
  AlertCircle, CheckCircle, Loader2, Gift, Star, MapPin,
  Building2, Home, CreditCard, FileText, Bell, Headphones,
  Flag, ClipboardList, ChevronRight, Menu, X, UserCog,
  Ban, MessageSquare, ToggleLeft, Globe, Megaphone,
  BookOpen, Ticket, PanelLeftClose, PanelLeft, Stethoscope,
  RefreshCw, Database, ServerCrash, ShieldAlert
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

// Obfuscated admin API prefix
const ADMIN_API = "/api/x9k2p7m4";

// ========================================
// SAFE FETCH HELPER — wraps every API call
// ========================================
async function adminFetch(path: string, options?: RequestInit): Promise<{ ok: boolean; data: any; status: number; error?: string }> {
  try {
    const res = await fetch(`${ADMIN_API}${path}`, { credentials: "include", ...options });
    if (res.ok) {
      const data = await res.json();
      return { ok: true, data, status: res.status };
    }
    // Handle specific error codes
    let errorMsg = "";
    try {
      const errBody = await res.json();
      errorMsg = errBody.message || "";
    } catch {}
    if (!errorMsg) {
      if (res.status === 403) errorMsg = "You don't have permission to access this resource";
      else if (res.status === 401) errorMsg = "Session expired — please log in again";
      else errorMsg = `Request failed (${res.status})`;
    }
    return { ok: false, data: null, status: res.status, error: errorMsg };
  } catch (e: any) {
    return { ok: false, data: null, status: 0, error: e.message || "Network error" };
  }
}

// Reusable error state component
function ErrorState({ error, onRetry }: { error: string; onRetry?: () => void }) {
  return (
    <div className="text-center py-8">
      <ShieldAlert className="w-8 h-8 mx-auto mb-2 text-red-400" />
      <p className="text-sm text-red-600 mb-2">{error}</p>
      {onRetry && <Button size="sm" variant="outline" onClick={onRetry}><RefreshCw className="w-3 h-3 mr-1" /> Retry</Button>}
    </div>
  );
}

// ========================================
// SIDEBAR NAV CONFIGURATION
// ========================================

interface NavItem {
  id: string;
  label: string;
  icon: any;
  children?: { id: string; label: string }[];
}

const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: BarChart3 },
  { id: "properties", label: "Properties", icon: Home, children: [
    { id: "properties-all", label: "All Properties" },
    { id: "properties-pending", label: "Pending Approval" },
  ]},
  { id: "bookings", label: "Bookings", icon: Calendar, children: [
    { id: "bookings-all", label: "All Bookings" },
    { id: "bookings-legacy", label: "Deal Bookings" },
  ]},
  { id: "users", label: "Users & Trust", icon: Users, children: [
    { id: "users-all", label: "All Users" },
    { id: "users-hosts", label: "Hosts" },
  ]},
  { id: "payments", label: "Payments", icon: CreditCard },
  { id: "promos", label: "Promotions", icon: Gift },
  { id: "content", label: "Content (CMS)", icon: FileText, children: [
    { id: "content-cities", label: "City Pages" },
    { id: "content-banners", label: "Banners" },
    { id: "content-pages", label: "Static Pages" },
  ]},
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "support", label: "Support", icon: Headphones },
  { id: "system", label: "System", icon: Settings, children: [
    { id: "system-flags", label: "Feature Flags" },
    { id: "system-config", label: "Site Config" },
    { id: "system-admins", label: "Admin Users" },
    { id: "system-health", label: "System Health" },
    { id: "system-diagnostics", label: "Diagnostics" },
  ]},
  { id: "audit", label: "Audit Logs", icon: ClipboardList },
];

// ========================================
// MAIN ADMIN DASHBOARD
// ========================================

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const [admin, setAdmin] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activePage, setActivePage] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedNav, setExpandedNav] = useState<string[]>(["properties", "system"]);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch(`${ADMIN_API}/me`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setAdmin(data.admin);
      } else {
        setLocation("/admin/login");
      }
    } catch (error) {
      setLocation("/admin/login");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch(`${ADMIN_API}/logout`, { method: "POST", credentials: "include" });
      setLocation("/admin/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const toggleNavExpand = (id: string) => {
    setExpandedNav(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
          <span className="text-sm text-slate-400">Loading admin console...</span>
        </div>
      </div>
    );
  }

  if (!admin) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-16'} bg-slate-900 text-white flex flex-col transition-all duration-200 fixed h-full z-40`}>
        {/* Logo */}
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-indigo-400" />
              <span className="font-bold text-sm">GapNight Ops</span>
            </div>
          )}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1 hover:bg-slate-800 rounded">
            {sidebarOpen ? <PanelLeftClose className="w-4 h-4 text-slate-400" /> : <PanelLeft className="w-4 h-4 text-slate-400" />}
          </button>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 overflow-y-auto py-2">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const isActive = activePage === item.id || activePage.startsWith(item.id + "-");
            const isExpanded = expandedNav.includes(item.id);

            return (
              <div key={item.id}>
                <button
                  onClick={() => {
                    if (item.children) {
                      toggleNavExpand(item.id);
                      if (!isActive) setActivePage(item.children[0].id);
                    } else {
                      setActivePage(item.id);
                    }
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                    isActive ? 'bg-indigo-600/20 text-indigo-300 border-r-2 border-indigo-400' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                  title={!sidebarOpen ? item.label : undefined}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {sidebarOpen && (
                    <>
                      <span className="flex-1 text-left">{item.label}</span>
                      {item.children && (
                        <ChevronRight className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                      )}
                    </>
                  )}
                </button>
                {sidebarOpen && item.children && isExpanded && (
                  <div className="ml-7 border-l border-slate-700">
                    {item.children.map(child => (
                      <button
                        key={child.id}
                        onClick={() => setActivePage(child.id)}
                        className={`w-full text-left px-4 py-2 text-xs transition-colors ${
                          activePage === child.id ? 'text-indigo-300 bg-indigo-600/10' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {child.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Admin Info */}
        {sidebarOpen && (
          <div className="p-4 border-t border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold">
                {admin.name?.charAt(0)?.toUpperCase() || "A"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{admin.name}</p>
                <p className="text-[10px] text-slate-400 truncate">{admin.role}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="w-full text-slate-400 hover:text-white hover:bg-slate-800 text-xs">
              <LogOut className="w-3 h-3 mr-2" /> Logout
            </Button>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className={`flex-1 ${sidebarOpen ? 'ml-64' : 'ml-16'} transition-all duration-200`}>
        {/* Top Bar */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-6 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold text-slate-800">
              {NAV_ITEMS.find(n => n.id === activePage || n.children?.some(c => c.id === activePage))?.label || "Dashboard"}
              {activePage.includes("-") && (
                <span className="text-slate-400 font-normal text-sm ml-2">
                  / {NAV_ITEMS.flatMap(n => n.children || []).find(c => c.id === activePage)?.label}
                </span>
              )}
            </h1>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">{admin.role}</Badge>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-6">
          {activePage === "dashboard" && <DashboardPage />}
          {(activePage === "properties-all" || activePage === "properties") && <PropertiesPage />}
          {activePage === "properties-pending" && <PropertiesPage filterStatus="pending_approval" />}
          {activePage === "bookings-all" && <PropertyBookingsPage />}
          {activePage === "bookings-legacy" && <LegacyBookingsPage />}
          {(activePage === "users-all" || activePage === "users") && <UsersPage />}
          {activePage === "users-hosts" && <HostsPage />}
          {activePage === "payments" && <PaymentsStubPage />}
          {activePage === "promos" && <PromoCodesPage />}
          {(activePage === "content-cities" || activePage === "content") && <CityPagesPage />}
          {activePage === "content-banners" && <BannersPage />}
          {activePage === "content-pages" && <StaticPagesPage />}
          {activePage === "notifications" && <NotificationsStubPage />}
          {activePage === "support" && <SupportTicketsPage />}
          {(activePage === "system-flags" || activePage === "system") && <FeatureFlagsPage />}
          {activePage === "system-config" && <SiteConfigPage />}
          {activePage === "system-admins" && <AdminUsersPage />}
          {activePage === "system-health" && <SystemHealthPage />}
          {activePage === "system-diagnostics" && <DiagnosticsPage />}
          {activePage === "audit" && <AuditLogsPage />}
        </div>
      </main>
    </div>
  );
}

// ========================================
// A) DASHBOARD PAGE
// ========================================
function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState("30");

  useEffect(() => { loadData(); }, [period]);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [enhanced, legacy] = await Promise.all([
        adminFetch(`/stats/enhanced?period=${period}`),
        adminFetch(`/stats/overview`),
      ]);
      const eData = enhanced.ok ? enhanced.data : {};
      const lData = legacy.ok ? legacy.data : {};
      setData({ ...eData, legacy: lData?.overview, legacyCities: lData?.topCities });
    } catch (e: any) { setError(e.message || "Failed to load"); }
    finally { setLoading(false); }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (error) return <ErrorState error={error} onRetry={loadData} />;
  if (!data) return <div className="text-center py-12 text-slate-400">Failed to load dashboard data</div>;

  const m = data.metrics || {};
  const legacy = data.legacy || {};

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex items-center gap-2">
        {["7", "30", "90"].map(p => (
          <Button key={p} size="sm" variant={period === p ? "default" : "outline"} onClick={() => setPeriod(p)}>
            {p}d
          </Button>
        ))}
      </div>

      {/* Alerts */}
      {data.alerts?.length > 0 && (
        <div className="space-y-2">
          {data.alerts.map((a: any, i: number) => (
            <div key={i} className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-sm ${
              a.type === "error" ? "bg-red-50 border-red-200 text-red-700" :
              a.type === "warning" ? "bg-amber-50 border-amber-200 text-amber-700" :
              "bg-blue-50 border-blue-200 text-blue-700"
            }`}>
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{a.message}</span>
              <Badge variant="secondary">{a.count}</Badge>
            </div>
          ))}
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard title="Total Users" value={m.totalUsers || legacy.totalUsers || 0} sub={`+${m.newUsers || legacy.recentUsers || 0} new`} icon={Users} />
        <MetricCard title="Properties" value={m.totalProperties || 0} sub={`${m.activeProperties || 0} active`} icon={Home} />
        <MetricCard title="Bookings" value={m.totalBookings || legacy.totalBookings || 0} sub={`+${m.recentBookings || legacy.recentBookings || 0} recent`} icon={Calendar} />
        <MetricCard title="Revenue" value={`$${(m.totalRevenue || legacy.totalRevenue || 0).toLocaleString()}`} sub="Total confirmed" icon={DollarSign} />
        <MetricCard title="Open Tickets" value={m.openTickets || 0} sub={`${m.cancellations || 0} cancellations`} icon={Headphones} color={m.openTickets > 0 ? "text-red-600" : undefined} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Cities */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Top Cities</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(data.topCities || data.legacyCities || []).slice(0, 8).map((c: any, i: number) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    <span>{c.city || "Unknown"}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">{c.bookings}</Badge>
                </div>
              ))}
              {(!data.topCities?.length && !data.legacyCities?.length) && <p className="text-xs text-slate-400">No data yet</p>}
            </div>
          </CardContent>
        </Card>

        {/* Revenue Chart (simple bar representation) */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Daily Revenue (last {period} days)</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-1">
              {(data.dailyRevenue || []).slice(-10).map((d: any, i: number) => {
                const max = Math.max(...(data.dailyRevenue || []).map((x: any) => x.revenue || 0), 1);
                return (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="w-16 text-slate-400">{d.date?.slice(5)}</span>
                    <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
                      <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${Math.max((d.revenue / max) * 100, 2)}%` }} />
                    </div>
                    <span className="w-16 text-right font-mono">${d.revenue}</span>
                  </div>
                );
              })}
              {!data.dailyRevenue?.length && <p className="text-xs text-slate-400">No revenue data yet</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Quick Actions</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline"><Plus className="w-3 h-3 mr-1" /> Create Promo</Button>
            <Button size="sm" variant="outline"><Home className="w-3 h-3 mr-1" /> Approve Properties</Button>
            <Button size="sm" variant="outline"><Bell className="w-3 h-3 mr-1" /> Send Notification</Button>
            <Button size="sm" variant="outline"><Flag className="w-3 h-3 mr-1" /> Feature Flags</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({ title, value, sub, icon: Icon, color }: { title: string; value: any; sub: string; icon: any; color?: string }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-slate-500">{title}</span>
          <Icon className="w-4 h-4 text-slate-400" />
        </div>
        <div className={`text-xl font-bold ${color || ""}`}>{typeof value === "number" ? value.toLocaleString() : value}</div>
        <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>
      </CardContent>
    </Card>
  );
}

// ========================================
// B) PROPERTIES PAGE
// ========================================
function PropertiesPage({ filterStatus }: { filterStatus?: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => { load(); }, [filterStatus, search]);

  const load = async () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ limit: "50" });
    if (filterStatus) params.set("status", filterStatus);
    if (search) params.set("search", search);
    const res = await adminFetch(`/properties?${params}`);
    if (res.ok) { setItems(res.data.properties || []); }
    else { setError(res.error || "Failed to load properties"); setItems([]); }
    setLoading(false);
  };

  const updateStatus = async (id: string, status: string, reason?: string) => {
    await adminFetch(`/properties/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, reason }),
    });
    load();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{filterStatus === "pending_approval" ? "Pending Approval" : "All Properties"}</CardTitle>
            <CardDescription>{items.length} properties</CardDescription>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-56" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div> :
        error ? <ErrorState error={error} onRetry={load} /> :
        items.length === 0 ? <p className="text-center py-8 text-slate-400">No properties found</p> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium max-w-[200px] truncate">{p.title}</TableCell>
                  <TableCell>{p.city}, {p.state}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{p.propertyType}</Badge></TableCell>
                  <TableCell>${((p.baseNightlyRate || 0) / 100).toFixed(0)}/night</TableCell>
                  <TableCell>
                    <Badge variant={p.status === "approved" ? "default" : p.status === "rejected" ? "destructive" : "secondary"} className="text-xs">
                      {p.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {p.status === "pending_approval" && (
                        <>
                          <Button size="sm" variant="default" className="h-7 text-xs" onClick={() => updateStatus(p.id, "approved")}>
                            <CheckCircle className="w-3 h-3 mr-1" /> Approve
                          </Button>
                          <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => {
                            const reason = prompt("Rejection reason:");
                            if (reason) updateStatus(p.id, "rejected", reason);
                          }}>Reject</Button>
                        </>
                      )}
                      {p.status === "approved" && (
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updateStatus(p.id, "suspended")}>Suspend</Button>
                      )}
                      {p.status === "suspended" && (
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updateStatus(p.id, "approved")}>Reactivate</Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// ========================================
// E) PROPERTY BOOKINGS PAGE
// ========================================
function PropertyBookingsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => { load(); }, [statusFilter]);

  const load = async () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ limit: "50" });
    if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);
    const res = await adminFetch(`/property-bookings?${params}`);
    if (res.ok) { setItems(res.data.bookings || []); }
    else { setError(res.error || "Failed to load bookings"); setItems([]); }
    setLoading(false);
  };

  const cancelBooking = async (id: string) => {
    const reason = prompt("Cancel reason:");
    if (!reason) return;
    await adminFetch(`/property-bookings/${id}/cancel`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    load();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div><CardTitle>Property Bookings</CardTitle><CardDescription>{items.length} bookings</CardDescription></div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="All statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div> :
        error ? <ErrorState error={error} onRetry={load} /> :
        items.length === 0 ? <p className="text-center py-8 text-slate-400">No bookings found</p> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Check-in</TableHead>
                <TableHead>Nights</TableHead>
                <TableHead>Guests</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.slice(0, 50).map(b => (
                <TableRow key={b.id}>
                  <TableCell className="font-mono text-xs">{b.id?.substring(0, 10)}</TableCell>
                  <TableCell>{b.checkInDate}</TableCell>
                  <TableCell>{b.nights}</TableCell>
                  <TableCell>{b.guests}</TableCell>
                  <TableCell>${((b.totalPrice || 0) / 100).toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={b.status === "confirmed" ? "default" : b.status === "cancelled" ? "destructive" : "secondary"} className="text-xs">
                      {b.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {b.status === "confirmed" && (
                      <Button size="sm" variant="ghost" className="h-7 text-xs text-red-600" onClick={() => cancelBooking(b.id)}>
                        Cancel
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// Legacy deal bookings (existing)
function LegacyBookingsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => { load(); }, [statusFilter]);

  const load = async () => {
    setLoading(true);
    setError("");
    const status = statusFilter !== "all" ? statusFilter : "";
    const res = await adminFetch(`/bookings?status=${status}`);
    if (res.ok) { setBookings(res.data.bookings || []); }
    else { setError(res.error || "Failed to load bookings"); setBookings([]); }
    setLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div><CardTitle>Deal Bookings (Legacy)</CardTitle></div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="All statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="CONFIRMED">Confirmed</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div> :
        error ? <ErrorState error={error} onRetry={load} /> :
        bookings.length === 0 ? <p className="text-center py-8 text-slate-400">No bookings</p> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead><TableHead>Hotel</TableHead><TableHead>Guest</TableHead>
                <TableHead>Check-in</TableHead><TableHead>Total</TableHead><TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.slice(0, 50).map(b => (
                <TableRow key={b.id}>
                  <TableCell className="font-mono text-xs">{b.id?.substring(0, 8)}...</TableCell>
                  <TableCell>{b.hotelName || "N/A"}</TableCell>
                  <TableCell>{b.guestEmail || "N/A"}</TableCell>
                  <TableCell>{b.checkInDate || "N/A"}</TableCell>
                  <TableCell>${((b.totalPrice || 0) / 100).toFixed(2)}</TableCell>
                  <TableCell><Badge variant={b.status === "CONFIRMED" ? "default" : b.status === "CANCELLED" ? "destructive" : "secondary"} className="text-xs">{b.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// ========================================
// G) USERS PAGE (Enhanced with trust/safety)
// ========================================
function UsersPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<any>(null);

  useEffect(() => { load(); }, [search]);

  const load = async () => {
    setLoading(true);
    setError("");
    const res = await adminFetch(`/users?search=${encodeURIComponent(search)}`);
    if (res.ok) { setItems(res.data.users || []); }
    else { setError(res.error || "Failed to load users"); setItems([]); }
    setLoading(false);
  };

  const viewDetails = async (userId: string) => {
    const res = await adminFetch(`/users/${userId}`);
    if (res.ok) setSelected(res.data);
  };

  const updateUserStatus = async (userId: string, status: string) => {
    const reason = status !== "active" ? prompt(`Reason for ${status}:`) : undefined;
    if (status !== "active" && !reason) return;
    await adminFetch(`/users/${userId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, reason }),
    });
    load();
    setSelected(null);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div><CardTitle>User Management</CardTitle><CardDescription>View and manage platform users</CardDescription></div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-64" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div> :
          error ? <ErrorState error={error} onRetry={load} /> :
          items.length === 0 ? <p className="text-center py-8 text-slate-400">No users found</p> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead><TableHead>Name</TableHead><TableHead>Verified</TableHead>
                  <TableHead>Status</TableHead><TableHead>Risk</TableHead><TableHead>Joined</TableHead><TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map(u => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.email}</TableCell>
                    <TableCell>{u.name || "—"}</TableCell>
                    <TableCell>{u.emailVerified ? <Badge variant="default" className="text-xs"><CheckCircle className="w-3 h-3 mr-1" />Yes</Badge> : <Badge variant="secondary" className="text-xs">No</Badge>}</TableCell>
                    <TableCell><Badge variant={u.status === "active" ? "default" : "destructive"} className="text-xs">{u.status || "active"}</Badge></TableCell>
                    <TableCell><Badge variant={u.fraudRisk === "none" || !u.fraudRisk ? "secondary" : "destructive"} className="text-xs">{u.fraudRisk || "none"}</Badge></TableCell>
                    <TableCell className="text-xs">{new Date(u.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="h-7" onClick={() => viewDetails(u.id)}><Eye className="w-3 h-3" /></Button>
                        {u.status !== "suspended" && <Button size="sm" variant="ghost" className="h-7 text-amber-600" onClick={() => updateUserStatus(u.id, "suspended")}><Ban className="w-3 h-3" /></Button>}
                        {u.status === "suspended" && <Button size="sm" variant="ghost" className="h-7 text-green-600" onClick={() => updateUserStatus(u.id, "active")}><CheckCircle className="w-3 h-3" /></Button>}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {selected && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div><CardTitle>User Details</CardTitle><CardDescription>{selected.user.email}</CardDescription></div>
              <Button variant="outline" size="sm" onClick={() => setSelected(null)}>Close</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4 mb-4">
              <div><Label className="text-xs">Bookings</Label><p className="text-xl font-bold">{selected.bookings?.length || 0}</p></div>
              <div><Label className="text-xs">Reviews</Label><p className="text-xl font-bold">{selected.reviews?.length || 0}</p></div>
              <div><Label className="text-xs">Points</Label><p className="text-xl font-bold">{selected.rewards?.currentPoints || 0}</p></div>
              <div><Label className="text-xs">Tier</Label><p className="text-xl font-bold">{selected.rewards?.tier || "Bronze"}</p></div>
            </div>
            {selected.user.adminNotes && (
              <div className="p-3 bg-slate-50 rounded text-xs whitespace-pre-wrap mb-3">{selected.user.adminNotes}</div>
            )}
            <div className="flex gap-2">
              <Button size="sm" variant="destructive" onClick={() => updateUserStatus(selected.user.id, "banned")}>Ban User</Button>
              <Button size="sm" variant="outline" onClick={() => updateUserStatus(selected.user.id, "active")}>Activate</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ========================================
// D) HOSTS PAGE
// ========================================
function HostsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => { load(); }, [search]);

  const load = async () => {
    setLoading(true);
    setError("");
    const res = await adminFetch(`/hosts?search=${encodeURIComponent(search)}`);
    if (res.ok) { setItems(res.data.hosts || []); }
    else { setError(res.error || "Failed to load hosts"); setItems([]); }
    setLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div><CardTitle>Host Management</CardTitle><CardDescription>{items.length} hosts</CardDescription></div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Search hosts..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-56" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div> :
        error ? <ErrorState error={error} onRetry={load} /> :
        items.length === 0 ? <p className="text-center py-8 text-slate-400">No hosts found</p> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Phone</TableHead>
                <TableHead>Superhost</TableHead><TableHead>Active</TableHead><TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map(h => (
                <TableRow key={h.id}>
                  <TableCell className="font-medium">{h.name}</TableCell>
                  <TableCell>{h.email}</TableCell>
                  <TableCell>{h.phone || "—"}</TableCell>
                  <TableCell>{h.isSuperhost ? <Badge variant="default" className="text-xs">Yes</Badge> : <Badge variant="secondary" className="text-xs">No</Badge>}</TableCell>
                  <TableCell>{h.isActive ? <Badge variant="default" className="text-xs">Active</Badge> : <Badge variant="destructive" className="text-xs">Inactive</Badge>}</TableCell>
                  <TableCell className="text-xs">{new Date(h.createdAt).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// ========================================
// F) PAYMENTS STUB
// ========================================
function PaymentsStubPage() {
  return (
    <Card>
      <CardHeader><CardTitle>Payments & Payouts</CardTitle><CardDescription>Stripe integration — coming in Phase 2</CardDescription></CardHeader>
      <CardContent>
        <div className="text-center py-12 text-slate-400">
          <CreditCard className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p className="text-sm">Payment tracking, failed payment triage, payout management, and reconciliation will be available here.</p>
          <p className="text-xs mt-2">Requires Stripe webhook integration.</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ========================================
// H) PROMO CODES PAGE (Enhanced)
// ========================================
function PromoCodesPage() {
  const [codes, setCodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code: "", type: "POINTS", value: "", description: "", maxUses: "", expiresAt: "" });

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    setError("");
    const res = await adminFetch(`/promo-codes`);
    if (res.ok) { setCodes(res.data.promoCodes || []); }
    else { setError(res.error || "Failed to load promo codes"); setCodes([]); }
    setLoading(false);
  };

  const create = async () => {
    const res = await adminFetch(`/promo-codes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, value: parseInt(form.value), maxUses: form.maxUses ? parseInt(form.maxUses) : null }),
    });
    if (res.ok) { setShowForm(false); setForm({ code: "", type: "POINTS", value: "", description: "", maxUses: "", expiresAt: "" }); load(); }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this promo code?")) return;
    await adminFetch(`/promo-codes/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div><CardTitle>Promo Codes</CardTitle><CardDescription>{codes.length} codes</CardDescription></div>
          <Button size="sm" onClick={() => setShowForm(!showForm)}><Plus className="w-3 h-3 mr-1" /> Create</Button>
        </div>
      </CardHeader>
      <CardContent>
        {showForm && (
          <div className="mb-4 p-4 border rounded-lg space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Code</Label><Input placeholder="WELCOME50" value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} /></div>
              <div><Label className="text-xs">Type</Label>
                <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="POINTS">Points</SelectItem><SelectItem value="PERCENTAGE">Percentage</SelectItem><SelectItem value="FIXED_AMOUNT">Fixed Amount</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Value</Label><Input type="number" placeholder="50" value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} /></div>
              <div><Label className="text-xs">Max Uses</Label><Input type="number" placeholder="100" value={form.maxUses} onChange={e => setForm({ ...form, maxUses: e.target.value })} /></div>
            </div>
            <div><Label className="text-xs">Description</Label><Textarea placeholder="Description..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
            <div className="flex gap-2"><Button size="sm" onClick={create}>Create</Button><Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button></div>
          </div>
        )}
        {loading ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div> :
        error ? <ErrorState error={error} onRetry={load} /> :
        codes.length === 0 ? <p className="text-center py-8 text-slate-400">No promo codes</p> : (
          <Table>
            <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Type</TableHead><TableHead>Value</TableHead><TableHead>Uses</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {codes.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono font-bold">{c.code}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{c.type}</Badge></TableCell>
                  <TableCell>{c.value}</TableCell>
                  <TableCell>{c.currentUses} / {c.maxUses || "∞"}</TableCell>
                  <TableCell>{c.isActive ? <Badge variant="default" className="text-xs">Active</Badge> : <Badge variant="secondary" className="text-xs">Inactive</Badge>}</TableCell>
                  <TableCell><Button variant="ghost" size="sm" onClick={() => remove(c.id)}><Trash2 className="w-3 h-3 text-red-500" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// ========================================
// I) CMS - CITY PAGES (with create form)
// ========================================
function CityPagesPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ city: "", state: "", heroTitle: "", heroSubtitle: "", seoTitle: "", seoDescription: "", isPublished: false });

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    setError("");
    const res = await adminFetch(`/cms/cities`);
    if (res.ok) { setItems(res.data.cities || []); }
    else { setError(res.error || "Failed to load city pages"); setItems([]); }
    setLoading(false);
  };

  const create = async () => {
    if (!form.city.trim()) return alert("City name is required");
    const res = await adminFetch(`/cms/cities`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) { setShowForm(false); setForm({ city: "", state: "", heroTitle: "", heroSubtitle: "", seoTitle: "", seoDescription: "", isPublished: false }); load(); }
    else { alert(res.error || "Failed to create city page"); }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div><CardTitle>City Pages</CardTitle><CardDescription>Manage city landing page content</CardDescription></div>
          <Button size="sm" onClick={() => setShowForm(!showForm)}><Plus className="w-3 h-3 mr-1" /> Add City</Button>
        </div>
      </CardHeader>
      <CardContent>
        {showForm && (
          <div className="mb-4 p-4 border rounded-lg space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">City *</Label><Input placeholder="Melbourne" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} /></div>
              <div><Label className="text-xs">State</Label><Input placeholder="VIC" value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} /></div>
              <div><Label className="text-xs">Hero Title</Label><Input placeholder="Gap Night Deals in Melbourne" value={form.heroTitle} onChange={e => setForm({ ...form, heroTitle: e.target.value })} /></div>
              <div><Label className="text-xs">Hero Subtitle</Label><Input placeholder="Save up to 60% on..." value={form.heroSubtitle} onChange={e => setForm({ ...form, heroSubtitle: e.target.value })} /></div>
              <div><Label className="text-xs">SEO Title</Label><Input placeholder="Melbourne Gap Night Deals" value={form.seoTitle} onChange={e => setForm({ ...form, seoTitle: e.target.value })} /></div>
              <div><Label className="text-xs">SEO Description</Label><Input placeholder="Find discounted stays..." value={form.seoDescription} onChange={e => setForm({ ...form, seoDescription: e.target.value })} /></div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.isPublished} onCheckedChange={v => setForm({ ...form, isPublished: v })} />
              <Label className="text-xs">Publish immediately</Label>
            </div>
            <div className="flex gap-2"><Button size="sm" onClick={create}>Create</Button><Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button></div>
          </div>
        )}
        {loading ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div> :
        error ? <ErrorState error={error} onRetry={load} /> :
        items.length === 0 ? <p className="text-center py-8 text-slate-400">No city pages yet. Create one to manage city-specific content.</p> : (
          <Table>
            <TableHeader><TableRow><TableHead>City</TableHead><TableHead>State</TableHead><TableHead>Hero Title</TableHead><TableHead>Published</TableHead><TableHead>Updated</TableHead></TableRow></TableHeader>
            <TableBody>
              {items.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.city}</TableCell>
                  <TableCell>{c.state || "—"}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{c.heroTitle || "—"}</TableCell>
                  <TableCell>{c.isPublished ? <Badge variant="default" className="text-xs">Published</Badge> : <Badge variant="secondary" className="text-xs">Draft</Badge>}</TableCell>
                  <TableCell className="text-xs">{c.updatedAt ? new Date(c.updatedAt).toLocaleDateString() : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// ========================================
// I) CMS - BANNERS (with create form)
// ========================================
function BannersPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", message: "", type: "info", placement: "global", linkUrl: "", linkText: "", isActive: true });

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    setError("");
    const res = await adminFetch(`/cms/banners`);
    if (res.ok) { setItems(res.data.banners || []); }
    else { setError(res.error || "Failed to load banners"); setItems([]); }
    setLoading(false);
  };

  const create = async () => {
    if (!form.title.trim() || !form.message.trim()) return alert("Title and message are required");
    const res = await adminFetch(`/cms/banners`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) { setShowForm(false); setForm({ title: "", message: "", type: "info", placement: "global", linkUrl: "", linkText: "", isActive: true }); load(); }
    else { alert(res.error || "Failed to create banner"); }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this banner?")) return;
    await adminFetch(`/cms/banners/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div><CardTitle>Banners & Announcements</CardTitle><CardDescription>Global and city-specific alerts</CardDescription></div>
          <Button size="sm" onClick={() => setShowForm(!showForm)}><Plus className="w-3 h-3 mr-1" /> Create Banner</Button>
        </div>
      </CardHeader>
      <CardContent>
        {showForm && (
          <div className="mb-4 p-4 border rounded-lg space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Title *</Label><Input placeholder="Summer Sale!" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label className="text-xs">Type</Label>
                <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="info">Info</SelectItem><SelectItem value="warning">Warning</SelectItem><SelectItem value="promo">Promo</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Link URL</Label><Input placeholder="https://..." value={form.linkUrl} onChange={e => setForm({ ...form, linkUrl: e.target.value })} /></div>
              <div><Label className="text-xs">Link Text</Label><Input placeholder="Learn more" value={form.linkText} onChange={e => setForm({ ...form, linkText: e.target.value })} /></div>
            </div>
            <div><Label className="text-xs">Message *</Label><Textarea placeholder="Banner message..." value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} /></div>
            <div className="flex gap-2"><Button size="sm" onClick={create}>Create</Button><Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button></div>
          </div>
        )}
        {loading ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div> :
        error ? <ErrorState error={error} onRetry={load} /> :
        items.length === 0 ? <p className="text-center py-8 text-slate-400">No banners yet</p> : (
          <Table>
            <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Type</TableHead><TableHead>Placement</TableHead><TableHead>Active</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {items.map(b => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">{b.title}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{b.type}</Badge></TableCell>
                  <TableCell>{b.placement}</TableCell>
                  <TableCell>{b.isActive ? <Badge variant="default" className="text-xs">Active</Badge> : <Badge variant="secondary" className="text-xs">Inactive</Badge>}</TableCell>
                  <TableCell><Button variant="ghost" size="sm" onClick={() => remove(b.id)}><Trash2 className="w-3 h-3 text-red-500" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// ========================================
// I) CMS - STATIC PAGES (with create form)
// ========================================
function StaticPagesPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ slug: "", title: "", content: "", seoTitle: "", seoDescription: "" });

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    setError("");
    const res = await adminFetch(`/cms/pages`);
    if (res.ok) { setItems(res.data.pages || []); }
    else { setError(res.error || "Failed to load static pages"); setItems([]); }
    setLoading(false);
  };

  const create = async () => {
    if (!form.slug.trim() || !form.title.trim()) return alert("Slug and title are required");
    const res = await adminFetch(`/cms/pages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) { setShowForm(false); setForm({ slug: "", title: "", content: "", seoTitle: "", seoDescription: "" }); load(); }
    else { alert(res.error || "Failed to create page"); }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div><CardTitle>Static Pages</CardTitle><CardDescription>Terms, Privacy, Help content</CardDescription></div>
          <Button size="sm" onClick={() => setShowForm(!showForm)}><Plus className="w-3 h-3 mr-1" /> Create Page</Button>
        </div>
      </CardHeader>
      <CardContent>
        {showForm && (
          <div className="mb-4 p-4 border rounded-lg space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Slug *</Label><Input placeholder="terms-of-service" value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })} /></div>
              <div><Label className="text-xs">Title *</Label><Input placeholder="Terms of Service" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label className="text-xs">SEO Title</Label><Input placeholder="Terms | GapNight" value={form.seoTitle} onChange={e => setForm({ ...form, seoTitle: e.target.value })} /></div>
              <div><Label className="text-xs">SEO Description</Label><Input placeholder="Our terms of service..." value={form.seoDescription} onChange={e => setForm({ ...form, seoDescription: e.target.value })} /></div>
            </div>
            <div><Label className="text-xs">Content</Label><Textarea placeholder="Page content (HTML or Markdown)..." rows={6} value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} /></div>
            <div className="flex gap-2"><Button size="sm" onClick={create}>Create</Button><Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button></div>
          </div>
        )}
        {loading ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div> :
        error ? <ErrorState error={error} onRetry={load} /> :
        items.length === 0 ? <p className="text-center py-8 text-slate-400">No static pages yet. Create pages for Terms, Privacy, Help, etc.</p> : (
          <Table>
            <TableHeader><TableRow><TableHead>Slug</TableHead><TableHead>Title</TableHead><TableHead>SEO Title</TableHead><TableHead>Updated</TableHead></TableRow></TableHeader>
            <TableBody>
              {items.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs">{p.slug}</TableCell>
                  <TableCell className="font-medium">{p.title}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{p.seoTitle || "—"}</TableCell>
                  <TableCell className="text-xs">{p.updatedAt ? new Date(p.updatedAt).toLocaleDateString() : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// ========================================
// J) NOTIFICATIONS (functional with templates + send + logs)
// ========================================
function NotificationsStubPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"templates" | "logs">("templates");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", subject: "", body: "", category: "marketing" });

  useEffect(() => { load(); }, [tab]);

  const load = async () => {
    setLoading(true);
    setError("");
    if (tab === "templates") {
      const res = await adminFetch(`/notifications/templates`);
      if (res.ok) { setTemplates(res.data.templates || []); }
      else { setError(res.error || "Failed to load templates"); setTemplates([]); }
    } else {
      const res = await adminFetch(`/notifications/logs?limit=50`);
      if (res.ok) { setLogs(res.data.logs || []); }
      else { setError(res.error || "Failed to load logs"); setLogs([]); }
    }
    setLoading(false);
  };

  const createTemplate = async () => {
    if (!form.name.trim() || !form.subject.trim() || !form.body.trim()) return alert("Name, subject, and body are required");
    const res = await adminFetch(`/notifications/templates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) { setShowForm(false); setForm({ name: "", subject: "", body: "", category: "marketing" }); load(); }
    else { alert(res.error || "Failed to create template"); }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button size="sm" variant={tab === "templates" ? "default" : "outline"} onClick={() => setTab("templates")}>Templates</Button>
        <Button size="sm" variant={tab === "logs" ? "default" : "outline"} onClick={() => setTab("logs")}>Delivery Logs</Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{tab === "templates" ? "Notification Templates" : "Delivery Logs"}</CardTitle>
              <CardDescription>{tab === "templates" ? "Create and manage email/push templates" : "Track notification delivery status"}</CardDescription>
            </div>
            {tab === "templates" && <Button size="sm" onClick={() => setShowForm(!showForm)}><Plus className="w-3 h-3 mr-1" /> Create Template</Button>}
          </div>
          <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">
            <AlertCircle className="w-3 h-3 inline mr-1" />
            Email/push delivery requires provider integration (SendGrid, Resend, etc.). Templates are stored and ready — delivery will activate when a provider is configured.
          </div>
        </CardHeader>
        <CardContent>
          {showForm && tab === "templates" && (
            <div className="mb-4 p-4 border rounded-lg space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Name *</Label><Input placeholder="Welcome Email" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                <div><Label className="text-xs">Category</Label>
                  <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="marketing">Marketing</SelectItem><SelectItem value="transactional">Transactional</SelectItem><SelectItem value="system">System</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label className="text-xs">Subject *</Label><Input placeholder="Welcome to GapNight!" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} /></div>
              <div><Label className="text-xs">Body *</Label><Textarea placeholder="Hi {{name}}, welcome to GapNight..." rows={4} value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} /></div>
              <div className="flex gap-2"><Button size="sm" onClick={createTemplate}>Create</Button><Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button></div>
            </div>
          )}
          {loading ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div> :
          error ? <ErrorState error={error} onRetry={load} /> :
          tab === "templates" ? (
            templates.length === 0 ? <p className="text-center py-8 text-slate-400">No templates yet. Create one to get started.</p> : (
              <Table>
                <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Subject</TableHead><TableHead>Category</TableHead><TableHead>Created</TableHead></TableRow></TableHeader>
                <TableBody>
                  {templates.map(t => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.name}</TableCell>
                      <TableCell className="max-w-[250px] truncate">{t.subject}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{t.category}</Badge></TableCell>
                      <TableCell className="text-xs">{t.createdAt ? new Date(t.createdAt).toLocaleDateString() : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )
          ) : (
            logs.length === 0 ? <p className="text-center py-8 text-slate-400">No delivery logs yet</p> : (
              <Table>
                <TableHeader><TableRow><TableHead>Recipient</TableHead><TableHead>Subject</TableHead><TableHead>Channel</TableHead><TableHead>Status</TableHead><TableHead>Sent</TableHead></TableRow></TableHeader>
                <TableBody>
                  {logs.map(l => (
                    <TableRow key={l.id}>
                      <TableCell className="text-xs">{l.recipientEmail}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-xs">{l.subject || "—"}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{l.channel}</Badge></TableCell>
                      <TableCell><Badge variant={l.status === "sent" || l.status === "delivered" ? "default" : "destructive"} className="text-xs">{l.status}</Badge></TableCell>
                      <TableCell className="text-xs">{l.createdAt ? new Date(l.createdAt).toLocaleDateString() : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ========================================
// K) SUPPORT TICKETS (with create form + detail)
// ========================================
function SupportTicketsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ subject: "", category: "other", priority: "medium", initialMessage: "" });

  useEffect(() => { load(); }, [statusFilter]);

  const load = async () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ limit: "50" });
    if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);
    const res = await adminFetch(`/support/tickets?${params}`);
    if (res.ok) { setItems(res.data.tickets || []); }
    else { setError(res.error || "Failed to load tickets"); setItems([]); }
    setLoading(false);
  };

  const create = async () => {
    if (!form.subject.trim()) return alert("Subject is required");
    const res = await adminFetch(`/support/tickets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) { setShowForm(false); setForm({ subject: "", category: "other", priority: "medium", initialMessage: "" }); load(); }
    else { alert(res.error || "Failed to create ticket"); }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div><CardTitle>Support Tickets</CardTitle><CardDescription>{items.length} tickets</CardDescription></div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setShowForm(!showForm)}><Plus className="w-3 h-3 mr-1" /> Create Ticket</Button>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="All statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {showForm && (
          <div className="mb-4 p-4 border rounded-lg space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Subject *</Label><Input placeholder="Booking issue..." value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} /></div>
              <div><Label className="text-xs">Category</Label>
                <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="booking_issue">Booking Issue</SelectItem>
                    <SelectItem value="refund_request">Refund Request</SelectItem>
                    <SelectItem value="account">Account</SelectItem>
                    <SelectItem value="bug">Bug Report</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Priority</Label>
                <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label className="text-xs">Initial Message</Label><Textarea placeholder="Describe the issue..." value={form.initialMessage} onChange={e => setForm({ ...form, initialMessage: e.target.value })} /></div>
            <div className="flex gap-2"><Button size="sm" onClick={create}>Create</Button><Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button></div>
          </div>
        )}
        {loading ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div> :
        error ? <ErrorState error={error} onRetry={load} /> :
        items.length === 0 ? <p className="text-center py-8 text-slate-400">No support tickets yet</p> : (
          <Table>
            <TableHeader><TableRow><TableHead>Subject</TableHead><TableHead>Category</TableHead><TableHead>Priority</TableHead><TableHead>Status</TableHead><TableHead>Created</TableHead></TableRow></TableHeader>
            <TableBody>
              {items.map(t => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium max-w-[250px] truncate">{t.subject}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{t.category}</Badge></TableCell>
                  <TableCell><Badge variant={t.priority === "urgent" ? "destructive" : t.priority === "high" ? "default" : "secondary"} className="text-xs">{t.priority}</Badge></TableCell>
                  <TableCell><Badge variant={t.status === "open" ? "default" : t.status === "resolved" ? "secondary" : "outline"} className="text-xs">{t.status}</Badge></TableCell>
                  <TableCell className="text-xs">{t.createdAt ? new Date(t.createdAt).toLocaleDateString() : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// ========================================
// L) FEATURE FLAGS
// ========================================
function FeatureFlagsPage() {
  const [flags, setFlags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ key: "", label: "", description: "", enabled: false, category: "feature" });

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    setError("");
    const res = await adminFetch(`/feature-flags`);
    if (res.ok) { setFlags(res.data.flags || []); }
    else { setError(res.error || "Failed to load feature flags"); setFlags([]); }
    setLoading(false);
  };

  const toggle = async (id: string, enabled: boolean) => {
    await adminFetch(`/feature-flags/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    });
    load();
  };

  const create = async () => {
    if (!form.key.trim() || !form.label.trim()) return alert("Key and label are required");
    await adminFetch(`/feature-flags`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setShowForm(false);
    setForm({ key: "", label: "", description: "", enabled: false, category: "feature" });
    load();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div><CardTitle>Feature Flags</CardTitle><CardDescription>Toggle features without code changes</CardDescription></div>
          <Button size="sm" onClick={() => setShowForm(!showForm)}><Plus className="w-3 h-3 mr-1" /> Add Flag</Button>
        </div>
      </CardHeader>
      <CardContent>
        {showForm && (
          <div className="mb-4 p-4 border rounded-lg space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Key *</Label><Input placeholder="feature_name" value={form.key} onChange={e => setForm({ ...form, key: e.target.value })} /></div>
              <div><Label className="text-xs">Label *</Label><Input placeholder="Feature Name" value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} /></div>
            </div>
            <div><Label className="text-xs">Description</Label><Input placeholder="What this flag controls..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
            <div className="flex gap-2"><Button size="sm" onClick={create}>Create</Button><Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button></div>
          </div>
        )}
        {loading ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div> :
        error ? <ErrorState error={error} onRetry={load} /> :
        flags.length === 0 ? <p className="text-center py-8 text-slate-400">No feature flags yet. Create one to toggle features.</p> : (
          <div className="space-y-3">
            {flags.map(f => (
              <div key={f.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-medium">{f.key}</span>
                    <Badge variant="outline" className="text-[10px]">{f.category}</Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{f.label} — {f.description || "No description"}</p>
                </div>
                <Switch checked={f.enabled} onCheckedChange={(v) => toggle(f.id, v)} />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ========================================
// L) SITE CONFIG (with create form)
// ========================================
function SiteConfigPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ key: "", value: "", valueType: "string", label: "", description: "", category: "general" });

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    setError("");
    const res = await adminFetch(`/site-config`);
    if (res.ok) { setItems(res.data.config || []); }
    else { setError(res.error || "Failed to load site config"); setItems([]); }
    setLoading(false);
  };

  const save = async (id: string) => {
    await adminFetch(`/site-config/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: editValue }),
    });
    setEditing(null);
    load();
  };

  const create = async () => {
    if (!form.key.trim() || !form.label.trim()) return alert("Key and label are required");
    const res = await adminFetch(`/site-config`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) { setShowForm(false); setForm({ key: "", value: "", valueType: "string", label: "", description: "", category: "general" }); load(); }
    else { alert(res.error || "Failed to create config"); }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div><CardTitle>Site Configuration</CardTitle><CardDescription>Platform settings (fees, limits, etc.)</CardDescription></div>
          <Button size="sm" onClick={() => setShowForm(!showForm)}><Plus className="w-3 h-3 mr-1" /> Add Config</Button>
        </div>
      </CardHeader>
      <CardContent>
        {showForm && (
          <div className="mb-4 p-4 border rounded-lg space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Key *</Label><Input placeholder="platform_fee_percent" value={form.key} onChange={e => setForm({ ...form, key: e.target.value })} /></div>
              <div><Label className="text-xs">Label *</Label><Input placeholder="Platform Fee %" value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} /></div>
              <div><Label className="text-xs">Value</Label><Input placeholder="10" value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} /></div>
              <div><Label className="text-xs">Category</Label><Input placeholder="pricing" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} /></div>
            </div>
            <div><Label className="text-xs">Description</Label><Input placeholder="Fee charged on each booking" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
            <div className="flex gap-2"><Button size="sm" onClick={create}>Create</Button><Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button></div>
          </div>
        )}
        {loading ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div> :
        error ? <ErrorState error={error} onRetry={load} /> :
        items.length === 0 ? <p className="text-center py-8 text-slate-400">No configuration entries yet. Add platform settings like fees, limits, etc.</p> : (
          <div className="space-y-2">
            {items.map(c => (
              <div key={c.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm">{c.key}</span>
                    <Badge variant="outline" className="text-[10px]">{c.category}</Badge>
                  </div>
                  <p className="text-xs text-slate-500">{c.label} — {c.description || ""}</p>
                </div>
                {editing === c.id ? (
                  <div className="flex items-center gap-2">
                    <Input value={editValue} onChange={e => setEditValue(e.target.value)} className="w-32 h-8 text-sm" />
                    <Button size="sm" className="h-8" onClick={() => save(c.id)}>Save</Button>
                    <Button size="sm" variant="outline" className="h-8" onClick={() => setEditing(null)}>Cancel</Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold">{c.value}</span>
                    <Button size="sm" variant="ghost" className="h-7" onClick={() => { setEditing(c.id); setEditValue(c.value); }}>Edit</Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ========================================
// L) ADMIN USERS (RBAC)
// ========================================
function AdminUsersPage() {
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    setError("");
    const res = await adminFetch(`/admin-users`);
    if (res.ok) { setAdmins(res.data.admins || []); }
    else { setError(res.error || "Failed to load admin users"); setAdmins([]); }
    setLoading(false);
  };

  const changeRole = async (id: string, role: string) => {
    await adminFetch(`/admin-users/${id}/role`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    load();
  };

  return (
    <Card>
      <CardHeader><CardTitle>Admin Users & Roles</CardTitle><CardDescription>Manage admin team access</CardDescription></CardHeader>
      <CardContent>
        {loading ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div> :
        error ? <ErrorState error={error} onRetry={load} /> :
        admins.length === 0 ? <p className="text-center py-8 text-slate-400">No admin users found (owner access required)</p> : (
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Active</TableHead><TableHead>Last Login</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {admins.map(a => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.name}</TableCell>
                  <TableCell>{a.email}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{a.role}</Badge></TableCell>
                  <TableCell>{a.isActive ? <Badge variant="default" className="text-xs">Active</Badge> : <Badge variant="destructive" className="text-xs">Inactive</Badge>}</TableCell>
                  <TableCell className="text-xs">{a.lastLoginAt ? new Date(a.lastLoginAt).toLocaleString() : "Never"}</TableCell>
                  <TableCell>
                    <Select value={a.role} onValueChange={v => changeRole(a.id, v)}>
                      <SelectTrigger className="w-[130px] h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="owner">Owner</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="support">Support</SelectItem>
                        <SelectItem value="finance">Finance</SelectItem>
                        <SelectItem value="content_manager">Content</SelectItem>
                        <SelectItem value="readonly">Read-only</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// ========================================
// L) SYSTEM HEALTH
// ========================================
function SystemHealthPage() {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    setError("");
    const res = await adminFetch(`/system/health`);
    if (res.ok) { setHealth(res.data); }
    else { setError(res.error || "Failed to load health"); }
    setLoading(false);
  };

  return (
    <Card>
      <CardHeader><CardTitle>System Health</CardTitle><CardDescription>Monitor system status and performance</CardDescription></CardHeader>
      <CardContent>
        {loading ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div> :
        error ? <ErrorState error={error} onRetry={load} /> :
        !health ? <p className="text-center py-8 text-slate-400">Failed to load</p> : (
          <div className="space-y-3">
            <div className="flex items-center justify-between"><span className="text-sm">Status</span><Badge variant={health.status === "healthy" ? "default" : "destructive"}>{health.status}</Badge></div>
            <div className="flex items-center justify-between"><span className="text-sm">Database</span><Badge variant={health.database === "connected" ? "default" : "destructive"}>{health.database}</Badge></div>
            <div className="flex items-center justify-between"><span className="text-sm">Uptime</span><span className="text-sm font-mono">{health.uptime ? `${Math.floor(health.uptime / 3600)}h ${Math.floor((health.uptime % 3600) / 60)}m` : "—"}</span></div>
            <div className="flex items-center justify-between"><span className="text-sm">Memory</span><span className="text-sm font-mono">{health.memory?.heapUsed || 0} MB / {health.memory?.heapTotal || 0} MB</span></div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ========================================
// M) AUDIT LOGS (Enhanced)
// ========================================
function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");

  useEffect(() => { load(); }, [moduleFilter]);

  const load = async () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ limit: "100" });
    if (moduleFilter && moduleFilter !== "all") params.set("module", moduleFilter);
    const res = await adminFetch(`/audit-logs?${params}`);
    if (res.ok) { setLogs(res.data.logs || []); }
    else { setError(res.error || "Failed to load audit logs"); setLogs([]); }
    setLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div><CardTitle>Audit Logs</CardTitle><CardDescription>Complete admin activity trail</CardDescription></div>
          <Select value={moduleFilter} onValueChange={setModuleFilter}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="All modules" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="users">Users</SelectItem>
              <SelectItem value="bookings">Bookings</SelectItem>
              <SelectItem value="properties">Properties</SelectItem>
              <SelectItem value="promotions">Promotions</SelectItem>
              <SelectItem value="content">Content</SelectItem>
              <SelectItem value="support">Support</SelectItem>
              <SelectItem value="system">System</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div> :
        error ? <ErrorState error={error} onRetry={load} /> :
        logs.length === 0 ? <p className="text-center py-8 text-slate-400">No audit logs found</p> : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Time</TableHead><TableHead>Admin</TableHead><TableHead>Action</TableHead>
              <TableHead>Module</TableHead><TableHead>Target</TableHead><TableHead>IP</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {logs.map(l => (
                <TableRow key={l.id}>
                  <TableCell className="text-xs">{l.createdAt ? new Date(l.createdAt).toLocaleString() : "—"}</TableCell>
                  <TableCell className="text-xs font-medium">{l.adminName || "—"}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{l.action}</Badge></TableCell>
                  <TableCell><Badge variant="secondary" className="text-[10px]">{l.module || "—"}</Badge></TableCell>
                  <TableCell className="text-xs font-mono">{l.targetType && l.targetId ? `${l.targetType}: ${l.targetId?.substring(0, 8)}...` : "—"}</TableCell>
                  <TableCell className="text-xs font-mono">{l.ipAddress || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// ========================================
// C) ADMIN DIAGNOSTICS PAGE
// ========================================
function DiagnosticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    setError("");
    const [health, stats] = await Promise.all([
      adminFetch(`/system/health`),
      adminFetch(`/stats/enhanced?period=7`),
    ]);
    if (health.ok || stats.ok) {
      setData({
        health: health.ok ? health.data : null,
        stats: stats.ok ? stats.data : null,
        healthError: health.ok ? null : health.error,
        statsError: stats.ok ? null : stats.error,
      });
    } else {
      setError(health.error || stats.error || "Failed to load diagnostics");
    }
    setLoading(false);
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (error) return <ErrorState error={error} onRetry={load} />;

  const h = data?.health;
  const m = data?.stats?.metrics || {};

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div><CardTitle>Admin Diagnostics</CardTitle><CardDescription>Environment checks and table counts</CardDescription></div>
            <Button size="sm" variant="outline" onClick={load}><RefreshCw className="w-3 h-3 mr-1" /> Refresh</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Environment Checks */}
            <div>
              <h3 className="text-sm font-semibold mb-2">Environment</h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-3 border rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Database className="w-4 h-4 text-slate-400" />
                    <span className="text-xs text-slate-500">Database</span>
                  </div>
                  <Badge variant={h?.database === "connected" ? "default" : "destructive"}>{h?.database || "unknown"}</Badge>
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Activity className="w-4 h-4 text-slate-400" />
                    <span className="text-xs text-slate-500">Status</span>
                  </div>
                  <Badge variant={h?.status === "healthy" ? "default" : "destructive"}>{h?.status || "unknown"}</Badge>
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Stethoscope className="w-4 h-4 text-slate-400" />
                    <span className="text-xs text-slate-500">Memory</span>
                  </div>
                  <span className="text-sm font-mono">{h?.memory?.heapUsed || 0} / {h?.memory?.heapTotal || 0} MB</span>
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-4 h-4 text-slate-400" />
                    <span className="text-xs text-slate-500">Uptime</span>
                  </div>
                  <span className="text-sm font-mono">{h?.uptime ? `${Math.floor(h.uptime / 3600)}h ${Math.floor((h.uptime % 3600) / 60)}m` : "—"}</span>
                </div>
              </div>
            </div>

            {/* Table Counts */}
            <div>
              <h3 className="text-sm font-semibold mb-2">Key Table Counts</h3>
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                {[
                  { label: "Users", value: m.totalUsers },
                  { label: "Properties", value: m.totalProperties },
                  { label: "Bookings", value: m.totalBookings },
                  { label: "Open Tickets", value: m.openTickets },
                  { label: "Pending Props", value: m.pendingProperties },
                ].map((item, i) => (
                  <div key={i} className="p-3 border rounded-lg text-center">
                    <p className="text-xs text-slate-500">{item.label}</p>
                    <p className="text-xl font-bold">{item.value ?? "—"}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Errors */}
            {(data?.healthError || data?.statsError) && (
              <div>
                <h3 className="text-sm font-semibold mb-2 text-red-600">Errors Detected</h3>
                <div className="space-y-2">
                  {data.healthError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                      <strong>Health endpoint:</strong> {data.healthError}
                    </div>
                  )}
                  {data.statsError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                      <strong>Stats endpoint:</strong> {data.statsError}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
