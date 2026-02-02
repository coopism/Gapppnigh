import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Moon, User, Mail, Lock, Bell, Calendar, LogOut, Loader2, 
  AlertCircle, CheckCircle, Eye, EyeOff, Trash2, Shield, Check, X 
} from "lucide-react";
import { 
  useAuthStore, logout, resendVerification, fetchCurrentUser,
  validatePassword, getPasswordStrength 
} from "@/hooks/useAuth";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";

export default function Account() {
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading, csrfToken } = useAuthStore();
  const [activeTab, setActiveTab] = useState("profile");
  
  // Profile state
  const [name, setName] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  
  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  
  // Verification state
  const [isResending, setIsResending] = useState(false);
  const [verifyMessage, setVerifyMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  
  // Delete account state
  const [deletePassword, setDeletePassword] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const passwordValidation = validatePassword(newPassword);
  const passwordStrength = getPasswordStrength(newPassword);

  useEffect(() => {
    if (user) {
      setName(user.name || "");
    }
  }, [user]);

  useEffect(() => {
    // Check for verification pending param
    const params = new URLSearchParams(window.location.search);
    if (params.get("verified") === "pending") {
      setVerifyMessage({ type: "success", text: "Account created! Please check your email to verify your account." });
    }
  }, []);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      setLocation("/login?redirect=/account");
    }
  }, [authLoading, user, setLocation]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    setProfileMessage(null);
    
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken || "",
        },
        credentials: "include",
        body: JSON.stringify({ name }),
      });
      
      if (res.ok) {
        await fetchCurrentUser();
        setProfileMessage({ type: "success", text: "Profile updated successfully" });
      } else {
        const data = await res.json();
        setProfileMessage({ type: "error", text: data.message || "Failed to update profile" });
      }
    } catch (error) {
      setProfileMessage({ type: "error", text: "Network error. Please try again." });
    }
    
    setIsSavingProfile(false);
  };

  const handleChangePassword = async () => {
    setPasswordMessage(null);
    
    if (!passwordValidation.valid) {
      setPasswordMessage({ type: "error", text: "New password does not meet requirements" });
      return;
    }
    
    if (newPassword !== confirmNewPassword) {
      setPasswordMessage({ type: "error", text: "New passwords do not match" });
      return;
    }
    
    setIsSavingPassword(true);
    
    try {
      const res = await fetch("/api/auth/password", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken || "",
        },
        credentials: "include",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      
      if (res.ok) {
        setPasswordMessage({ type: "success", text: "Password changed successfully" });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmNewPassword("");
      } else {
        const data = await res.json();
        setPasswordMessage({ type: "error", text: data.message || "Failed to change password" });
      }
    } catch (error) {
      setPasswordMessage({ type: "error", text: "Network error. Please try again." });
    }
    
    setIsSavingPassword(false);
  };

  const handleResendVerification = async () => {
    setIsResending(true);
    setVerifyMessage(null);
    
    const result = await resendVerification();
    
    if (result.success) {
      setVerifyMessage({ type: "success", text: "Verification email sent! Check your inbox." });
    } else {
      setVerifyMessage({ type: "error", text: result.error || "Failed to send verification email" });
    }
    
    setIsResending(false);
  };

  const handleLogoutAll = async () => {
    try {
      await fetch("/api/auth/logout-all", {
        method: "POST",
        headers: {
          "X-CSRF-Token": csrfToken || "",
        },
        credentials: "include",
      });
      logout();
      setLocation("/login");
    } catch (error) {
      console.error("Logout all error:", error);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    
    try {
      const res = await fetch("/api/auth/account", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken || "",
        },
        credentials: "include",
        body: JSON.stringify({ password: deletePassword }),
      });
      
      if (res.ok) {
        logout();
        setLocation("/");
      } else {
        const data = await res.json();
        alert(data.message || "Failed to delete account");
      }
    } catch (error) {
      alert("Network error. Please try again.");
    }
    
    setIsDeleting(false);
  };

  const handleLogout = async () => {
    await logout();
    setLocation("/");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      
      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">My Account</h1>
            <p className="text-muted-foreground">Manage your profile and settings</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Sign out
          </Button>
        </div>

        {!user.emailVerified && (
          <Alert className="mb-6 border-yellow-500 bg-yellow-50">
            <Mail className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              Please verify your email to access all features.{" "}
              <button 
                onClick={handleResendVerification} 
                disabled={isResending}
                className="underline font-medium hover:no-underline"
              >
                {isResending ? "Sending..." : "Resend verification email"}
              </button>
            </AlertDescription>
          </Alert>
        )}

        {verifyMessage && (
          <Alert className={`mb-6 ${verifyMessage.type === "success" ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50"}`}>
            {verifyMessage.type === "success" ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600" />
            )}
            <AlertDescription className={verifyMessage.type === "success" ? "text-green-800" : "text-red-800"}>
              {verifyMessage.text}
            </AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="profile">
              <User className="w-4 h-4 mr-2" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="security">
              <Shield className="w-4 h-4 mr-2" />
              Security
            </TabsTrigger>
            <TabsTrigger value="bookings">
              <Calendar className="w-4 h-4 mr-2" />
              Bookings
            </TabsTrigger>
            <TabsTrigger value="alerts">
              <Bell className="w-4 h-4 mr-2" />
              Alerts
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Update your personal details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {profileMessage && (
                  <Alert variant={profileMessage.type === "error" ? "destructive" : "default"}>
                    {profileMessage.type === "success" ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <AlertCircle className="h-4 w-4" />
                    )}
                    <AlertDescription>{profileMessage.text}</AlertDescription>
                  </Alert>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="flex items-center gap-2">
                    <Input id="email" value={user.email} disabled className="bg-muted" />
                    {user.emailVerified ? (
                      <span className="text-xs text-green-600 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Verified
                      </span>
                    ) : (
                      <span className="text-xs text-yellow-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Unverified
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={handleSaveProfile} disabled={isSavingProfile}>
                  {isSavingProfile ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save changes"
                  )}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Change Password</CardTitle>
                  <CardDescription>Update your password to keep your account secure</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {passwordMessage && (
                    <Alert variant={passwordMessage.type === "error" ? "destructive" : "default"}>
                      {passwordMessage.type === "success" ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <AlertCircle className="h-4 w-4" />
                      )}
                      <AlertDescription>{passwordMessage.text}</AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="currentPassword"
                        type={showPasswords ? "text" : "password"}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="pl-9"
                        autoComplete="current-password"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="newPassword"
                        type={showPasswords ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="pl-9 pr-9"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords(!showPasswords)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    
                    {newPassword && (
                      <div className="space-y-2 mt-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all ${passwordStrength.color}`}
                              style={{ width: `${(passwordStrength.score / 6) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">{passwordStrength.label}</span>
                        </div>
                        <ul className="text-xs space-y-1">
                          <li className={`flex items-center gap-1 ${newPassword.length >= 10 ? "text-green-600" : "text-muted-foreground"}`}>
                            {newPassword.length >= 10 ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                            At least 10 characters
                          </li>
                          <li className={`flex items-center gap-1 ${passwordValidation.valid ? "text-green-600" : "text-muted-foreground"}`}>
                            {passwordValidation.valid ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                            3 of: uppercase, lowercase, number, symbol
                          </li>
                        </ul>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirmNewPassword">Confirm New Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="confirmNewPassword"
                        type={showPasswords ? "text" : "password"}
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        className="pl-9"
                        autoComplete="new-password"
                      />
                    </div>
                    {confirmNewPassword && newPassword !== confirmNewPassword && (
                      <p className="text-xs text-destructive">Passwords do not match</p>
                    )}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button onClick={handleChangePassword} disabled={isSavingPassword}>
                    {isSavingPassword ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      "Update password"
                    )}
                  </Button>
                </CardFooter>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Sessions</CardTitle>
                  <CardDescription>Manage your active sessions</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    If you suspect unauthorized access, log out of all devices to secure your account.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" onClick={handleLogoutAll}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Log out of all devices
                  </Button>
                </CardFooter>
              </Card>

              <Card className="border-destructive">
                <CardHeader>
                  <CardTitle className="text-destructive">Delete Account</CardTitle>
                  <CardDescription>Permanently delete your account and all associated data</CardDescription>
                </CardHeader>
                <CardContent>
                  {!showDeleteConfirm ? (
                    <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)}>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete my account
                    </Button>
                  ) : (
                    <div className="space-y-4">
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          This action cannot be undone. All your data will be permanently deleted.
                        </AlertDescription>
                      </Alert>
                      <div className="space-y-2">
                        <Label htmlFor="deletePassword">Enter your password to confirm</Label>
                        <Input
                          id="deletePassword"
                          type="password"
                          value={deletePassword}
                          onChange={(e) => setDeletePassword(e.target.value)}
                          autoComplete="current-password"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="destructive" 
                          onClick={handleDeleteAccount} 
                          disabled={isDeleting || !deletePassword}
                        >
                          {isDeleting ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Deleting...
                            </>
                          ) : (
                            "Permanently delete"
                          )}
                        </Button>
                        <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="bookings">
            <AccountBookings csrfToken={csrfToken} />
          </TabsContent>

          <TabsContent value="alerts">
            <AccountAlerts csrfToken={csrfToken} />
          </TabsContent>
        </Tabs>
      </main>
      
      <Footer />
    </div>
  );
}

// Bookings component
function AccountBookings({ csrfToken }: { csrfToken: string | null }) {
  const [bookings, setBookings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const res = await fetch("/api/auth/bookings", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setBookings(data.bookings || []);
      } else {
        setError("Failed to load bookings");
      }
    } catch (err) {
      setError("Network error");
    }
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <AlertCircle className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (bookings.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-2">No bookings yet</h3>
          <p className="text-muted-foreground mb-4">Start exploring deals to book your first stay!</p>
          <Link href="/">
            <Button>Browse deals</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {bookings.map((booking) => (
        <Card key={booking.id}>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-lg">{booking.hotelName}</h3>
                <p className="text-muted-foreground">{booking.roomType}</p>
                <div className="mt-2 text-sm">
                  <p>
                    <span className="font-medium">Check-in:</span> {booking.checkInDate}
                  </p>
                  <p>
                    <span className="font-medium">Check-out:</span> {booking.checkOutDate}
                  </p>
                  <p>
                    <span className="font-medium">Nights:</span> {booking.nights}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{booking.currency}{booking.totalPrice}</p>
                <span className={`inline-block px-2 py-1 text-xs rounded-full mt-2 ${
                  booking.status === "CONFIRMED" ? "bg-green-100 text-green-800" :
                  booking.status === "CANCELLED" ? "bg-red-100 text-red-800" :
                  "bg-gray-100 text-gray-800"
                }`}>
                  {booking.status}
                </span>
                <p className="text-xs text-muted-foreground mt-2">Ref: {booking.id}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Alerts component
function AccountAlerts({ csrfToken }: { csrfToken: string | null }) {
  const [prefs, setPrefs] = useState({
    preferredCity: "",
    maxPrice: "",
    alertFrequency: "daily",
    isEnabled: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetchPrefs();
  }, []);

  const fetchPrefs = async () => {
    try {
      const res = await fetch("/api/auth/alerts", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setPrefs({
          preferredCity: data.preferences.preferredCity || "",
          maxPrice: data.preferences.maxPrice?.toString() || "",
          alertFrequency: data.preferences.alertFrequency || "daily",
          isEnabled: data.preferences.isEnabled || false,
        });
      }
    } catch (err) {
      console.error("Failed to fetch alert preferences:", err);
    }
    setIsLoading(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/auth/alerts", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken || "",
        },
        credentials: "include",
        body: JSON.stringify({
          preferredCity: prefs.preferredCity || null,
          maxPrice: prefs.maxPrice ? parseInt(prefs.maxPrice) : null,
          alertFrequency: prefs.alertFrequency,
          isEnabled: prefs.isEnabled,
        }),
      });

      if (res.ok) {
        setMessage({ type: "success", text: "Alert preferences saved!" });
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.message || "Failed to save preferences" });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Network error. Please try again." });
    }

    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Deal Alerts</CardTitle>
        <CardDescription>Get notified when new deals match your preferences</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {message && (
          <Alert variant={message.type === "error" ? "destructive" : "default"}>
            {message.type === "success" ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="alertsEnabled" className="font-medium">Enable deal alerts</Label>
            <p className="text-sm text-muted-foreground">Receive email notifications for matching deals</p>
          </div>
          <input
            id="alertsEnabled"
            type="checkbox"
            checked={prefs.isEnabled}
            onChange={(e) => setPrefs({ ...prefs, isEnabled: e.target.checked })}
            className="h-5 w-5"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="preferredCity">Preferred City</Label>
          <Input
            id="preferredCity"
            value={prefs.preferredCity}
            onChange={(e) => setPrefs({ ...prefs, preferredCity: e.target.value })}
            placeholder="e.g., Melbourne, Sydney"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="maxPrice">Maximum Price ($)</Label>
          <Input
            id="maxPrice"
            type="number"
            value={prefs.maxPrice}
            onChange={(e) => setPrefs({ ...prefs, maxPrice: e.target.value })}
            placeholder="e.g., 200"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="alertFrequency">Alert Frequency</Label>
          <select
            id="alertFrequency"
            value={prefs.alertFrequency}
            onChange={(e) => setPrefs({ ...prefs, alertFrequency: e.target.value })}
            className="w-full h-10 px-3 border rounded-md bg-background"
          >
            <option value="daily">Daily digest</option>
            <option value="instant">Instant (as deals are posted)</option>
          </select>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save preferences"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
