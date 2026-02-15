import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { 
  User, Mail, Lock, Bell, Calendar, LogOut, Loader2, 
  AlertCircle, CheckCircle, Eye, EyeOff, Trash2, Shield, Check, X,
  Star, Gift, TrendingUp, Award, MapPin, Clock, DollarSign, Tag, MessageSquare
} from "lucide-react";
import { 
  useAuthStore, logout, resendVerification, fetchCurrentUser,
  validatePassword, getPasswordStrength 
} from "@/hooks/useAuth";
import { useRewards } from "@/hooks/useRewards";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";

export default function Account() {
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading, csrfToken } = useAuthStore();
  const { rewards: rewardsData, reviews } = useRewards();
  const [activeTab, setActiveTab] = useState("profile");
  const [accountStats, setAccountStats] = useState({
    totalBookings: 0,
    totalSaved: 0,
    rewardsPoints: 0,
    reviewsCount: 0,
  });
  
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

  // Calculate account stats from real data
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/auth/bookings", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          const bookings = data.bookings || [];
          
          // Calculate total saved (sum of discounts from deals)
          const totalSaved = bookings.reduce((sum: number, booking: any) => {
            return sum + (booking.discountAmount || 0);
          }, 0);
          
          setAccountStats({
            totalBookings: bookings.length,
            totalSaved: totalSaved / 100, // Convert cents to dollars
            rewardsPoints: rewardsData?.currentPoints || 0,
            reviewsCount: reviews?.length || 0,
          });
        }
      } catch (err) {
        console.error("Failed to fetch account stats:", err);
      }
    };

    if (user) {
      fetchStats();
    }
  }, [user, rewardsData, reviews]);

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
      
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-8 overflow-x-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold">Welcome back, {user.name || "Traveler"}!</h1>
            <p className="text-muted-foreground">Manage your account, bookings, and preferences</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Sign out
          </Button>
        </div>

        {/* Account Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Bookings</p>
                  <p className="text-2xl font-bold">{accountStats.totalBookings}</p>
                </div>
                <Calendar className="w-8 h-8 text-primary opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Saved</p>
                  <p className="text-2xl font-bold">${accountStats.totalSaved.toFixed(2)}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-500 opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Rewards Points</p>
                  <p className="text-2xl font-bold">{accountStats.rewardsPoints}</p>
                </div>
                <Award className="w-8 h-8 text-amber-500 opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Reviews</p>
                  <p className="text-2xl font-bold">{accountStats.reviewsCount}</p>
                </div>
                <Star className="w-8 h-8 text-yellow-500 opacity-20" />
              </div>
            </CardContent>
          </Card>
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
          <TabsList className="flex flex-wrap w-full h-auto gap-1 mb-6">
            <TabsTrigger value="profile">
              <User className="w-4 h-4 mr-2" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="bookings">
              <Calendar className="w-4 h-4 mr-2" />
              Bookings
            </TabsTrigger>
            <TabsTrigger value="reviews">
              <Star className="w-4 h-4 mr-2" />
              Reviews
            </TabsTrigger>
            <TabsTrigger value="rewards">
              <Gift className="w-4 h-4 mr-2" />
              Rewards
            </TabsTrigger>
            <TabsTrigger value="alerts">
              <Bell className="w-4 h-4 mr-2" />
              Alerts
            </TabsTrigger>
            <TabsTrigger value="security">
              <Shield className="w-4 h-4 mr-2" />
              Security
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
                  <div className="flex items-center gap-2 min-w-0">
                    <Input id="email" value={user.email} disabled className="bg-muted min-w-0" />
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

          <TabsContent value="reviews">
            <AccountReviews csrfToken={csrfToken} />
          </TabsContent>

          <TabsContent value="rewards">
            <AccountRewards />
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
  const { submitReview } = useRewards();
  const [bookings, setBookings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewMessage, setReviewMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

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

  const handleOpenReviewDialog = (booking: any) => {
    setSelectedBooking(booking);
    setReviewRating(0);
    setReviewComment("");
    setReviewMessage(null);
    setReviewDialogOpen(true);
  };

  const handleSubmitReview = async () => {
    if (!selectedBooking || reviewRating === 0 || reviewComment.trim().length < 10) {
      setReviewMessage({ type: "error", text: "Please provide a rating and at least 10 characters of feedback" });
      return;
    }

    setIsSubmittingReview(true);
    setReviewMessage(null);

    const result = await submitReview(selectedBooking.id, reviewRating, reviewComment);

    if (result.success) {
      setReviewMessage({ type: "success", text: result.message || "Review submitted successfully!" });
      setTimeout(() => {
        setReviewDialogOpen(false);
        fetchBookings(); // Refresh bookings to update reviewSubmitted status
      }, 1500);
    } else {
      setReviewMessage({ type: "error", text: result.message || "Failed to submit review" });
    }

    setIsSubmittingReview(false);
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
          <Link href="/deals">
            <Button>Browse deals</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {bookings.map((booking) => (
        <Card key={booking.id} className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-lg">{booking.hotelName}</h3>
                    <p className="text-muted-foreground flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3" />
                      {booking.city}
                    </p>
                  </div>
                  <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                    booking.status === "CONFIRMED" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" :
                    booking.status === "CANCELLED" ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" :
                    "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                  }`}>
                    {booking.status}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Check-in</p>
                      <p className="font-medium">{booking.checkInDate}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Check-out</p>
                      <p className="font-medium">{booking.checkOutDate}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Duration</p>
                      <p className="font-medium">{booking.nights} night{booking.nights > 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Room</p>
                      <p className="font-medium">{booking.roomType}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col items-end justify-between border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-6">
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Total paid</p>
                  <p className="text-3xl font-bold text-primary">{booking.currency}{booking.totalPrice}</p>
                </div>
                <div className="space-y-2 w-full">
                  <p className="text-xs text-muted-foreground text-right">Ref: {booking.id}</p>
                  {booking.status === "CONFIRMED" && !booking.reviewSubmitted && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => handleOpenReviewDialog(booking)}
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Write Review
                    </Button>
                  )}
                  {booking.reviewSubmitted && (
                    <div className="text-xs text-green-600 flex items-center justify-end gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Review submitted
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Write Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Write a Review</DialogTitle>
            <DialogDescription>
              {selectedBooking && `Share your experience at ${selectedBooking.hotelName}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {reviewMessage && (
              <Alert variant={reviewMessage.type === "error" ? "destructive" : "default"}>
                {reviewMessage.type === "success" ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertDescription>{reviewMessage.text}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label>Rating *</Label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    type="button"
                    onClick={() => setReviewRating(rating)}
                    className="focus:outline-none"
                  >
                    <Star
                      className={`w-8 h-8 cursor-pointer transition-colors ${
                        rating <= reviewRating
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-gray-300 hover:text-gray-400"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="review-comment">Your Review *</Label>
              <Textarea
                id="review-comment"
                placeholder="Share your experience... (minimum 10 characters)"
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                rows={5}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                {reviewComment.length} characters
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReviewDialogOpen(false)}
              disabled={isSubmittingReview}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitReview}
              disabled={isSubmittingReview || reviewRating === 0 || reviewComment.trim().length < 10}
            >
              {isSubmittingReview ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Review"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Reviews component
function AccountReviews({ csrfToken }: { csrfToken: string | null }) {
  const { reviews, isLoading } = useRewards();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (reviews.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Star className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-2">No reviews yet</h3>
          <p className="text-muted-foreground mb-4">
            Complete a stay to leave your first review and help other travelers!
          </p>
          <Link href="/deals">
            <Button>Browse deals</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <Card key={review.id}>
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-semibold text-lg">{review.hotelName}</h3>
                <p className="text-sm text-muted-foreground">{new Date(review.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${
                      i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                    }`}
                  />
                ))}
              </div>
            </div>
            <p className="text-sm">{review.comment}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Rewards component
function AccountRewards() {
  const { rewards: rewardsData, isLoading, applyPromoCode, convertPointsToCredit, transactions } = useRewards();
  const [promoCode, setPromoCode] = useState("");
  const [isApplying, setIsApplying] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [pointsToConvert, setPointsToConvert] = useState("");
  const [isConverting, setIsConverting] = useState(false);
  const [convertMessage, setConvertMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    
    setIsApplying(true);
    setMessage(null);

    const result = await applyPromoCode(promoCode);
    
    if (result.success) {
      setMessage({ type: "success", text: result.message || "Promo code applied!" });
      setPromoCode("");
    } else {
      setMessage({ type: "error", text: result.message || "Invalid promo code" });
    }

    setIsApplying(false);
  };

  const handleConvertPoints = async () => {
    const points = parseInt(pointsToConvert);
    if (isNaN(points) || points < 100) {
      setConvertMessage({ type: "error", text: "Minimum 100 points required" });
      return;
    }

    setIsConverting(true);
    setConvertMessage(null);

    const result = await convertPointsToCredit(points);
    
    if (result.success) {
      setConvertMessage({ type: "success", text: result.message || "Points converted!" });
      setPointsToConvert("");
    } else {
      setConvertMessage({ type: "error", text: result.message || "Conversion failed" });
    }

    setIsConverting(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!rewardsData) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Failed to load rewards data</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Rewards Overview */}
      <Card className="bg-gradient-to-br from-primary/10 to-purple-500/10 border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-2xl font-bold">GapNight Rewards</h3>
              <p className="text-muted-foreground">Member Tier: <span className="font-semibold text-amber-600">{rewardsData.tier}</span></p>
            </div>
            <Award className="w-12 h-12 text-amber-500" />
          </div>
          
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Points Progress</span>
                <span className="font-medium">{rewardsData.currentPoints} / {rewardsData.pointsToNextTier}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-primary to-purple-500 transition-all"
                  style={{ width: `${rewardsData.pointsToNextTier > 0 ? (rewardsData.currentPoints / rewardsData.pointsToNextTier) * 100 : 0}%` }}
                />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Earn {rewardsData.pointsToNextTier} more points to reach {rewardsData.nextTier} tier!
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Promo Code Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="w-5 h-5" />
            Apply Promo Code
          </CardTitle>
          <CardDescription>
            Have a promo code? Enter it here to unlock special discounts and rewards
          </CardDescription>
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
          
          <div className="flex gap-2">
            <Input
              placeholder="Enter promo code"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
              className="uppercase"
            />
            <Button onClick={handleApplyPromo} disabled={isApplying || !promoCode.trim()}>
              {isApplying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Applying...
                </>
              ) : (
                "Apply"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Available Coupons */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5" />
            Your Coupons
          </CardTitle>
          <CardDescription>Active discounts and vouchers</CardDescription>
        </CardHeader>
        <CardContent>
          {/* No coupons system yet - placeholder */}
          {true ? (
            <div className="text-center py-8">
              <Gift className="w-12 h-12 mx-auto text-muted-foreground mb-3 opacity-50" />
              <p className="text-muted-foreground">No active coupons</p>
              <p className="text-sm text-muted-foreground mt-1">
                Coupons will appear here when you earn or redeem them
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Coupons will be mapped here when implemented */}
              {[].map((coupon: any) => (
                <div key={coupon.id} className="border rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{coupon.title}</p>
                    <p className="text-sm text-muted-foreground">{coupon.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">Expires: {coupon.expiryDate}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">{coupon.discount}</p>
                    <Button size="sm" variant="outline" className="mt-2">Use Now</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Points & Credit Balance */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Available Points
            </CardTitle>
            <CardDescription>Convert points to credit for future bookings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center py-4">
              <p className="text-4xl font-bold text-primary">{rewardsData.currentPoints}</p>
              <p className="text-sm text-muted-foreground mt-1">Available Points</p>
            </div>
            
            {convertMessage && (
              <Alert variant={convertMessage.type === "error" ? "destructive" : "default"}>
                {convertMessage.type === "success" ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertDescription>{convertMessage.text}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label>Convert to Credit (100 pts = $1)</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Points to convert"
                  value={pointsToConvert}
                  onChange={(e) => setPointsToConvert(e.target.value)}
                  min="100"
                  step="100"
                />
                <Button onClick={handleConvertPoints} disabled={isConverting}>
                  {isConverting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Converting...
                    </>
                  ) : (
                    "Convert"
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Minimum 100 points required</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Credit Balance
            </CardTitle>
            <CardDescription>Use credit on your next booking</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-4">
              <p className="text-4xl font-bold text-green-600">
                ${(rewardsData.creditBalance / 100).toFixed(2)}
              </p>
              <p className="text-sm text-muted-foreground mt-1">Available Credit</p>
            </div>
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                Your credit will be automatically applied to your next booking at checkout.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Recent Transactions
          </CardTitle>
          <CardDescription>Your points and rewards activity</CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-3 opacity-50" />
              <p className="text-muted-foreground">No transactions yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Start earning points by booking stays and writing reviews!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.slice(0, 10).map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      transaction.points > 0 ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      {transaction.points > 0 ? (
                        <TrendingUp className="w-5 h-5 text-green-600" />
                      ) : (
                        <DollarSign className="w-5 h-5 text-red-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{transaction.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(transaction.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className={`font-semibold ${transaction.points > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {transaction.points > 0 ? '+' : ''}{transaction.points} pts
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* How to Earn Points */}
      <Card>
        <CardHeader>
          <CardTitle>How to Earn Points</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Book a stay</p>
                <p className="text-sm text-muted-foreground">Earn 5 points per dollar spent</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Star className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Write a review</p>
                <p className="text-sm text-muted-foreground">Earn 50 bonus points</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Tag className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Use promo codes</p>
                <p className="text-sm text-muted-foreground">Unlock special point bonuses</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
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
