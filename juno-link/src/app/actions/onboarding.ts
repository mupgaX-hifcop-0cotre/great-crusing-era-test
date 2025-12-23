"use server";

import { createClient } from "@supabase/supabase-js";
import { Database, Profile } from "@/types";
import { revalidatePath } from "next/cache";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient<Database>(supabaseUrl, supabaseKey);

export async function completeOnboardingTutorial(walletAddress: string) {
    if (!walletAddress) return { success: false, error: "No wallet address provided" };

    const normalizedAddress = walletAddress.toLowerCase();

    try {
        // 1. Check if user exists or create them (Rank 0)
        const { data: rawProfile, error: fetchError } = await supabase
            .from('profiles')
            .select('*')
            .ilike('wallet_address', normalizedAddress)
            .maybeSingle();

        if (fetchError) {
            console.error("Error fetching profile for onboarding:", fetchError);
            return { success: false, error: "Database error" };
        }

        const profile = rawProfile as Profile | null;

        let currentBalance = 0;
        let isRank0 = true;

        if (profile) {
            currentBalance = profile.nm_balance || 0;
            isRank0 = (profile.rank || 0) === 0;
        }

        // 2. Eligibility Check
        // We only want to give this reward ONCE.
        // Heuristic: If they are Rank 0 AND have < 100 NM, give it.
        // If they are Rank > 0, they shouldn't need this tutorial money (or already did it).
        // If they have >= 100 NM, maybe they already did it.
        if (!isRank0) {
            return { success: false, error: "User is already an Awakened Captain." };
        }

        if (currentBalance >= 100) {
            return { success: false, error: "You already have sufficient funds for the voyage." };
        }

        // 3. Credit 100 NM
        const REWARD_AMOUNT = 100;

        const updates = {
            wallet_address: normalizedAddress,
            nm_balance: currentBalance + REWARD_AMOUNT,
            // Ensure rank stays 0 until they Awaken
            rank: 0,
            // If we don't have a username yet, keep it generic or let them set it later
            username: profile?.username || `Crewmate ${normalizedAddress.slice(0, 6)}`
        };

        const { error: upsertError } = await supabase
            .from('profiles')
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .upsert(updates as any, { onConflict: 'wallet_address' });

        if (upsertError) {
            console.error("Error crediting onboarding reward:", upsertError);
            return { success: false, error: "Failed to credit reward." };
        }

        // 4. Log a notification (Optional, but nice)
        // We can do this on the client or here. Doing it here ensures it's recorded.
        // Assuming we have a notifications table or similar logic, but for now we skip to keep it simple.

        revalidatePath('/dashboard');

        return { success: true, newBalance: currentBalance + REWARD_AMOUNT };

    } catch (error) {
        console.error("Onboarding server action error:", error);
        return { success: false, error: "Unexpected error" };
    }
}
