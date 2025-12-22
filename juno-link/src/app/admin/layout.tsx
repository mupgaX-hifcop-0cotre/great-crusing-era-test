"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

// Admin Check
// In a real app, this should be server-side or token-based claim.
// For this demo, we check client-side against the known deployer/admin address.
const ADMIN_ADDRESS = "0x264C351Ace86F18D620a12007A959AEcC02F7DDe"; // Captain's Address (Web3Auth)

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { loggedIn, provider } = useAuth();
    const router = useRouter();
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        const checkAdmin = async () => {
            if (!loggedIn || !provider) {
                router.push("/");
                return;
            }

            try {
                // Get current address from provider
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const addresses = await provider.request({ method: "eth_accounts" }) as any;
                const currentAddress = (addresses as string[])?.[0];

                if (currentAddress && currentAddress.toLowerCase() === ADMIN_ADDRESS.toLowerCase()) {
                    setIsAuthorized(true);
                } else {
                    console.warn("Unauthorized access attempt by:", currentAddress);
                    router.push("/dashboard"); // Redirect non-admins to dashboard
                }
            } catch (error) {
                console.error("Admin check failed:", error);
                router.push("/");
            } finally {
                setChecking(false);
            }
        };

        // Small delay to ensure provider is ready
        const timer = setTimeout(() => {
            checkAdmin();
        }, 500);

        return () => clearTimeout(timer);
    }, [loggedIn, provider, router]);

    if (checking) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="ml-4 text-primary font-serif">Verifying Captain&apos;s Credentials...</p>
            </div>
        );
    }

    if (!isAuthorized) {
        return null; // Will redirect
    }

    return (
        <div className="min-h-screen bg-background text-foreground">
            <div className="bg-primary text-primary-foreground p-2 text-center text-sm font-bold tracking-widest uppercase">
                Captain&apos;s Bridge (Admin Mode)
            </div>
            {children}
        </div>
    );
}
