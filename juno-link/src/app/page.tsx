"use client";

import { Button } from "@/components/ui/button";
import { Anchor } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const { login, loggedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loggedIn) {
      router.push("/dashboard");
    }
  }, [loggedIn, router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
      <div className="flex flex-col items-center space-y-8 border-4 border-double border-secondary p-12 shadow-xl bg-card rounded-lg max-w-md w-full">
        <div className="rounded-full bg-secondary/10 p-6">
          <Anchor className="h-16 w-16 text-primary" />
        </div>

        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tighter text-primary font-serif">
            JUNO LINK
          </h1>
          <p className="text-muted-foreground italic font-serif">
            Navigate the era of discovery.
          </p>
        </div>

        <div className="w-full pt-8 border-t border-secondary/20">
          <Button
            size="lg"
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold tracking-wider"
            onClick={() => login()}
          >
            CONNECT WALLET
          </Button>
          <p className="text-xs text-muted-foreground mt-4">
            Connect to the Polygon Amoy Testnet
          </p>
        </div>
      </div>

      <footer className="absolute bottom-4 text-xs text-muted-foreground">
        &copy; 2025 Juno Link. All rights reserved.
      </footer>
    </main>
  );
}
