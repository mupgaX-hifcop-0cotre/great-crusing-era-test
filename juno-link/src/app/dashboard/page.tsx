"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { useRouter } from "next/navigation";
import { createPublicClient, createWalletClient, custom, formatEther } from "viem";
import { polygonAmoy } from "viem/chains";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, User, Wallet } from "lucide-react";

import { supabase } from "@/lib/supabase";

// ABI for balanceOf
const abi = [
    {
        inputs: [
            { name: "account", type: "address" },
            { name: "id", type: "uint256" }
        ],
        name: "balanceOf",
        outputs: [{ name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function"
    }
] as const;

export default function DashboardPage() {
    const { loggedIn, provider, userInfo, logout } = useAuth();
    const router = useRouter();
    const [address, setAddress] = useState<string>("");
    const [balance, setBalance] = useState<string>("0");
    const [rank, setRank] = useState<string>("Guest (No SBT)");
    const [rankId, setRankId] = useState<number>(0);
    const [loading, setLoading] = useState(true);

    // Placeholder Contract Address - User to update
    const CONTRACT_ADDRESS = "0x0000000000000000000000000000000000000000";

    useEffect(() => {
        if (!loggedIn) {
            router.push("/");
            return;
        }

        const fetchAccountData = async () => {
            if (!provider) return;

            try {
                // Wallet Client for Account
                const walletClient = createWalletClient({
                    chain: polygonAmoy,
                    transport: custom(provider),
                });

                const [addr] = await walletClient.requestAddresses();
                setAddress(addr);

                // Sync with Supabase
                // We do this silently so it doesn't block the UI
                const syncProfile = async () => {
                    if (!supabase || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
                        console.warn("Supabase not configured");
                        return;
                    }

                    try {
                        const { data, error } = await supabase
                            .from('profiles')
                            .select('*')
                            .eq('wallet_address', addr)
                            .single();

                        if (error && error.code === 'PGRST116') {
                            // Profile not found, create one (Zero-PII)
                            const { error: insertError } = await supabase
                                .from('profiles')
                                .insert([
                                    {
                                        wallet_address: addr,
                                        username: `Sailor ${addr.slice(0, 6)}`,
                                        rank: 0,
                                        // No email or name stored
                                    }
                                ]);
                            if (insertError) console.error("Error creating profile:", insertError);
                            else console.log("Created new profile (Zero-PII) for", addr);
                        } else if (data) {
                            console.log("Profile found:", data);
                        }
                    } catch (err) {
                        console.error("Supabase sync error:", err);
                    }
                };
                syncProfile();

                // Public Client for Data (rest of existing logic)
                const publicClient = createPublicClient({
                    chain: polygonAmoy,
                    transport: custom(provider),
                });

                const balance = await publicClient.getBalance({ address: addr });
                setBalance(formatEther(balance));

                // ... contract reading logic...

                // Check SBT Balance
                // We check ID 1 (Deckhand) and ID 2 (Skipper)
                if (CONTRACT_ADDRESS !== "0x0000000000000000000000000000000000000000") {
                    try {
                        const bal1 = await publicClient.readContract({
                            address: CONTRACT_ADDRESS,
                            abi,
                            functionName: "balanceOf",
                            args: [addr, BigInt(1)]
                        });

                        const bal2 = await publicClient.readContract({
                            address: CONTRACT_ADDRESS,
                            abi,
                            functionName: "balanceOf",
                            args: [addr, BigInt(2)]
                        });

                        if (Number(bal2) > 0) {
                            setRank("Skipper");
                            setRankId(2);
                        } else if (Number(bal1) > 0) {
                            setRank("Deckhand");
                            setRankId(1);
                        } else {
                            setRank("Guest (No SBT)");
                            setRankId(0);
                        }
                    } catch (err) {
                        console.error("Error reading contract:", err);
                        // Default to Guest if contract read fails (e.g. invalid address)
                        setRank("Guest (Simulated)");
                    }
                } else {
                    // Simulation for demo if no contract address
                    setRank("Guest (No SBT)");
                }

            } catch (error) {
                console.error("Error fetching account data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAccountData();
    }, [loggedIn, provider, router, userInfo]);

    if (!loggedIn || loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background p-4 md:p-8">
            <header className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-bold text-primary font-serif">JUNO LINK</h1>
                <Button variant="outline" onClick={() => logout()} className="border-primary text-primary hover:bg-primary hover:text-primary-foreground">
                    Logout
                </Button>
            </header>

            <main className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
                {/* User Info Card */}
                <Card className="shadow-lg border-secondary/20">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xl font-medium text-primary font-serif">Captain&apos;s Log</CardTitle>
                        <User className="h-5 w-5 text-secondary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-sm font-medium text-muted-foreground mb-1">Identity</div>
                        <div className="text-lg font-bold text-foreground break-all">
                            {userInfo?.name || "Unknown Sailor"}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                            {userInfo?.email || "No email provided"}
                        </div>
                    </CardContent>
                </Card>

                {/* Wallet Info Card */}
                <Card className="shadow-lg border-secondary/20">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xl font-medium text-primary font-serif">Treasury</CardTitle>
                        <Wallet className="h-5 w-5 text-secondary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-sm font-medium text-muted-foreground mb-1">Address</div>
                        <div className="text-xs font-mono bg-secondary/5 p-2 rounded border border-secondary/10 break-all">
                            {address}
                        </div>

                        <div className="mt-4">
                            <div className="text-sm font-medium text-muted-foreground mb-1">Balance</div>
                            <div className="text-2xl font-bold text-foreground">
                                {Number(balance).toFixed(4)} <span className="text-sm font-normal text-muted-foreground">POL</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* SBT Status */}
                <Card className={`shadow-lg border-secondary/20 ${rankId > 0 ? 'bg-secondary/5' : ''}`}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xl font-medium text-primary font-serif">Crew Status</CardTitle>
                        <Badge variant={rankId > 0 ? "default" : "outline"} className={rankId > 0 ? "bg-primary" : ""}>
                            ID: {rankId}
                        </Badge>
                    </CardHeader>
                    <CardContent>
                        <div className="text-sm font-medium text-muted-foreground mb-2">Current Rank</div>
                        <div className="text-2xl font-bold text-accent font-serif uppercase tracking-widest">
                            {rank}
                        </div>
                        {rankId === 0 && (
                            <p className="text-xs text-muted-foreground mt-2">
                                Acquire a JunoCrew SBT to upgrade your rank.
                            </p>
                        )}
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
