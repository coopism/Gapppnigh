import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3, Users, DollarSign, Calendar, TrendingUp, Shield,
  Activity, Settings, LogOut, Search, Plus, Trash2, Eye,
  AlertCircle, CheckCircle, Loader2, Gift, Star, MapPin
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

interface AdminStats {
  totalUsers: number;
  totalBookings: number;
  totalDeals: number;
  totalHotels: number;
  totalReviews: number;
  totalRevenue: number;
  avgBookingValue: number;
  recentUsers: number;
  recentBookings: number;
}

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const [admin, setAdmin] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [topCities, setTopCities] = useState<any[]>([]);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch(`${ADMIN_API}/me`, {
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        setAdmin(data.admin);
        await loadDashboardData();
      } else {
        setLocation("/admin/login");
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      setLocation("/admin/login");
    } finally {
      setIsLoading(false);
    }
  };

  const loadDashboardData = async () => {
    try {
      const res = await fetch(`${ADMIN_API}/stats/overview`, {
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        setStats(data.overview);
        setTopCities(data.topCities);
      }
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch(`${ADMIN_API}/logout`, {
        method: "POST",
        credentials: "include",
      });
      setLocation("/admin/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!admin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-xl font-bold">GapNight Admin Panel</h1>
                <p className="text-sm text-muted-foreground">
                  Welcome back, {admin.name}
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-6 mb-8">
            <TabsTrigger value="overview">
              <BarChart3 className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="users">
              <Users className="w-4 h-4 mr-2" />
              Users
            </TabsTrigger>
            <TabsTrigger value="bookings">
              <Calendar className="w-4 h-4 mr-2" />
              Bookings
            </TabsTrigger>
            <TabsTrigger value="promos">
              <Gift className="w-4 h-4 mr-2" />
              Promo Codes
            </TabsTrigger>
            <TabsTrigger value="activity">
              <Activity className="w-4 h-4 mr-2" />
              Activity Logs
            </TabsTrigger>
            <TabsTrigger value="system">
              <Settings className="w-4 h-4 mr-2" />
              System
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <OverviewTab stats={stats} topCities={topCities} />
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <UsersTab />
          </TabsContent>

          {/* Bookings Tab */}
          <TabsContent value="bookings">
            <BookingsTab />
          </TabsContent>

          {/* Promo Codes Tab */}
          <TabsContent value="promos">
            <PromoCodesTab />
          </TabsContent>

          {/* Activity Logs Tab */}
          <TabsContent value="activity">
            <ActivityLogsTab />
          </TabsContent>

          {/* System Tab */}
          <TabsContent value="system">
            <SystemTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

// Overview Tab Component
function OverviewTab({ stats, topCities }: { stats: AdminStats | null; topCities: any[] }) {
  if (!stats) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              +{stats.recentUsers} in last 30 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalBookings.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              +{stats.recentBookings} in last 30 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Avg: ${stats.avgBookingValue.toLocaleString()} per booking
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Hotels</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalHotels.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalDeals.toLocaleString()} active deals
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top Cities by Bookings</CardTitle>
            <CardDescription>Most popular destinations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topCities.map((city, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{city.city}</span>
                  </div>
                  <Badge variant="secondary">{city.bookings} bookings</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Platform Metrics</CardTitle>
            <CardDescription>Additional statistics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Reviews</span>
                <span className="font-semibold">{stats.totalReviews.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Active Deals</span>
                <span className="font-semibold">{stats.totalDeals.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Conversion Rate</span>
                <span className="font-semibold">
                  {stats.totalUsers > 0 
                    ? ((stats.totalBookings / stats.totalUsers) * 100).toFixed(1)
                    : 0}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Users Tab Component
function UsersTab() {
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);

  useEffect(() => {
    loadUsers();
  }, [searchTerm]);

  const loadUsers = async () => {
    try {
      const res = await fetch(
        `${ADMIN_API}/users?search=${encodeURIComponent(searchTerm)}`,
        { credentials: "include" }
      );

      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      } else {
        console.error("Failed to load users:", res.status, res.statusText);
        setUsers([]);
      }
    } catch (error) {
      console.error("Failed to load users:", error);
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const viewUserDetails = async (userId: string) => {
    try {
      const res = await fetch(`${ADMIN_API}/users/${userId}`, {
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        setSelectedUser(data);
      }
    } catch (error) {
      console.error("Failed to load user details:", error);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>User Management</CardTitle>
              <CardDescription>View and manage platform users</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No users found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.email}</TableCell>
                    <TableCell>{user.name || "—"}</TableCell>
                    <TableCell>
                      {user.emailVerified ? (
                        <Badge variant="default">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Verified
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Unverified
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(user.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => viewUserDetails(user.id)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* User Details Modal */}
      {selectedUser && (
        <Card>
          <CardHeader>
            <CardTitle>User Details</CardTitle>
            <CardDescription>{selectedUser.user.email}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Total Bookings</Label>
                  <p className="text-2xl font-bold">{selectedUser.bookings.length}</p>
                </div>
                <div>
                  <Label>Total Reviews</Label>
                  <p className="text-2xl font-bold">{selectedUser.reviews.length}</p>
                </div>
                <div>
                  <Label>Rewards Points</Label>
                  <p className="text-2xl font-bold">
                    {selectedUser.rewards?.currentPoints || 0}
                  </p>
                </div>
                <div>
                  <Label>Tier</Label>
                  <p className="text-2xl font-bold">
                    {selectedUser.rewards?.tier || "Bronze"}
                  </p>
                </div>
              </div>
              <Button variant="outline" onClick={() => setSelectedUser(null)}>
                Close
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Bookings Tab Component
function BookingsTab() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    loadBookings();
  }, [statusFilter]);

  const loadBookings = async () => {
    try {
      const res = await fetch(
        `${ADMIN_API}/bookings?status=${statusFilter}`,
        { credentials: "include" }
      );

      if (res.ok) {
        const data = await res.json();
        setBookings(data.bookings || []);
      } else {
        console.error("Failed to load bookings:", res.status, res.statusText);
        setBookings([]);
      }
    } catch (error) {
      console.error("Failed to load bookings:", error);
      setBookings([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Booking Management</CardTitle>
            <CardDescription>View all platform bookings</CardDescription>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All statuses</SelectItem>
              <SelectItem value="CONFIRMED">Confirmed</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No bookings found
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Booking ID</TableHead>
                <TableHead>Hotel</TableHead>
                <TableHead>Guest</TableHead>
                <TableHead>Check-in</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.slice(0, 50).map((booking) => (
                <TableRow key={booking.id}>
                  <TableCell className="font-mono text-xs">
                    {booking.id?.substring(0, 8) || 'N/A'}...
                  </TableCell>
                  <TableCell>{booking.hotelName || 'N/A'}</TableCell>
                  <TableCell>{booking.guestEmail || 'N/A'}</TableCell>
                  <TableCell>{booking.checkInDate || 'N/A'}</TableCell>
                  <TableCell>${((booking.totalPrice || 0) / 100).toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        booking.status === "CONFIRMED"
                          ? "default"
                          : booking.status === "CANCELLED"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {booking.status || 'UNKNOWN'}
                    </Badge>
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

// Promo Codes Tab Component
function PromoCodesTab() {
  const [promoCodes, setPromoCodes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCode, setNewCode] = useState({
    code: "",
    type: "POINTS",
    value: "",
    description: "",
    maxUses: "",
    expiresAt: "",
  });

  useEffect(() => {
    loadPromoCodes();
  }, []);

  const loadPromoCodes = async () => {
    try {
      const res = await fetch(`${ADMIN_API}/promo-codes`, {
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        setPromoCodes(data.promoCodes || []);
      } else {
        console.error("Failed to load promo codes:", res.status, res.statusText);
        setPromoCodes([]);
      }
    } catch (error) {
      console.error("Failed to load promo codes:", error);
      setPromoCodes([]);
    } finally {
      setIsLoading(false);
    }
  };

  const createPromoCode = async () => {
    try {
      const res = await fetch(`${ADMIN_API}/promo-codes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...newCode,
          value: parseInt(newCode.value),
          maxUses: newCode.maxUses ? parseInt(newCode.maxUses) : null,
        }),
      });

      if (res.ok) {
        setShowCreateForm(false);
        setNewCode({
          code: "",
          type: "POINTS",
          value: "",
          description: "",
          maxUses: "",
          expiresAt: "",
        });
        loadPromoCodes();
      }
    } catch (error) {
      console.error("Failed to create promo code:", error);
    }
  };

  const deletePromoCode = async (codeId: string) => {
    if (!confirm("Are you sure you want to delete this promo code?")) return;

    try {
      await fetch(`${ADMIN_API}/promo-codes/${codeId}`, {
        method: "DELETE",
        credentials: "include",
      });
      loadPromoCodes();
    } catch (error) {
      console.error("Failed to delete promo code:", error);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Promo Code Management</CardTitle>
              <CardDescription>Create and manage promotional codes</CardDescription>
            </div>
            <Button onClick={() => setShowCreateForm(!showCreateForm)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Code
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showCreateForm && (
            <div className="mb-6 p-4 border rounded-lg space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Code</Label>
                  <Input
                    placeholder="WELCOME50"
                    value={newCode.code}
                    onChange={(e) =>
                      setNewCode({ ...newCode, code: e.target.value.toUpperCase() })
                    }
                  />
                </div>
                <div>
                  <Label>Type</Label>
                  <Select
                    value={newCode.type}
                    onValueChange={(v) => setNewCode({ ...newCode, type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="POINTS">Points</SelectItem>
                      <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                      <SelectItem value="FIXED_AMOUNT">Fixed Amount</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Value</Label>
                  <Input
                    type="number"
                    placeholder="50"
                    value={newCode.value}
                    onChange={(e) => setNewCode({ ...newCode, value: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Max Uses (optional)</Label>
                  <Input
                    type="number"
                    placeholder="100"
                    value={newCode.maxUses}
                    onChange={(e) => setNewCode({ ...newCode, maxUses: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  placeholder="Welcome bonus for new users"
                  value={newCode.description}
                  onChange={(e) => setNewCode({ ...newCode, description: e.target.value })}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={createPromoCode}>Create</Button>
                <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : promoCodes.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No promo codes found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Uses</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {promoCodes.map((code) => (
                  <TableRow key={code.id}>
                    <TableCell className="font-mono font-bold">{code.code}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{code.type}</Badge>
                    </TableCell>
                    <TableCell>{code.value}</TableCell>
                    <TableCell>
                      {code.currentUses} / {code.maxUses || "∞"}
                    </TableCell>
                    <TableCell>
                      {code.isActive ? (
                        <Badge variant="default">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deletePromoCode(code.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Activity Logs Tab Component
function ActivityLogsTab() {
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      const res = await fetch(`${ADMIN_API}/activity-logs`, {
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      } else {
        console.error("Failed to load activity logs:", res.status, res.statusText);
        setLogs([]);
      }
    } catch (error) {
      console.error("Failed to load activity logs:", error);
      setLogs([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Admin Activity Logs</CardTitle>
        <CardDescription>Track all administrative actions</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No activity logs found
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Admin</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>IP Address</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.slice(0, 100).map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    {new Date(log.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{log.action}</Badge>
                  </TableCell>
                  <TableCell>
                    {log.targetType && log.targetId
                      ? `${log.targetType}: ${log.targetId.substring(0, 8)}...`
                      : "—"}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {log.ipAddress || "—"}
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

// System Tab Component
function SystemTab() {
  const [health, setHealth] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSystemHealth();
  }, []);

  const loadSystemHealth = async () => {
    try {
      const res = await fetch(`${ADMIN_API}/system/health`, {
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        setHealth(data);
      } else {
        console.error("Failed to load system health:", res.status, res.statusText);
        setHealth(null);
      }
    } catch (error) {
      console.error("Failed to load system health:", error);
      setHealth(null);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>System Health</CardTitle>
          <CardDescription>Monitor system status and performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Status</span>
              <Badge variant={health?.status === "healthy" ? "default" : "destructive"}>
                {health?.status || "Unknown"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Database</span>
              <Badge variant={health?.database === "connected" ? "default" : "destructive"}>
                {health?.database || "Unknown"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Uptime</span>
              <span className="text-sm">
                {health?.uptime ? `${Math.floor(health.uptime / 3600)}h ${Math.floor((health.uptime % 3600) / 60)}m` : "—"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Memory Usage</span>
              <span className="text-sm">
                {health?.memory?.heapUsed || 0} MB / {health?.memory?.heapTotal || 0} MB
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
