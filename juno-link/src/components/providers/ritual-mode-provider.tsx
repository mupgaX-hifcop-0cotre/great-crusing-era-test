"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

interface RitualModeContextType {
    isAwakening: boolean;
    startAwakening: () => void;
    endAwakening: () => void;
}

const RitualModeContext = createContext<RitualModeContextType | undefined>(undefined);

export function RitualModeProvider({ children }: { children: React.ReactNode }) {
    const [isAwakening, setIsAwakening] = useState(false);

    useEffect(() => {
        // Apply the data attribute to the body element
        if (isAwakening) {
            document.body.setAttribute("data-ritual-mode", "active");
        } else {
            document.body.removeAttribute("data-ritual-mode");
        }
    }, [isAwakening]);

    const startAwakening = () => setIsAwakening(true);
    const endAwakening = () => setIsAwakening(false);

    return (
        <RitualModeContext.Provider value={{ isAwakening, startAwakening, endAwakening }}>
            {isAwakening && <div className="ritual-overlay" />}
            {children}
        </RitualModeContext.Provider>
    );
}

export function useRitualMode() {
    const context = useContext(RitualModeContext);
    if (context === undefined) {
        throw new Error("useRitualMode must be used within a RitualModeProvider");
    }
    return context;
}
