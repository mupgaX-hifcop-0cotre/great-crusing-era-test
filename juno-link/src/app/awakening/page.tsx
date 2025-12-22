"use client";

import { Box } from "@mui/material";
import { AwakeningWizard } from "@/components/genesis/awakening-wizard";
// RitualModeProvider is already in layout? 
// If layout wraps everything, we don't need to wrap here again, but we need to check layout.tsx.
// I'll check layout.tsx content again.
// The user might not have added it to layout.tsx yet.
// Since I wrote the provider but didn't edit layout.tsx (the user might have?), I should wrap it here locally 
// OR assume the user will add it globally.
// Given the "Next step" context, let's wrap it here to be safe/self-contained for this page 
// or ensure this page works even if global isn't set.
// Actually, `useRitualMode` throws if not in provider.
// I will wrap this specific page content in the provider to be safe, 
// as it might be better than forcing global wrap if only this page needs it.

import { RitualModeProvider } from "@/components/providers/ritual-mode-provider";

export default function AwakeningPage() {
    return (
        <RitualModeProvider>
            <Box
                sx={{
                    minHeight: "100vh",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    // We rely on ritual.css (injected by provider logic) to handle the background change
                }}
            >
                <AwakeningWizard />
            </Box>
        </RitualModeProvider>
    );
}
