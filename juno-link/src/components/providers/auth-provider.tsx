"use client";

import { createContext, useContext, useEffect, useState, useRef } from "react";
import { Web3Auth } from "@web3auth/modal";
import { CHAIN_NAMESPACES, IProvider, WEB3AUTH_NETWORK } from "@web3auth/base";
import { EthereumPrivateKeyProvider } from "@web3auth/ethereum-provider";

// Context type
interface AuthContextType {
    provider: IProvider | null;
    loggedIn: boolean;
    login: () => Promise<void>;
    logout: () => Promise<void>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    userInfo: any;
    isInitialized: boolean;
    error: string | null;
}

const AuthContext = createContext<AuthContextType>({
    provider: null,
    loggedIn: false,
    login: async () => { },
    logout: async () => { },
    userInfo: null,
    isInitialized: false,
    error: null,
});

export const useAuth = () => useContext(AuthContext);

// Polygon Amoy Config
const chianId = "0x13882"; // 80002
const chainConfig = {
    chainNamespace: CHAIN_NAMESPACES.EIP155,
    chainId: chianId,
    rpcTarget: "https://rpc-amoy.polygon.technology",
    displayName: "Polygon Amoy Testnet",
    blockExplorerUrl: "https://amoy.polygonscan.com",
    ticker: "POL",
    tickerName: "Polygon Ecosystem Token",
};

// Web3Auth Client ID
const clientId = process.env.NEXT_PUBLIC_WEB3AUTH_CLIENT_ID || "";

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [web3auth, setWeb3auth] = useState<Web3Auth | null>(null);
    const [provider, setProvider] = useState<IProvider | null>(null);
    const [loggedIn, setLoggedIn] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [userInfo, setUserInfo] = useState<any>(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const initRef = useRef(false);

    useEffect(() => {
        const init = async () => {
            if (initRef.current) return;
            initRef.current = true;

            try {
                const privateKeyProvider = new EthereumPrivateKeyProvider({
                    config: { chainConfig },
                });

                const web3authInstance = new Web3Auth({
                    clientId,
                    web3AuthNetwork: WEB3AUTH_NETWORK.SAPPHIRE_DEVNET,
                    privateKeyProvider,
                });

                // Race between init and timeout
                await Promise.race([
                    web3authInstance.initModal().catch(e => {
                        console.error("Web3Auth initModal error:", e);
                        throw e;
                    }),
                    new Promise((_, reject) => setTimeout(() => reject(new Error("Web3Auth Initialization Timeout (10s)")), 10000))
                ]);

                setWeb3auth(web3authInstance);

                if (web3authInstance.connected) {
                    setProvider(web3authInstance.provider);
                    setLoggedIn(true);
                    const user = await web3authInstance.getUserInfo();
                    setUserInfo(user);
                }
            } catch (error) {
                console.error("Error initializing Web3Auth:", error);
                const errorMessage = error instanceof Error ? error.message : String(error);
                setError(errorMessage);
            } finally {
                setIsInitialized(true);
            }
        };

        init();
    }, []);

    const login = async () => {
        if (!web3auth) {
            console.log("web3auth not initialized yet");
            setError("Web3Auth not initialized. Please refresh.");
            return;
        }
        try {
            setError(null);
            const web3authProvider = await web3auth.connect();
            setProvider(web3authProvider);
            setLoggedIn(true);
            const user = await web3auth.getUserInfo();
            setUserInfo(user);

            // Sync user to Supabase Profiles
            if (user && web3authProvider) {
                // Get address
                const accounts = (await web3authProvider.request({ method: "eth_accounts" })) as string[];
                const address = accounts?.[0];

                if (address) {
                    const normalizedAddress = address.toLowerCase();
                    const { createClient } = await import("@supabase/supabase-js");
                    const supabase = createClient(
                        process.env.NEXT_PUBLIC_SUPABASE_URL!,
                        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
                    );

                    // Allow updating email if present
                    const updates: Record<string, unknown> = {
                        wallet_address: normalizedAddress,
                        updated_at: new Date().toISOString(),
                    };

                    if (user.email) {
                        updates.email = user.email;
                    }
                    if (user.name) {
                        updates.username = user.name;
                    }

                    // We use upsert to create or update. 
                    // Note: This relies on RLS allowing update/insert for the user's wallet address.
                    // The 'supabase_rls_guest_fix.sql' or similar policies must allow this.
                    const { error: upsertError } = await supabase
                        .from('profiles')
                        .upsert(updates, { onConflict: 'wallet_address' });

                    if (upsertError) {
                        console.error("Error syncing profile:", upsertError);
                    }
                }
            }
        } catch (error) {
            console.error("Error logging in:", error);
            setError(error instanceof Error ? error.message : "Login failed");
        }
    };

    const logout = async () => {
        if (!web3auth) {
            console.log("web3auth not initialized yet");
            return;
        }
        try {
            await web3auth.logout();
            setProvider(null);
            setLoggedIn(false);
            setUserInfo(null);
        } catch (error) {
            console.error("Error logging out:", error);
        }
    };

    return (
        <AuthContext.Provider value={{ provider, loggedIn, login, logout, userInfo, isInitialized, error }}>
            {children}
        </AuthContext.Provider>
    );
};
