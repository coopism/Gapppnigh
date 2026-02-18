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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  { id: "host-payouts", label: "Host Payouts", icon: DollarSign, children: [
    { id: "host-payouts-revenue", label: "Host Revenue" },
    { id: "host-payouts-history", label: "Payout History" },
  ]},
  { id: "promos", label: "Promotions", icon: Gift },
  { id: "reviews", label: "Reviews", icon: Star },
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
          {activePage === "payments" && <PaymentsPage />}
          {(activePage === "host-payouts-revenue" || activePage === "host-payouts") && <HostRevenuePage />}
          {activePage === "host-payouts-history" && <PayoutHistoryPage />}
          {activePage === "promos" && <PromoCodesPage />}
          {activePage === "reviews" && <ReviewsPage />}
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
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [selectedHost, setSelectedHost] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<any>({});

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

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    setDetailOpen(true);
    setRejectReason("");
    setEditMode(false);
    const res = await adminFetch(`/properties/${id}`);
    if (res.ok) {
      setSelectedProperty(res.data.property);
      setSelectedHost(res.data.host);
    } else {
      setSelectedProperty(null);
      setSelectedHost(null);
    }
    setDetailLoading(false);
  };

  const startEdit = () => {
    if (!selectedProperty) return;
    const sp = selectedProperty;
    setEditForm({
      title: sp.title || "", description: sp.description || "",
      propertyType: sp.propertyType || "entire_place", category: sp.category || "apartment",
      address: sp.address || "", city: sp.city || "", state: sp.state || "",
      country: sp.country || "Australia", postcode: sp.postcode || "",
      maxGuests: sp.maxGuests || 2, bedrooms: sp.bedrooms || 1, beds: sp.beds || 1, bathrooms: sp.bathrooms || "1",
      baseNightlyRate: ((sp.baseNightlyRate || 0) / 100).toFixed(2),
      cleaningFee: ((sp.cleaningFee || 0) / 100).toFixed(2),
      minNights: sp.minNights || 1, maxNights: sp.maxNights || 30,
      checkInTime: sp.checkInTime || "15:00", checkOutTime: sp.checkOutTime || "10:00",
      cancellationPolicy: sp.cancellationPolicy || "moderate",
      instantBook: sp.instantBook || false, selfCheckIn: sp.selfCheckIn || false,
      petFriendly: sp.petFriendly || false, smokingAllowed: sp.smokingAllowed || false,
      houseRules: sp.houseRules || "", nearbyHighlight: sp.nearbyHighlight || "",
      amenities: (sp.amenities || []).join(", "),
    });
    setEditMode(true);
  };

  const saveEdit = async () => {
    if (!selectedProperty) return;
    setActionLoading(true);
    const payload: any = { ...editForm };
    // Convert dollar amounts back to cents
    payload.baseNightlyRate = Math.round(parseFloat(payload.baseNightlyRate || "0") * 100);
    payload.cleaningFee = Math.round(parseFloat(payload.cleaningFee || "0") * 100);
    payload.maxGuests = parseInt(payload.maxGuests) || 2;
    payload.bedrooms = parseInt(payload.bedrooms) || 1;
    payload.beds = parseInt(payload.beds) || 1;
    payload.minNights = parseInt(payload.minNights) || 1;
    payload.maxNights = parseInt(payload.maxNights) || 30;
    // Convert amenities string back to array
    payload.amenities = payload.amenities ? payload.amenities.split(",").map((a: string) => a.trim()).filter(Boolean) : [];

    const res = await adminFetch(`/properties/${selectedProperty.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setActionLoading(false);
    if (res.ok) {
      setEditMode(false);
      // Refresh the detail
      openDetail(selectedProperty.id);
      load();
    }
  };

  const updateStatus = async (id: string, status: string, reason?: string) => {
    setActionLoading(true);
    await adminFetch(`/properties/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, reason }),
    });
    setActionLoading(false);
    setDetailOpen(false);
    setSelectedProperty(null);
    load();
  };

  const p = selectedProperty;

  return (
    <>
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
                {items.map(item => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium max-w-[200px] truncate">{item.title}</TableCell>
                    <TableCell>{item.city}, {item.state}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{item.propertyType}</Badge></TableCell>
                    <TableCell>${((item.baseNightlyRate || 0) / 100).toFixed(0)}/night</TableCell>
                    <TableCell>
                      <Badge variant={item.status === "approved" ? "default" : item.status === "rejected" ? "destructive" : "secondary"} className="text-xs">
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openDetail(item.id)}>
                        <Eye className="w-3 h-3 mr-1" /> View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Property Detail Modal */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {detailLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin" /></div>
          ) : !p ? (
            <div className="text-center py-8 text-slate-400">Failed to load property details</div>
          ) : (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <DialogTitle className="text-xl">{p.title}</DialogTitle>
                    <DialogDescription>
                      <Badge variant={p.status === "approved" ? "default" : p.status === "rejected" ? "destructive" : "secondary"} className="mr-2">
                        {p.status}
                      </Badge>
                      Submitted {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "N/A"}
                    </DialogDescription>
                  </div>
                  {!editMode && (
                    <Button size="sm" variant="outline" onClick={startEdit}>
                      <Settings className="w-3.5 h-3.5 mr-1" /> Edit
                    </Button>
                  )}
                </div>
              </DialogHeader>

              {editMode ? (
                /* ===== EDIT MODE ===== */
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} className="min-h-[100px]" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Address</Label>
                      <Input value={editForm.address} onChange={e => setEditForm({...editForm, address: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>City</Label>
                      <Input value={editForm.city} onChange={e => setEditForm({...editForm, city: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>State</Label>
                      <Input value={editForm.state} onChange={e => setEditForm({...editForm, state: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Postcode</Label>
                      <Input value={editForm.postcode} onChange={e => setEditForm({...editForm, postcode: e.target.value})} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label>Property Type</Label>
                      <Select value={editForm.propertyType} onValueChange={v => setEditForm({...editForm, propertyType: v})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="entire_place">Entire Place</SelectItem>
                          <SelectItem value="private_room">Private Room</SelectItem>
                          <SelectItem value="shared_room">Shared Room</SelectItem>
                          <SelectItem value="unique_stay">Unique Stay</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select value={editForm.category} onValueChange={v => setEditForm({...editForm, category: v})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="apartment">Apartment</SelectItem>
                          <SelectItem value="house">House</SelectItem>
                          <SelectItem value="cabin">Cabin</SelectItem>
                          <SelectItem value="villa">Villa</SelectItem>
                          <SelectItem value="cottage">Cottage</SelectItem>
                          <SelectItem value="loft">Loft</SelectItem>
                          <SelectItem value="studio">Studio</SelectItem>
                          <SelectItem value="townhouse">Townhouse</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Cancellation</Label>
                      <Select value={editForm.cancellationPolicy} onValueChange={v => setEditForm({...editForm, cancellationPolicy: v})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="flexible">Flexible</SelectItem>
                          <SelectItem value="moderate">Moderate</SelectItem>
                          <SelectItem value="strict">Strict</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    <div className="space-y-2">
                      <Label>Max Guests</Label>
                      <Input type="number" value={editForm.maxGuests} onChange={e => setEditForm({...editForm, maxGuests: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Bedrooms</Label>
                      <Input type="number" value={editForm.bedrooms} onChange={e => setEditForm({...editForm, bedrooms: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Beds</Label>
                      <Input type="number" value={editForm.beds} onChange={e => setEditForm({...editForm, beds: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Bathrooms</Label>
                      <Input value={editForm.bathrooms} onChange={e => setEditForm({...editForm, bathrooms: e.target.value})} />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    <div className="space-y-2">
                      <Label>Nightly Rate ($)</Label>
                      <Input type="number" step="0.01" value={editForm.baseNightlyRate} onChange={e => setEditForm({...editForm, baseNightlyRate: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Cleaning Fee ($)</Label>
                      <Input type="number" step="0.01" value={editForm.cleaningFee} onChange={e => setEditForm({...editForm, cleaningFee: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Min Nights</Label>
                      <Input type="number" value={editForm.minNights} onChange={e => setEditForm({...editForm, minNights: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Max Nights</Label>
                      <Input type="number" value={editForm.maxNights} onChange={e => setEditForm({...editForm, maxNights: e.target.value})} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Check-in Time</Label>
                      <Input value={editForm.checkInTime} onChange={e => setEditForm({...editForm, checkInTime: e.target.value})} placeholder="15:00" />
                    </div>
                    <div className="space-y-2">
                      <Label>Check-out Time</Label>
                      <Input value={editForm.checkOutTime} onChange={e => setEditForm({...editForm, checkOutTime: e.target.value})} placeholder="10:00" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Amenities (comma-separated)</Label>
                    <Input value={editForm.amenities} onChange={e => setEditForm({...editForm, amenities: e.target.value})} placeholder="WiFi, Kitchen, Pool, Parking, AC" />
                  </div>
                  <div className="space-y-2">
                    <Label>House Rules</Label>
                    <Textarea value={editForm.houseRules} onChange={e => setEditForm({...editForm, houseRules: e.target.value})} className="min-h-[60px]" />
                  </div>
                  <div className="space-y-2">
                    <Label>Nearby Highlight</Label>
                    <Input value={editForm.nearbyHighlight} onChange={e => setEditForm({...editForm, nearbyHighlight: e.target.value})} placeholder="5 min walk to beach" />
                  </div>
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center gap-2"><Switch checked={editForm.instantBook} onCheckedChange={v => setEditForm({...editForm, instantBook: v})} /><Label>Instant Book</Label></div>
                    <div className="flex items-center gap-2"><Switch checked={editForm.selfCheckIn} onCheckedChange={v => setEditForm({...editForm, selfCheckIn: v})} /><Label>Self Check-in</Label></div>
                    <div className="flex items-center gap-2"><Switch checked={editForm.petFriendly} onCheckedChange={v => setEditForm({...editForm, petFriendly: v})} /><Label>Pet Friendly</Label></div>
                    <div className="flex items-center gap-2"><Switch checked={editForm.smokingAllowed} onCheckedChange={v => setEditForm({...editForm, smokingAllowed: v})} /><Label>Smoking</Label></div>
                  </div>
                  <div className="flex gap-2 pt-2 border-t">
                    <Button className="flex-1" onClick={saveEdit} disabled={actionLoading}>
                      {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                      Save Changes
                    </Button>
                    <Button variant="outline" onClick={() => setEditMode(false)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                /* ===== VIEW MODE ===== */
                <>
                  {/* Cover Image */}
                  {p.coverImage && (
                    <div className="rounded-lg overflow-hidden border mb-2">
                      <img src={p.coverImage} alt={p.title} className="w-full h-48 object-cover" />
                    </div>
                  )}

                  {/* Property Images */}
                  {p.images && p.images.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {p.images.slice(0, 6).map((img: string, i: number) => (
                        <img key={i} src={img} alt={`Photo ${i + 1}`} className="w-24 h-24 rounded-md object-cover border flex-shrink-0" />
                      ))}
                      {p.images.length > 6 && <div className="w-24 h-24 rounded-md border flex items-center justify-center text-sm text-slate-400 flex-shrink-0">+{p.images.length - 6} more</div>}
                    </div>
                  )}

                  {/* Location & Basics */}
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm text-slate-500 uppercase tracking-wide">Location</h4>
                      <div className="text-sm space-y-1">
                        <p><span className="font-medium">Address:</span> {p.address}</p>
                        <p><span className="font-medium">City:</span> {p.city}, {p.state}</p>
                        <p><span className="font-medium">Country:</span> {p.country}</p>
                        {p.postcode && <p><span className="font-medium">Postcode:</span> {p.postcode}</p>}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm text-slate-500 uppercase tracking-wide">Details</h4>
                      <div className="text-sm space-y-1">
                        <p><span className="font-medium">Type:</span> {p.propertyType} / {p.category}</p>
                        <p><span className="font-medium">Bedrooms:</span> {p.bedrooms} · <span className="font-medium">Beds:</span> {p.beds} · <span className="font-medium">Baths:</span> {p.bathrooms}</p>
                        <p><span className="font-medium">Max Guests:</span> {p.maxGuests}</p>
                        <p><span className="font-medium">Instant Book:</span> {p.instantBook ? "Yes" : "No"} · <span className="font-medium">Self Check-in:</span> {p.selfCheckIn ? "Yes" : "No"}</p>
                      </div>
                    </div>
                  </div>

                  {/* Pricing */}
                  <div className="space-y-2 mt-3">
                    <h4 className="font-semibold text-sm text-slate-500 uppercase tracking-wide">Pricing</h4>
                    <div className="flex gap-4 text-sm">
                      <div className="bg-slate-50 dark:bg-slate-800 rounded-lg px-4 py-2">
                        <div className="text-xs text-slate-400">Nightly Rate</div>
                        <div className="font-bold text-lg">${((p.baseNightlyRate || 0) / 100).toFixed(2)}</div>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-800 rounded-lg px-4 py-2">
                        <div className="text-xs text-slate-400">Cleaning Fee</div>
                        <div className="font-bold text-lg">${((p.cleaningFee || 0) / 100).toFixed(2)}</div>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-800 rounded-lg px-4 py-2">
                        <div className="text-xs text-slate-400">Min / Max Nights</div>
                        <div className="font-bold text-lg">{p.minNights} – {p.maxNights || "∞"}</div>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-2 mt-3">
                    <h4 className="font-semibold text-sm text-slate-500 uppercase tracking-wide">Description</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{p.description}</p>
                  </div>

                  {/* Amenities */}
                  {p.amenities && p.amenities.length > 0 && (
                    <div className="space-y-2 mt-3">
                      <h4 className="font-semibold text-sm text-slate-500 uppercase tracking-wide">Amenities</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {p.amenities.map((a: string) => <Badge key={a} variant="outline" className="text-xs">{a}</Badge>)}
                      </div>
                    </div>
                  )}

                  {/* House Rules & Policies */}
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm text-slate-500 uppercase tracking-wide">Policies</h4>
                      <div className="text-sm space-y-1">
                        <p><span className="font-medium">Check-in:</span> {p.checkInTime} · <span className="font-medium">Check-out:</span> {p.checkOutTime}</p>
                        <p><span className="font-medium">Cancellation:</span> {p.cancellationPolicy}</p>
                        <p><span className="font-medium">Pets:</span> {p.petFriendly ? "Allowed" : "No"} · <span className="font-medium">Smoking:</span> {p.smokingAllowed ? "Allowed" : "No"}</p>
                      </div>
                    </div>
                    {p.houseRules && (
                      <div className="space-y-2">
                        <h4 className="font-semibold text-sm text-slate-500 uppercase tracking-wide">House Rules</h4>
                        <p className="text-sm text-slate-600 dark:text-slate-300">{p.houseRules}</p>
                      </div>
                    )}
                  </div>

                  {/* Host Info */}
                  {selectedHost && (
                    <div className="space-y-2 mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <h4 className="font-semibold text-sm text-blue-600 dark:text-blue-400 uppercase tracking-wide">Host Information</h4>
                      <div className="text-sm space-y-1">
                        <p><span className="font-medium">Name:</span> {selectedHost.name}</p>
                        <p><span className="font-medium">Email:</span> {selectedHost.email}</p>
                        {selectedHost.phone && <p><span className="font-medium">Phone:</span> {selectedHost.phone}</p>}
                        <p><span className="font-medium">Active:</span> {selectedHost.isActive ? "Yes" : "No"}</p>
                        <p><span className="font-medium">Joined:</span> {selectedHost.createdAt ? new Date(selectedHost.createdAt).toLocaleDateString() : "N/A"}</p>
                      </div>
                    </div>
                  )}

                  {/* Rejection reason (if already rejected) */}
                  {p.status === "rejected" && p.rejectionReason && (
                    <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                      <h4 className="font-semibold text-sm text-red-600 dark:text-red-400 uppercase tracking-wide">Rejection Reason</h4>
                      <p className="text-sm mt-1">{p.rejectionReason}</p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="mt-4 pt-4 border-t space-y-3">
                    {p.status === "pending_approval" && (
                      <>
                        <div className="flex gap-2">
                          <Button className="flex-1" onClick={() => updateStatus(p.id, "approved")} disabled={actionLoading}>
                            {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                            Approve Property
                          </Button>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-red-600">Decline with reason (email will be sent to host)</Label>
                          <Textarea
                            placeholder="Enter the reason for declining this property..."
                            value={rejectReason}
                            onChange={e => setRejectReason(e.target.value)}
                            className="min-h-[80px]"
                          />
                          <Button
                            variant="destructive"
                            className="w-full"
                            disabled={!rejectReason.trim() || actionLoading}
                            onClick={() => updateStatus(p.id, "rejected", rejectReason.trim())}
                          >
                            {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Ban className="w-4 h-4 mr-2" />}
                            Decline Property
                          </Button>
                        </div>
                      </>
                    )}
                    {p.status === "approved" && (
                      <Button variant="outline" className="w-full" onClick={() => updateStatus(p.id, "suspended")} disabled={actionLoading}>
                        Suspend Property
                      </Button>
                    )}
                    {p.status === "suspended" && (
                      <Button variant="default" className="w-full" onClick={() => updateStatus(p.id, "approved")} disabled={actionLoading}>
                        Reactivate Property
                      </Button>
                    )}
                    {p.status === "rejected" && (
                      <Button variant="default" className="w-full" onClick={() => updateStatus(p.id, "pending_approval")} disabled={actionLoading}>
                        Move Back to Pending
                      </Button>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
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
    if (reason === null) return;
    await adminFetch(`/property-bookings/${id}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: reason || "Admin cancelled" }),
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
                    {["PENDING_APPROVAL", "APPROVED", "CONFIRMED"].includes(b.status) && (
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
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", email: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const [pointsToAdd, setPointsToAdd] = useState("");
  const [pointsDesc, setPointsDesc] = useState("");
  const [addingPoints, setAddingPoints] = useState(false);

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
    if (res.ok) {
      setSelected(res.data);
      setEditForm({
        name: res.data.user.name || "",
        email: res.data.user.email || "",
        phone: res.data.user.phone || "",
      });
      setEditing(false);
    }
  };

  const saveUser = async () => {
    if (!selected) return;
    setSaving(true);
    const res = await adminFetch(`/users/${selected.user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    setSaving(false);
    if (res.ok) {
      setEditing(false);
      viewDetails(selected.user.id);
      load();
    }
  };

  const addPoints = async () => {
    if (!selected || !pointsToAdd) return;
    const pts = parseInt(pointsToAdd);
    if (!pts || pts <= 0) return;
    setAddingPoints(true);
    const res = await adminFetch(`/users/${selected.user.id}/points`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ points: pts, description: pointsDesc || "Admin-awarded points" }),
    });
    setAddingPoints(false);
    if (res.ok) {
      setPointsToAdd("");
      setPointsDesc("");
      viewDetails(selected.user.id);
    }
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

      {/* User Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>{selected?.user?.email}</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              {/* Stats row */}
              <div className="grid grid-cols-4 gap-3">
                <div className="text-center p-2 bg-muted/50 rounded-lg">
                  <p className="text-lg font-bold">{selected.bookings?.length || 0}</p>
                  <p className="text-[10px] text-muted-foreground">Bookings</p>
                </div>
                <div className="text-center p-2 bg-muted/50 rounded-lg">
                  <p className="text-lg font-bold">{selected.reviews?.length || 0}</p>
                  <p className="text-[10px] text-muted-foreground">Reviews</p>
                </div>
                <div className="text-center p-2 bg-muted/50 rounded-lg">
                  <p className="text-lg font-bold">{selected.rewards?.currentPoints || 0}</p>
                  <p className="text-[10px] text-muted-foreground">Points</p>
                </div>
                <div className="text-center p-2 bg-muted/50 rounded-lg">
                  <p className="text-lg font-bold">{selected.rewards?.tier || "Bronze"}</p>
                  <p className="text-[10px] text-muted-foreground">Tier</p>
                </div>
              </div>

              {/* Editable user fields */}
              <div className="border rounded-lg p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">User Info</p>
                  {!editing ? (
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEditing(true)}>Edit</Button>
                  ) : (
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEditing(false)}>Cancel</Button>
                      <Button size="sm" className="h-7 text-xs" onClick={saveUser} disabled={saving}>
                        {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
                      </Button>
                    </div>
                  )}
                </div>
                {editing ? (
                  <div className="space-y-2">
                    <div>
                      <Label className="text-xs">Name</Label>
                      <Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className="h-8 text-sm" />
                    </div>
                    <div>
                      <Label className="text-xs">Email</Label>
                      <Input value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} className="h-8 text-sm" />
                    </div>
                    <div>
                      <Label className="text-xs">Phone</Label>
                      <Input value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} className="h-8 text-sm" placeholder="e.g. +61 400 000 000" />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><p className="text-xs text-muted-foreground">Name</p><p className="font-medium">{selected.user.name || "—"}</p></div>
                    <div><p className="text-xs text-muted-foreground">Email</p><p className="font-medium">{selected.user.email}</p></div>
                    <div><p className="text-xs text-muted-foreground">Phone</p><p className="font-medium">{selected.user.phone || "—"}</p></div>
                    <div><p className="text-xs text-muted-foreground">Joined</p><p className="font-medium">{new Date(selected.user.createdAt).toLocaleDateString()}</p></div>
                    <div><p className="text-xs text-muted-foreground">Status</p><Badge variant={selected.user.status === "active" ? "default" : "destructive"} className="text-xs">{selected.user.status || "active"}</Badge></div>
                    <div><p className="text-xs text-muted-foreground">Fraud Risk</p><Badge variant={selected.user.fraudRisk === "none" || !selected.user.fraudRisk ? "secondary" : "destructive"} className="text-xs">{selected.user.fraudRisk || "none"}</Badge></div>
                  </div>
                )}
              </div>

              {/* ID Verification */}
              <div className={`border rounded-lg p-3 text-sm space-y-1 ${
                selected.verification?.status === "verified"
                  ? "border-green-300 bg-green-50 dark:bg-green-950/20"
                  : "border-amber-300 bg-amber-50 dark:bg-amber-950/20"
              }`}>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">ID Verification</p>
                {selected.verification ? (
                  <>
                    <div className="flex items-center gap-2">
                      <Badge variant={selected.verification.status === "verified" ? "default" : "secondary"} className="text-xs">
                        {selected.verification.status}
                      </Badge>
                      {selected.verification.verifiedAt && (
                        <span className="text-xs text-muted-foreground">on {new Date(selected.verification.verifiedAt).toLocaleDateString()}</span>
                      )}
                    </div>
                    {selected.verification.verifiedFirstName && (
                      <p className="font-medium">{selected.verification.verifiedFirstName} {selected.verification.verifiedLastName}</p>
                    )}
                    {selected.verification.verifiedDob && (
                      <p className="text-xs text-muted-foreground">DOB: {selected.verification.verifiedDob}</p>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-amber-700">No ID verification on file</p>
                )}
              </div>

              {/* Add Points */}
              <div className="border rounded-lg p-3 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Add Points</p>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={pointsToAdd}
                    onChange={e => setPointsToAdd(e.target.value)}
                    placeholder="Points"
                    className="h-8 text-sm w-24"
                    min={1}
                  />
                  <Input
                    value={pointsDesc}
                    onChange={e => setPointsDesc(e.target.value)}
                    placeholder="Reason (optional)"
                    className="h-8 text-sm flex-1"
                  />
                  <Button size="sm" className="h-8 text-xs" onClick={addPoints} disabled={addingPoints || !pointsToAdd}>
                    {addingPoints ? <Loader2 className="w-3 h-3 animate-spin" /> : "Add"}
                  </Button>
                </div>
              </div>

              {/* Admin notes */}
              {selected.user.adminNotes && (
                <div className="p-3 bg-muted/50 rounded-lg text-xs whitespace-pre-wrap">{selected.user.adminNotes}</div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2 border-t">
                <Button size="sm" variant="destructive" onClick={() => updateUserStatus(selected.user.id, "banned")}>Ban User</Button>
                {selected.user.status === "suspended" && (
                  <Button size="sm" variant="outline" onClick={() => updateUserStatus(selected.user.id, "active")}>Activate</Button>
                )}
                {selected.user.status === "active" && (
                  <Button size="sm" variant="outline" className="text-amber-600" onClick={() => updateUserStatus(selected.user.id, "suspended")}>Suspend</Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
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
                <TableHead>Active</TableHead><TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map(h => (
                <TableRow key={h.id}>
                  <TableCell className="font-medium">{h.name}</TableCell>
                  <TableCell>{h.email}</TableCell>
                  <TableCell>{h.phone || "—"}</TableCell>
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
// F) PAYMENTS PAGE
// ========================================
function PaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedPayment, setSelectedPayment] = useState<any>(null);

  useEffect(() => { load(); }, [statusFilter]);

  const load = async () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ limit: "100" });
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (search) params.set("search", search);
    const res = await adminFetch(`/payments?${params}`);
    if (res.ok) {
      setPayments(res.data.payments || []);
      setSummary(res.data.summary || null);
    } else {
      setError(res.error || "Failed to load payments");
      setPayments([]);
    }
    setLoading(false);
  };

  const handleSearch = () => load();

  const refundBooking = async (id: string) => {
    const reason = prompt("Refund reason:");
    if (!reason) return;
    const res = await adminFetch(`/payments/${id}/refund`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    if (res.ok) { load(); setSelectedPayment(null); }
    else { alert(res.error || "Failed to process refund"); }
  };

  const formatCents = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const statusBadge = (status: string) => {
    const map: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      PENDING_APPROVAL: { variant: "outline", label: "Pending" },
      APPROVED: { variant: "secondary", label: "Approved" },
      CONFIRMED: { variant: "default", label: "Confirmed" },
      COMPLETED: { variant: "default", label: "Completed" },
      DECLINED: { variant: "destructive", label: "Declined" },
      CANCELLED_BY_GUEST: { variant: "destructive", label: "Cancelled (Guest)" },
      CANCELLED_BY_HOST: { variant: "destructive", label: "Cancelled (Host)" },
      PAYMENT_FAILED: { variant: "destructive", label: "Payment Failed" },
      REFUNDED: { variant: "secondary", label: "Refunded" },
    };
    const cfg = map[status] || { variant: "outline" as const, label: status };
    return <Badge variant={cfg.variant} className="text-xs">{cfg.label}</Badge>;
  };

  return (
    <>
      {/* Financial Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Total Revenue</p>
              <p className="text-xl font-bold text-green-600">{formatCents(summary.totalRevenue)}</p>
              <p className="text-xs text-muted-foreground">{summary.confirmedBookings} confirmed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Service Fees Earned</p>
              <p className="text-xl font-bold">{formatCents(summary.totalServiceFees)}</p>
              <p className="text-xs text-muted-foreground">Platform revenue</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Pending Payments</p>
              <p className="text-xl font-bold text-amber-600">{formatCents(summary.pendingPayments)}</p>
              <p className="text-xs text-muted-foreground">{summary.pendingBookings} pending</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Total Bookings</p>
              <p className="text-xl font-bold">{summary.totalBookings}</p>
              <p className="text-xs text-muted-foreground">{summary.cancelledBookings} cancelled</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle>Payments & Bookings</CardTitle>
              <CardDescription>{payments.length} payment records</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                <Input
                  placeholder="Search guest email, name, booking ID..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSearch()}
                  className="w-64 h-8 text-sm"
                />
                <Button size="sm" variant="outline" className="h-8" onClick={handleSearch}>
                  <Search className="w-3 h-3" />
                </Button>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-44 h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="PENDING_APPROVAL">Pending</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="CANCELLED_BY_GUEST">Cancelled (Guest)</SelectItem>
                  <SelectItem value="CANCELLED_BY_HOST">Cancelled (Host)</SelectItem>
                  <SelectItem value="PAYMENT_FAILED">Payment Failed</SelectItem>
                  <SelectItem value="REFUNDED">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div> :
          error ? <ErrorState error={error} onRetry={load} /> :
          payments.length === 0 ? <p className="text-center py-8 text-slate-400">No payments found</p> : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Booking ID</TableHead>
                    <TableHead className="text-xs">Guest</TableHead>
                    <TableHead className="text-xs">Property</TableHead>
                    <TableHead className="text-xs">Dates</TableHead>
                    <TableHead className="text-xs">Total</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map(p => (
                    <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedPayment(p)}>
                      <TableCell className="text-xs font-mono">{p.id}</TableCell>
                      <TableCell className="text-xs">
                        <div>{p.guestFirstName} {p.guestLastName}</div>
                        <div className="text-muted-foreground">{p.guestEmail}</div>
                      </TableCell>
                      <TableCell className="text-xs max-w-[200px] truncate">{p.propertyTitle || "—"}</TableCell>
                      <TableCell className="text-xs whitespace-nowrap">{p.checkInDate} → {p.checkOutDate}<br/><span className="text-muted-foreground">{p.nights} night{p.nights !== 1 ? "s" : ""}</span></TableCell>
                      <TableCell className="text-xs font-semibold">{formatCents(p.totalPrice)}</TableCell>
                      <TableCell>{statusBadge(p.status)}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" className="h-7" onClick={(e) => { e.stopPropagation(); setSelectedPayment(p); }}>
                          <Eye className="w-3 h-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Detail Dialog */}
      <Dialog open={!!selectedPayment} onOpenChange={(open) => { if (!open) setSelectedPayment(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Payment Details</DialogTitle>
            <DialogDescription>Booking {selectedPayment?.id}</DialogDescription>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Guest</p>
                  <p className="font-medium">{selectedPayment.guestFirstName} {selectedPayment.guestLastName}</p>
                  <p className="text-xs text-muted-foreground">{selectedPayment.guestEmail}</p>
                  {selectedPayment.guestPhone && <p className="text-xs text-muted-foreground">{selectedPayment.guestPhone}</p>}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Property</p>
                  <p className="font-medium">{selectedPayment.propertyTitle || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Check-in / Check-out</p>
                  <p className="font-medium">{selectedPayment.checkInDate} → {selectedPayment.checkOutDate}</p>
                  <p className="text-xs text-muted-foreground">{selectedPayment.nights} night{selectedPayment.nights !== 1 ? "s" : ""}, {selectedPayment.guests} guest{selectedPayment.guests !== 1 ? "s" : ""}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <div className="mt-1">{statusBadge(selectedPayment.status)}</div>
                </div>
              </div>

              <div className="border rounded-lg p-3 space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Nightly rate × {selectedPayment.nights}</span><span>{formatCents(selectedPayment.nightlyRate * selectedPayment.nights)}</span></div>
                {selectedPayment.cleaningFee > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Cleaning fee</span><span>{formatCents(selectedPayment.cleaningFee)}</span></div>}
                {selectedPayment.serviceFee > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Service fee</span><span>{formatCents(selectedPayment.serviceFee)}</span></div>}
                <div className="flex justify-between font-bold border-t pt-1.5"><span>Total</span><span>{formatCents(selectedPayment.totalPrice)}</span></div>
              </div>

              {/* Verified Identity Section */}
              {selectedPayment.verifiedIdentity && (
                <div className={`border rounded-lg p-3 text-sm space-y-1 ${
                  selectedPayment.verifiedIdentity.nameMatch === false ? "border-red-300 bg-red-50 dark:bg-red-950/20" : "border-green-300 bg-green-50 dark:bg-green-950/20"
                }`}>
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Verified ID</p>
                    {selectedPayment.verifiedIdentity.nameMatch === true && (
                      <Badge variant="default" className="text-[10px] bg-green-600">Name Match</Badge>
                    )}
                    {selectedPayment.verifiedIdentity.nameMatch === false && (
                      <Badge variant="destructive" className="text-[10px]">Name Mismatch</Badge>
                    )}
                    {selectedPayment.verifiedIdentity.nameMatch === null && (
                      <Badge variant="outline" className="text-[10px]">No ID Data</Badge>
                    )}
                  </div>
                  <p className="font-medium">
                    {selectedPayment.verifiedIdentity.verifiedFirstName || "—"} {selectedPayment.verifiedIdentity.verifiedLastName || "—"}
                  </p>
                  {selectedPayment.verifiedIdentity.verifiedDob && (
                    <p className="text-xs text-muted-foreground">DOB: {selectedPayment.verifiedIdentity.verifiedDob}</p>
                  )}
                  {selectedPayment.verifiedIdentity.verifiedAt && (
                    <p className="text-xs text-muted-foreground">Verified: {new Date(selectedPayment.verifiedIdentity.verifiedAt).toLocaleDateString()}</p>
                  )}
                  {selectedPayment.verifiedIdentity.nameMatch === false && (
                    <p className="text-xs text-red-600 font-medium mt-1">
                      Booking name: {selectedPayment.guestFirstName} {selectedPayment.guestLastName} — does NOT match verified ID
                    </p>
                  )}
                </div>
              )}
              {!selectedPayment.verifiedIdentity && (
                <div className="border rounded-lg p-3 text-sm border-amber-300 bg-amber-50 dark:bg-amber-950/20">
                  <p className="text-xs font-semibold text-amber-700">No ID verification on file for this guest</p>
                </div>
              )}

              {selectedPayment.stripePaymentIntentId && (
                <div className="text-xs">
                  <span className="text-muted-foreground">Stripe PI: </span>
                  <span className="font-mono">{selectedPayment.stripePaymentIntentId}</span>
                </div>
              )}
              {selectedPayment.paymentCapturedAt && (
                <div className="text-xs">
                  <span className="text-muted-foreground">Payment captured: </span>
                  <span>{new Date(selectedPayment.paymentCapturedAt).toLocaleString()}</span>
                </div>
              )}

              <div className="text-xs text-muted-foreground">
                Created: {new Date(selectedPayment.createdAt).toLocaleString()}
              </div>

              {["CONFIRMED", "COMPLETED"].includes(selectedPayment.status) && (
                <Button variant="destructive" size="sm" className="w-full" onClick={() => refundBooking(selectedPayment.id)}>
                  Process Refund
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
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
// H2) REVIEWS MANAGEMENT
// ========================================
function ReviewsPage() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingReview, setEditingReview] = useState<any>(null);
  const [editComment, setEditComment] = useState("");
  const [editVerified, setEditVerified] = useState(true);
  const [editHostResponse, setEditHostResponse] = useState("");
  const [filterRating, setFilterRating] = useState("all");

  useEffect(() => { load(); }, [filterRating]);

  const load = async () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ limit: "100" });
    if (filterRating !== "all") params.set("rating", filterRating);
    const res = await adminFetch(`/reviews?${params}`);
    if (res.ok) { setReviews(res.data.reviews || []); }
    else { setError(res.error || "Failed to load reviews"); setReviews([]); }
    setLoading(false);
  };

  const openEdit = (r: any) => {
    setEditingReview(r);
    setEditComment(r.comment || "");
    setEditVerified(r.isVerified ?? true);
    setEditHostResponse(r.hostResponse || "");
  };

  const saveEdit = async () => {
    if (!editingReview) return;
    const res = await adminFetch(`/reviews/${editingReview.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comment: editComment, isVerified: editVerified, hostResponse: editHostResponse || null }),
    });
    if (res.ok) { setEditingReview(null); load(); }
  };

  const deleteReview = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this review?")) return;
    const res = await adminFetch(`/reviews/${id}`, { method: "DELETE" });
    if (res.ok) load();
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star key={i} className={`w-3.5 h-3.5 inline ${i < rating ? "text-yellow-500 fill-yellow-500" : "text-slate-300"}`} />
    ));
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Reviews</CardTitle>
              <CardDescription>{reviews.length} reviews</CardDescription>
            </div>
            <Select value={filterRating} onValueChange={setFilterRating}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Ratings</SelectItem>
                <SelectItem value="5">5 Stars</SelectItem>
                <SelectItem value="4">4 Stars</SelectItem>
                <SelectItem value="3">3 Stars</SelectItem>
                <SelectItem value="2">2 Stars</SelectItem>
                <SelectItem value="1">1 Star</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div> :
          error ? <ErrorState error={error} onRetry={load} /> :
          reviews.length === 0 ? <p className="text-center py-8 text-slate-400">No reviews found</p> : (
            <div className="space-y-3">
              {reviews.map(r => (
                <div key={r.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm truncate">{r.propertyTitle || "Unknown Property"}</span>
                        <Badge variant={r.isVerified ? "default" : "secondary"} className="text-xs shrink-0">{r.isVerified ? "Verified" : "Unverified"}</Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                        <span>{renderStars(r.rating)}</span>
                        <span>by {r.userName || r.userEmail || "Anonymous"}</span>
                        <span>· {new Date(r.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-sm text-slate-700 dark:text-slate-300">{r.comment}</p>
                      {r.hostResponse && (
                        <div className="mt-2 pl-3 border-l-2 border-blue-300 text-xs text-slate-500">
                          <span className="font-medium">Host response:</span> {r.hostResponse}
                        </div>
                      )}
                      {(r.cleanlinessRating || r.locationRating || r.valueRating) && (
                        <div className="flex gap-3 mt-2 text-xs text-slate-400">
                          {r.cleanlinessRating && <span>Clean: {r.cleanlinessRating}/5</span>}
                          {r.accuracyRating && <span>Accuracy: {r.accuracyRating}/5</span>}
                          {r.checkInRating && <span>Check-in: {r.checkInRating}/5</span>}
                          {r.communicationRating && <span>Comms: {r.communicationRating}/5</span>}
                          {r.locationRating && <span>Location: {r.locationRating}/5</span>}
                          {r.valueRating && <span>Value: {r.valueRating}/5</span>}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button size="sm" variant="ghost" className="h-7" onClick={() => openEdit(r)}><Eye className="w-3 h-3" /></Button>
                      <Button size="sm" variant="ghost" className="h-7 text-red-600" onClick={() => deleteReview(r.id)}><Trash2 className="w-3 h-3" /></Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Review Dialog */}
      <Dialog open={!!editingReview} onOpenChange={(open) => { if (!open) setEditingReview(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Review</DialogTitle>
            <DialogDescription>
              {editingReview?.propertyTitle} — {editingReview?.rating}/5 stars by {editingReview?.userName || editingReview?.userEmail}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Comment</Label>
              <Textarea value={editComment} onChange={e => setEditComment(e.target.value)} className="min-h-[100px]" />
            </div>
            <div className="space-y-2">
              <Label>Host Response</Label>
              <Textarea value={editHostResponse} onChange={e => setEditHostResponse(e.target.value)} placeholder="Optional host response..." className="min-h-[60px]" />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={editVerified} onCheckedChange={setEditVerified} />
              <Label>Verified Review</Label>
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={saveEdit}>Save Changes</Button>
              <Button variant="outline" onClick={() => setEditingReview(null)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
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

// ========================================
// R) HOST REVENUE PAGE
// ========================================
function HostRevenuePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [createPayoutHost, setCreatePayoutHost] = useState<any>(null);
  const [payoutForm, setPayoutForm] = useState({ amount: "", method: "bank_transfer", reference: "", notes: "", periodStart: "", periodEnd: "" });
  const [creating, setCreating] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    setError("");
    const res = await adminFetch("/host-revenue");
    if (res.ok) setData(res.data);
    else setError(res.error || "Failed to load");
    setLoading(false);
  };

  const formatCents = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const openCreatePayout = (host: any) => {
    setCreatePayoutHost(host);
    setPayoutForm({
      amount: ((host.owed || 0) / 100).toFixed(2),
      method: "bank_transfer",
      reference: "",
      notes: "",
      periodStart: "",
      periodEnd: "",
    });
  };

  const submitPayout = async () => {
    if (!createPayoutHost) return;
    setCreating(true);
    const res = await adminFetch("/payouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hostId: createPayoutHost.hostId,
        amount: Math.round(parseFloat(payoutForm.amount) * 100),
        platformFee: Math.round(parseFloat(payoutForm.amount) * 100 * 0.07 / 0.93),
        method: payoutForm.method,
        reference: payoutForm.reference || undefined,
        notes: payoutForm.notes || undefined,
        periodStart: payoutForm.periodStart || undefined,
        periodEnd: payoutForm.periodEnd || undefined,
      }),
    });
    setCreating(false);
    if (res.ok) {
      setCreatePayoutHost(null);
      load();
    }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (error) return <ErrorState error={error} onRetry={load} />;
  if (!data) return null;

  const s = data.summary || {};

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Gross Revenue</p>
            <p className="text-xl font-bold">{formatCents(s.totalGrossRevenue)}</p>
            <p className="text-xs text-muted-foreground">All confirmed bookings</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Platform Fees (7%)</p>
            <p className="text-xl font-bold text-indigo-600">{formatCents(s.totalPlatformFees)}</p>
            <p className="text-xs text-muted-foreground">GapNight revenue</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Host Earnings</p>
            <p className="text-xl font-bold">{formatCents(s.totalHostEarnings)}</p>
            <p className="text-xs text-muted-foreground">After platform fee</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Paid Out</p>
            <p className="text-xl font-bold text-green-600">{formatCents(s.totalPaidOut)}</p>
            <p className="text-xs text-muted-foreground">Completed payouts</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Owed to Hosts</p>
            <p className="text-xl font-bold text-amber-600">{formatCents(s.totalOwed)}</p>
            <p className="text-xs text-muted-foreground">{s.hostCount} hosts</p>
          </CardContent>
        </Card>
      </div>

      {/* Per-Host Revenue Table */}
      <Card>
        <CardHeader>
          <CardTitle>Host Revenue Breakdown</CardTitle>
          <CardDescription>Revenue and payout status per host</CardDescription>
        </CardHeader>
        <CardContent>
          {(data.hosts || []).length === 0 ? (
            <p className="text-center py-8 text-slate-400">No hosts with revenue yet</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Host</TableHead>
                    <TableHead className="text-xs">Properties</TableHead>
                    <TableHead className="text-xs">Completed</TableHead>
                    <TableHead className="text-xs">Gross Revenue</TableHead>
                    <TableHead className="text-xs">Platform Fee</TableHead>
                    <TableHead className="text-xs">Host Earnings</TableHead>
                    <TableHead className="text-xs">Paid</TableHead>
                    <TableHead className="text-xs">Owed</TableHead>
                    <TableHead className="text-xs">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.hosts.filter((h: any) => h.completedBookings > 0 || h.grossRevenue > 0).map((host: any) => (
                    <TableRow key={host.hostId}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{host.hostName}</p>
                          <p className="text-xs text-muted-foreground">{host.hostEmail}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{host.propertyCount}</TableCell>
                      <TableCell className="text-sm">{host.completedBookings}</TableCell>
                      <TableCell className="text-sm font-mono">{formatCents(host.grossRevenue)}</TableCell>
                      <TableCell className="text-sm font-mono text-indigo-600">{formatCents(host.platformFees)}</TableCell>
                      <TableCell className="text-sm font-mono font-semibold">{formatCents(host.hostEarnings)}</TableCell>
                      <TableCell className="text-sm font-mono text-green-600">{formatCents(host.totalPaid)}</TableCell>
                      <TableCell>
                        {host.owed > 0 ? (
                          <Badge variant="outline" className="text-amber-600 border-amber-300 text-xs font-mono">
                            {formatCents(host.owed)}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">Settled</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {host.owed > 0 && (
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openCreatePayout(host)}>
                            <DollarSign className="w-3 h-3 mr-1" /> Pay
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Payout Dialog */}
      <Dialog open={!!createPayoutHost} onOpenChange={open => !open && setCreatePayoutHost(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Payout</DialogTitle>
            <DialogDescription>
              Pay {createPayoutHost?.hostName} ({createPayoutHost?.hostEmail})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-lg text-sm space-y-1">
              <div className="flex justify-between"><span className="text-muted-foreground">Host Earnings:</span><span className="font-mono">{formatCents(createPayoutHost?.hostEarnings || 0)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Already Paid:</span><span className="font-mono text-green-600">{formatCents(createPayoutHost?.totalPaid || 0)}</span></div>
              <div className="flex justify-between font-semibold"><span>Owed:</span><span className="font-mono text-amber-600">{formatCents(createPayoutHost?.owed || 0)}</span></div>
            </div>
            <div className="space-y-2">
              <Label>Payout Amount ($)</Label>
              <Input type="number" step="0.01" value={payoutForm.amount} onChange={e => setPayoutForm({...payoutForm, amount: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Method</Label>
              <Select value={payoutForm.method} onValueChange={v => setPayoutForm({...payoutForm, method: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="stripe_connect">Stripe Connect</SelectItem>
                  <SelectItem value="manual">Manual / Cash</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Reference (optional)</Label>
              <Input placeholder="Bank transfer ref or Stripe ID" value={payoutForm.reference} onChange={e => setPayoutForm({...payoutForm, reference: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Period Start</Label>
                <Input type="date" value={payoutForm.periodStart} onChange={e => setPayoutForm({...payoutForm, periodStart: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Period End</Label>
                <Input type="date" value={payoutForm.periodEnd} onChange={e => setPayoutForm({...payoutForm, periodEnd: e.target.value})} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea placeholder="Internal notes about this payout..." value={payoutForm.notes} onChange={e => setPayoutForm({...payoutForm, notes: e.target.value})} className="min-h-[60px]" />
            </div>
            <div className="flex gap-2 pt-2">
              <Button className="flex-1" onClick={submitPayout} disabled={creating || !payoutForm.amount || parseFloat(payoutForm.amount) <= 0}>
                {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                Create Payout
              </Button>
              <Button variant="outline" onClick={() => setCreatePayoutHost(null)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ========================================
// S) PAYOUT HISTORY PAGE
// ========================================
function PayoutHistoryPage() {
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => { load(); }, [statusFilter]);

  const load = async () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    const res = await adminFetch(`/payouts?${params}`);
    if (res.ok) setPayouts(res.data.payouts || []);
    else { setError(res.error || "Failed to load"); setPayouts([]); }
    setLoading(false);
  };

  const formatCents = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const updatePayout = async (payoutId: string, newStatus: string, reference?: string) => {
    setActionLoading(payoutId);
    const body: any = { status: newStatus };
    if (reference) body.reference = reference;
    await adminFetch(`/payouts/${payoutId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setActionLoading(null);
    load();
  };

  const markCompleted = async (payoutId: string) => {
    const ref = prompt("Enter payment reference (bank transfer ref, Stripe ID, etc.):");
    if (ref === null) return;
    await updatePayout(payoutId, "completed", ref || undefined);
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      pending: { variant: "outline", label: "Pending" },
      processing: { variant: "secondary", label: "Processing" },
      completed: { variant: "default", label: "Completed" },
      failed: { variant: "destructive", label: "Failed" },
    };
    const cfg = map[status] || { variant: "outline" as const, label: status };
    return <Badge variant={cfg.variant} className="text-xs">{cfg.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Payout History</CardTitle>
              <CardDescription>{payouts.length} payouts</CardDescription>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40 h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div> :
          error ? <ErrorState error={error} onRetry={load} /> :
          payouts.length === 0 ? <p className="text-center py-8 text-slate-400">No payouts found</p> : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Date</TableHead>
                    <TableHead className="text-xs">Host</TableHead>
                    <TableHead className="text-xs">Amount</TableHead>
                    <TableHead className="text-xs">Platform Fee</TableHead>
                    <TableHead className="text-xs">Method</TableHead>
                    <TableHead className="text-xs">Reference</TableHead>
                    <TableHead className="text-xs">Period</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payouts.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell className="text-xs text-muted-foreground">
                        {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{p.hostName}</p>
                          <p className="text-xs text-muted-foreground">{p.hostEmail}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono font-semibold text-sm">{formatCents(p.amount)}</TableCell>
                      <TableCell className="font-mono text-xs text-indigo-600">{formatCents(p.platformFee)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs capitalize">{(p.method || "").replace("_", " ")}</Badge>
                      </TableCell>
                      <TableCell className="text-xs font-mono max-w-[120px] truncate">{p.reference || "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {p.periodStart && p.periodEnd ? `${p.periodStart} → ${p.periodEnd}` : "—"}
                      </TableCell>
                      <TableCell>{statusBadge(p.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {p.status === "pending" && (
                            <>
                              <Button size="sm" variant="outline" className="h-6 text-xs px-2"
                                disabled={actionLoading === p.id}
                                onClick={() => updatePayout(p.id, "processing")}>
                                {actionLoading === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Process"}
                              </Button>
                              <Button size="sm" variant="default" className="h-6 text-xs px-2"
                                disabled={actionLoading === p.id}
                                onClick={() => markCompleted(p.id)}>
                                Complete
                              </Button>
                            </>
                          )}
                          {p.status === "processing" && (
                            <Button size="sm" variant="default" className="h-6 text-xs px-2"
                              disabled={actionLoading === p.id}
                              onClick={() => markCompleted(p.id)}>
                              {actionLoading === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Mark Paid"}
                            </Button>
                          )}
                          {p.status === "failed" && (
                            <Button size="sm" variant="outline" className="h-6 text-xs px-2"
                              disabled={actionLoading === p.id}
                              onClick={() => updatePayout(p.id, "pending")}>
                              Retry
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes about payout process */}
      <Card>
        <CardContent className="p-4">
          <h4 className="font-semibold text-sm mb-2">Payout Process</h4>
          <div className="text-xs text-muted-foreground space-y-1">
            <p>1. Go to <strong>Host Revenue</strong> tab to see what's owed to each host</p>
            <p>2. Click <strong>Pay</strong> to create a payout record with the amount and method</p>
            <p>3. Transfer the funds via bank transfer or Stripe Connect</p>
            <p>4. Come back here and mark the payout as <strong>Completed</strong> with the reference number</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
