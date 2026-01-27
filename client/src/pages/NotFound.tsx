import { Link } from "wouter";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background">
      <div className="mb-8 p-6 bg-red-50 rounded-full">
        <AlertTriangle className="h-16 w-16 text-destructive" />
      </div>
      <h1 className="text-4xl font-display font-bold text-foreground mb-4">404 Page Not Found</h1>
      <p className="text-muted-foreground text-lg mb-8 max-w-md text-center">
        Oops! The page you're looking for doesn't exist or has been moved.
      </p>
      <Link href="/">
        <Button size="lg" className="font-bold rounded-xl">
          Return Home
        </Button>
      </Link>
    </div>
  );
}
