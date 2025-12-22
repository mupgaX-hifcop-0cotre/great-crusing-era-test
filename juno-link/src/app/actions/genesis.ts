"use server";

import { DiagnosticAnswers, resolveAwakeningLogic, constructAvatarPrompt } from "@/lib/genesis/logic";
import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types";

// Initialize Supabase Admin Client for Server Actions
// Note: In production you should use the Service Role Key for admin tasks,
// but for this demo/prototype we use the standard key hoping the RLS allows updates or we trust the user context if we had auth cookies.
// The user has 'Users can update their own profile' policy essentially open for now.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient<Database>(supabaseUrl, supabaseKey);

export async function submitAwakening(userId: string | null, answers: DiagnosticAnswers) {
    // Simulate AI generation time (3s)
    await new Promise((resolve) => setTimeout(resolve, 3000));

    console.log("Server Action: Processing Awakening for", userId);

    // 1. Resolve Logic
    const logicResult = resolveAwakeningLogic(answers);
    const prompt = constructAvatarPrompt(logicResult);

    // 2. (Mock) Generate Image
    // Return a placeholder image based on the animal for now.
    // In a real app: const image = await openai.images.generate({ prompt });
    const mockImageMap: Record<string, string> = {
        "Sea Turtle": "https://api.dicebear.com/7.x/pixel-art/svg?seed=SeaTurtle",
        "Whale": "https://api.dicebear.com/7.x/pixel-art/svg?seed=Whale",
        "Hermit Crab": "https://api.dicebear.com/7.x/pixel-art/svg?seed=HermitCrab",
        "Shark": "https://api.dicebear.com/7.x/pixel-art/svg?seed=Shark",
        "Orca": "https://api.dicebear.com/7.x/pixel-art/svg?seed=Orca",
        "Polar Bear": "https://api.dicebear.com/7.x/pixel-art/svg?seed=PolarBear",
        "Dolphin": "https://api.dicebear.com/7.x/pixel-art/svg?seed=Dolphin",
        "Clownfish": "https://api.dicebear.com/7.x/pixel-art/svg?seed=Clownfish",
        "Sea Otter": "https://api.dicebear.com/7.x/pixel-art/svg?seed=SeaOtter",
        "Seagull": "https://api.dicebear.com/7.x/pixel-art/svg?seed=Seagull",
        "Pelican": "https://api.dicebear.com/7.x/pixel-art/svg?seed=Pelican",
        "Flying Fish": "https://api.dicebear.com/7.x/pixel-art/svg?seed=FlyingFish"
    };

    const imageUrl = mockImageMap[logicResult.animal] || "https://api.dicebear.com/7.x/pixel-art/svg?seed=Unknown";

    if (userId) {
        try {
            // 3. Persist to DB
            // A. Log the generation
            const { error: genError } = await supabase.from('avatar_generations').insert({
                user_id: userId,
                status: 'completed',
                answers: answers as object, // jsonb casting
                determined_archetype: logicResult.archetype,
                determined_animal: logicResult.animal,
                generated_prompt: prompt,
                image_url: imageUrl
            });

            if (genError) console.error("Error logging generation:", genError);

            // B. Update Profile
            const { error: profileError } = await supabase.from('profiles').update({
                rank: 1, // Promote to Crew
                archetype: logicResult.archetype,
                avatar_url: imageUrl,
                avatar_metadata: {
                    animal: logicResult.animal,
                    item: logicResult.item,
                    vibe: logicResult.vibe
                }
            }).eq('wallet_address', userId);

            if (profileError) console.error("Error updating profile:", profileError);

        } catch (e) {
            console.error("Database operation failed:", e);
        }
    }

    return {
        success: true,
        data: {
            result: logicResult,
            prompt: prompt,
            imageUrl: imageUrl
        },
        message: "The ritual is complete.",
    };
}
