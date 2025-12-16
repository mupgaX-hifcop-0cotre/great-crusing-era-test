"use client";

import { createContext, useContext, useEffect, useState } from "react";
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
}

const AuthContext = createContext<AuthContextType>({
    provider: null,
    loggedIn: false,
    login: async () => { },
    logout: async () => { },
    userInfo: null,
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

// Web3Auth Client ID (Placeholder)
const clientId = "BPi5PB_Ui1iGkslp82nxaPMLuAgRIqdMH12XS9juW5jMOr9qQbrbpbb8mK5nK_weuD3b04u7J9_u5ffF4c-8j-4"; // Public helper ID or use user provided

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [web3auth, setWeb3auth] = useState<Web3Auth | null>(null);
    const [provider, setProvider] = useState<IProvider | null>(null);
    const [loggedIn, setLoggedIn] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [userInfo, setUserInfo] = useState<any>(null);

    useEffect(() => {
        const init = async () => {
            try {
                const privateKeyProvider = new EthereumPrivateKeyProvider({
                    config: { chainConfig },
                });

                const web3auth = new Web3Auth({
                    clientId,
                    web3AuthNetwork: WEB3AUTH_NETWORK.SAPPHIRE_MAINNET,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    privateKeyProvider: privateKeyProvider as any,
                });

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                await (web3auth as any).initModal();
                setWeb3auth(web3auth);

                if (web3auth.connected) {
                    setProvider(web3auth.provider);
                    setLoggedIn(true);
                    const user = await web3auth.getUserInfo();
                    setUserInfo(user);
                }
            } catch (error) {
                console.error("Error initializing Web3Auth:", error);
            }
        };

        init();
    }, []);

    const login = async () => {
        if (!web3auth) {
            console.log("web3auth not initialized yet");
            return;
        }
        try {
            const web3authProvider = await web3auth.connect();
            setProvider(web3authProvider);
            setLoggedIn(true);
            const user = await web3auth.getUserInfo();
            setUserInfo(user);
        } catch (error) {
            console.error("Error logging in:", error);
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
        <AuthContext.Provider value={{ provider, loggedIn, login, logout, userInfo }}>
            {children}
        </AuthContext.Provider>
    );
};
