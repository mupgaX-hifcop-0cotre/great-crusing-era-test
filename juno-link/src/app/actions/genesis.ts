"use server";

import { DiagnosticAnswers, resolveAwakeningLogic, constructAvatarPrompt, generateReplicateAvatar, OracleMappingResult } from "@/lib/genesis/logic";
import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types";

export interface AwakeningResult {
    success: boolean;
    error?: string;
    data?: {
        result: OracleMappingResult;
        prompt: string;
        imageUrl: string;
    };
    message?: string;
}

// Initialize Supabase Admin Client for Server Actions
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient<Database>(supabaseUrl, supabaseKey);

export async function submitAwakening(userId: string | null, answers: DiagnosticAnswers): Promise<AwakeningResult> {
    if (!userId) return { success: false, error: "Wallet not connected" };

    const normalizedUserId = userId.toLowerCase();

    // 1. Fetch current profile to check Rank and $NM balance
    const { data: profile, error: profileFetchError } = await supabase
        .from('profiles' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .select('*')
        .ilike('wallet_address', normalizedUserId)
        .maybeSingle();

    if (profileFetchError) {
        console.error("Error fetching profile:", profileFetchError);
        return { success: false, error: "Database connection error" };
    }

    const currentRank = (profile as any)?.rank || 0; // eslint-disable-line @typescript-eslint/no-explicit-any
    const currentNm = (profile as any)?.nm_balance || 0; // eslint-disable-line @typescript-eslint/no-explicit-any
    const REGEN_COST = 100;

    // Enforce cost for EVERYONE (Rank 0 must earn NM via tutorial first)
    if (currentNm < REGEN_COST) {
        // Special message for Rank 0 to guide them back to tutorial if they somehow utilized this directly
        const msg = currentRank === 0
            ? "You need 100 $NM to Awaken. Complete the Onboarding Guide to earn it!"
            : `Insufficient $NM. Re-Awakening requires ${REGEN_COST} $NM (Current: ${currentNm})`;

        return {
            success: false,
            error: msg
        };
    }

    // AI generation logic with Stable Diffusion

    // 2. Resolve Logic & Construct Prompt (Rank-aware)
    const logicResult = resolveAwakeningLogic(answers);
    const prompt = constructAvatarPrompt(logicResult, currentRank || 1);
    console.log(`[submitAwakening] Logic resolved for ${normalizedUserId}:`, logicResult);

    let finalImageUrl: string;

    try {
        // 3. Generate avatar with Stable Diffusion via Replicate (5-15 seconds)
        console.log(`[submitAwakening] Generating avatar with Replicate...`);

        // Set timeout for API call (30 seconds)
        const generateWithTimeout = async () => {
            const timeoutPromise = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('Image generation timeout (30s)')), 30000)
            );

            const generatePromise = generateReplicateAvatar(logicResult, currentRank || 1);

            return Promise.race([generatePromise, timeoutPromise]);
        };

        const tempImageUrl = await generateWithTimeout();
        console.log(`[submitAwakening] Image generated:`, tempImageUrl);

        // 4. Download image from temporary URL
        const imageResponse = await fetch(tempImageUrl);
        if (!imageResponse.ok) {
            throw new Error(`Failed to download image: ${imageResponse.statusText}`);
        }
        const imageBlob = await imageResponse.blob();
        console.log(`[submitAwakening] Image downloaded, size: ${imageBlob.size} bytes`);

        // 5. Upload to Supabase Storage
        const fileName = `${normalizedUserId}_${Date.now()}.png`;
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('avatar-images')
            .upload(fileName, imageBlob, {
                contentType: 'image/png',
                upsert: true
            });

        if (uploadError) {
            console.error('[submitAwakening] Storage upload error:', uploadError);
            throw new Error(`Failed to save avatar: ${uploadError.message}`);
        }

        console.log(`[submitAwakening] Image uploaded to storage:`, uploadData.path);

        // 6. Get public URL
        const { data: publicUrlData } = supabase.storage
            .from('avatar-images')
            .getPublicUrl(fileName);

        finalImageUrl = publicUrlData.publicUrl;
        console.log(`[submitAwakening] Public URL generated:`, finalImageUrl);

    } catch (error) {
        console.error('[submitAwakening] Avatar generation failed:', error);

        // Return user-friendly error messages
        if (error instanceof Error) {
            if (error.message.includes('REPLICATE_API_TOKEN')) {
                return {
                    success: false,
                    error: 'サーバー設定エラー: APIトークンが設定されていません。管理者にお問い合わせください。'
                };
            }
            if (error.message.includes('timeout')) {
                return {
                    success: false,
                    error: '画像生成がタイムアウトしました。もう一度お試しください。'
                };
            }
            if (error.message.includes('403') || error.message.includes('401')) {
                return {
                    success: false,
                    error: 'API認証エラー: トークンが無効か、無料枠を超過している可能性があります。'
                };
            }
        }

        return {
            success: false,
            error: `アバター生成に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
    }

    try {
        // 7. Persistence logic
        // Use UPSERT for profile to ensure it exists before logging generation (FK constraint)
        const updates: Record<string, unknown> = {
            wallet_address: normalizedUserId, // Required for insert
            rank: currentRank === 0 ? 1 : currentRank,
            archetype: logicResult.archetype,
            avatar_url: finalImageUrl,
            avatar_metadata: {
                animal: logicResult.animal,
                item: logicResult.item,
                vibe: logicResult.vibe,
                seed: logicResult.seed,
                source: 'seed_based_instant',
                is_regeneration: currentRank > 0
            }
        };

        // Always deduct cost
        updates.nm_balance = currentNm - REGEN_COST;

        // A. Upsert Profile (Must come first!)
        const { error: updateError } = await supabase
            .from('profiles' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
            .upsert(updates as any, { onConflict: 'wallet_address' }) // eslint-disable-line @typescript-eslint/no-explicit-any
            .select();

        if (updateError) {
            console.error("Error updating profile:", updateError);
            return { success: false, error: "Failed to save profile updates" };
        }

        // B. Log the generation (Now safe due to FK satisfaction)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: genError } = await supabase.from('avatar_generations' as any).insert({
            user_id: normalizedUserId,
            status: 'completed',
            answers: answers as object,
            determined_archetype: logicResult.archetype,
            determined_animal: logicResult.animal,
            generated_prompt: prompt,
            image_url: finalImageUrl
        } as any); // eslint-disable-line @typescript-eslint/no-explicit-any

        if (genError) {
            console.error("Error logging generation:", genError);
        }

        // C. Revalidate for instant display
        revalidatePath('/dashboard');

    } catch (e: unknown) {
        const error = e as Error;
        console.error("Unexpected error during awakening:", error);
        return { success: false, error: "Ritual disrupted: " + (error.message || "Unknown error") };
    }

    return {
        success: true,
        data: {
            result: logicResult,
            prompt: prompt,
            imageUrl: finalImageUrl
        },
        message: "The ritual is complete.",
    };
}

/**
 * Regenerate avatar with 10 NM cost
 */
export async function regenerateAvatar(
    userId: string | null,
    answers: DiagnosticAnswers
): Promise<AwakeningResult> {
    if (!userId) return { success: false, error: "Wallet not connected" };

    const normalizedUserId = userId.toLowerCase();
    const REGENERATION_COST = 10;

    // 1. Check NM balance
    const { data: profile, error: profileError } = await supabase
        .from('profiles' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .select('*')
        .ilike('wallet_address', normalizedUserId)
        .maybeSingle();

    if (profileError || !profile) {
        return { success: false, error: "プロフィールの取得に失敗しました" };
    }

    const currentNm = (profile as any)?.nm_balance || 0; // eslint-disable-line @typescript-eslint/no-explicit-any
    const currentRank = (profile as any)?.rank || 1; // eslint-disable-line @typescript-eslint/no-explicit-any

    if (currentNm < REGENERATION_COST) {
        return {
            success: false,
            error: `$NMが不足しています。再生成には${REGENERATION_COST} $NMが必要です（現在: ${currentNm} $NM）`
        };
    }

    // 2. Generate new avatar
    const logicResult = resolveAwakeningLogic(answers);
    const prompt = constructAvatarPrompt(logicResult, currentRank);

    let finalImageUrl: string;

    try {
        // Generate with timeout
        const generateWithTimeout = async () => {
            const timeoutPromise = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('Image generation timeout (30s)')), 30000)
            );

            const generatePromise = generateReplicateAvatar(logicResult, currentRank);

            return Promise.race([generatePromise, timeoutPromise]);
        };

        const tempImageUrl = await generateWithTimeout();

        // Download and upload to Supabase Storage
        const imageResponse = await fetch(tempImageUrl);
        if (!imageResponse.ok) {
            throw new Error('Failed to download generated image');
        }

        const imageBlob = await imageResponse.blob();
        const fileName = `${normalizedUserId}_${Date.now()}.png`;

        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('avatar-images')
            .upload(fileName, imageBlob, {
                contentType: 'image/png',
                upsert: false
            });

        if (uploadError || !uploadData) {
            throw new Error(`Failed to save avatar: ${uploadError?.message || 'Unknown error'}`);
        }

        const { data: urlData } = supabase.storage
            .from('avatar-images')
            .getPublicUrl(fileName);

        finalImageUrl = urlData.publicUrl;

        // 3. Deduct 10 NM and update profile
        const { error: updateError } = await supabase
            .from('profiles' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
            .update({
                nm_balance: currentNm - REGENERATION_COST,
                avatar_url: finalImageUrl,
                archetype: logicResult.archetype,
                avatar_metadata: {
                    animal: logicResult.animal,
                    item: logicResult.item,
                    vibe: logicResult.vibe,
                    seed: logicResult.seed
                } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
                updated_at: new Date().toISOString()
            })
            .ilike('wallet_address', normalizedUserId);

        if (updateError) {
            console.error("Profile update error:", updateError);
            return { success: false, error: "プロフィールの更新に失敗しました" };
        }

        // 4. Log generation
        await supabase.from('avatar_generations' as any).insert({ // eslint-disable-line @typescript-eslint/no-explicit-any
            user_id: normalizedUserId,
            status: 'completed',
            answers: answers as object,
            determined_archetype: logicResult.archetype,
            determined_animal: logicResult.animal,
            generated_prompt: prompt,
            image_url: finalImageUrl
        } as any); // eslint-disable-line @typescript-eslint/no-explicit-any

        revalidatePath('/dashboard');

        return {
            success: true,
            data: {
                result: logicResult,
                prompt: prompt,
                imageUrl: finalImageUrl
            },
            message: `再生成完了！${REGENERATION_COST} $NMを消費しました。`
        };

    } catch (error) {
        console.error("Regeneration error:", error);

        if (error instanceof Error) {
            if (error.message.includes('REPLICATE_API_TOKEN')) {
                return {
                    success: false,
                    error: 'サーバー設定エラー: APIトークンが設定されていません。管理者にお問い合わせください。'
                };
            }
            if (error.message.includes('timeout')) {
                return {
                    success: false,
                    error: '画像生成がタイムアウトしました。もう一度お試しください。'
                };
            }
        }

        return {
            success: false,
            error: '再生成に失敗しました: ' + (error instanceof Error ? error.message : 'Unknown error')
        };
    }
}

/**
 * Cleanup user's old avatar images from Supabase Storage
 * Keeps only the current avatar_url from profile, deletes all others
 */
export async function cleanupUserAvatars(userId: string): Promise<{ success: boolean; error?: string; deletedCount?: number }> {
    try {
        const normalizedUserId = userId.toLowerCase();

        // 1. Get current avatar_url from profile
        const { data: profile, error: profileError } = await supabase
            .from('profiles' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
            .select('avatar_url')
            .ilike('wallet_address', normalizedUserId)
            .maybeSingle();

        if (profileError || !profile) {
            console.error('[cleanupUserAvatars] Failed to fetch profile:', profileError);
            return { success: false, error: 'Profile not found' };
        }

        const currentAvatarUrl = (profile as any).avatar_url; // eslint-disable-line @typescript-eslint/no-explicit-any
        if (!currentAvatarUrl) {
            console.log('[cleanupUserAvatars] No current avatar, skipping cleanup');
            return { success: true, deletedCount: 0 };
        }

        // Extract current filename
        const currentFileName = currentAvatarUrl.split('/').pop();
        console.log(`[cleanupUserAvatars] Current avatar: ${currentFileName}`);

        // 2. List all files in storage that belong to this user
        const { data: allFiles, error: listError } = await supabase.storage
            .from('avatar-images')
            .list('', {
                search: normalizedUserId
            });

        if (listError) {
            console.error('[cleanupUserAvatars] Failed to list files:', listError);
            return { success: false, error: listError.message };
        }

        if (!allFiles || allFiles.length === 0) {
            console.log('[cleanupUserAvatars] No files found for user');
            return { success: true, deletedCount: 0 };
        }

        console.log(`[cleanupUserAvatars] Found ${allFiles.length} files for user`);

        // 3. Filter out current avatar, keep only old files
        const filesToDelete = allFiles.filter(file => file.name !== currentFileName);

        if (filesToDelete.length === 0) {
            console.log('[cleanupUserAvatars] No old files to delete');
            return { success: true, deletedCount: 0 };
        }

        console.log(`[cleanupUserAvatars] Deleting ${filesToDelete.length} old files:`, filesToDelete.map(f => f.name));

        // 4. Delete old files
        const { error: deleteError } = await supabase.storage
            .from('avatar-images')
            .remove(filesToDelete.map(f => f.name));

        if (deleteError) {
            console.error('[cleanupUserAvatars] Failed to delete files:', deleteError);
            return { success: false, error: deleteError.message };
        }

        console.log(`[cleanupUserAvatars] Successfully deleted ${filesToDelete.length} old avatar(s)`);
        return { success: true, deletedCount: filesToDelete.length };

    } catch (error) {
        console.error('[cleanupUserAvatars] Unexpected error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}
