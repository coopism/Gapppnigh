import { useState, useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ScrollToTop } from "@/components/ScrollToTop";

import ComingSoon from "@/pages/ComingSoon";
import Landing from "@/pages/Landing";
import Deals from "@/pages/Home";
import DealDetail from "@/pages/DealDetail";
import ListYourHotel from "@/pages/ListYourHotel";
import Waitlist from "@/pages/Waitlist";
import Terms from "@/pages/Terms";
import Privacy from "@/pages/Privacy";
import OrphanNightsDashboard from "@/pages/hotel/dashboard/OrphanNights";
import NotFound from "@/pages/NotFound";

import OwnerLogin from "@/pages/owner/Login";
import OwnerRegister from "@/pages/owner/Register";
import OwnerDashboard from "@/pages/owner/Dashboard";
import HotelNew from "@/pages/owner/HotelNew";
import HotelManage from "@/pages/owner/HotelManage";
import HotelDeals from "@/pages/owner/HotelDeals";
import HotelDealsPublic, { HotelDealDetail } from "@/pages/HotelDealsPublic";

function MainRouter() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/deals" component={Deals} />
      <Route path="/deal/:id" component={DealDetail} />
      <Route path="/list-your-hotel" component={ListYourHotel} />
      <Route path="/waitlist" component={Waitlist} />
      <Route path="/terms" component={Terms} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/hotel/dashboard/orphan-nights" component={OrphanNightsDashboard} />
      <Route path="/owner/login" component={OwnerLogin} />
      <Route path="/owner/register" component={OwnerRegister} />
      <Route path="/owner/dashboard" component={OwnerDashboard} />
      <Route path="/owner/hotels/new" component={HotelNew} />
      <Route path="/owner/hotels/:hotelId" component={HotelManage} />
      <Route path="/owner/hotels/:hotelId/deals" component={HotelDeals} />
      <Route path="/gap-night-deals" component={HotelDealsPublic} />
      <Route path="/hotels/:hotelId/deals" component={HotelDealDetail} />
      <Route component={NotFound} />
    </Switch>
  );
}

function PublicRouter({ onPartnerAccess }: { onPartnerAccess: () => void }) {
  return (
    <Switch>
      <Route path="/terms" component={Terms} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/owner/login" component={OwnerLogin} />
      <Route path="/owner/register" component={OwnerRegister} />
      <Route path="/owner/dashboard" component={OwnerDashboard} />
      <Route path="/owner/hotels/new" component={HotelNew} />
      <Route path="/owner/hotels/:hotelId" component={HotelManage} />
      <Route path="/owner/hotels/:hotelId/deals" component={HotelDeals} />
      <Route path="/gap-night-deals" component={HotelDealsPublic} />
      <Route path="/hotels/:hotelId/deals" component={HotelDealDetail} />
      <Route>
        <ComingSoon onPartnerAccess={onPartnerAccess} />
      </Route>
    </Switch>
  );
}

function App() {
  const [hasPartnerAccess, setHasPartnerAccess] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("partner_access") === "true";
    }
    return false;
  });

  useEffect(() => {
    const handleStorageChange = () => {
      setHasPartnerAccess(localStorage.getItem("partner_access") === "true");
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const handlePartnerAccess = () => {
    setHasPartnerAccess(true);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          {hasPartnerAccess ? (
            <>
              <MainRouter />
              <ScrollToTop />
            </>
          ) : (
            <PublicRouter onPartnerAccess={handlePartnerAccess} />
          )}
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
