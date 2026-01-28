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
import NotFound from "@/pages/NotFound";

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
      <Route component={NotFound} />
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
            <ComingSoon onPartnerAccess={handlePartnerAccess} />
          )}
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
