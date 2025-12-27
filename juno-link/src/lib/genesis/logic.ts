/* eslint-disable @typescript-eslint/no-unused-vars */
export type AnswerKey = 'A' | 'B' | 'C' | 'D';

export interface DiagnosticAnswers {
    q1_role: AnswerKey;
    q2_style: AnswerKey;
    q3_item: AnswerKey;
}

export interface OracleMappingResult {
    archetype: string;
    animal: string;
    vibe: string;
    item: string;
    seed: string; // Deterministic seed for Nouns-style generation
}

export const ORACLE_MAPPING = {
    q1: {
        'A': { archetype: 'Wisdom', animals: ['Sea Turtle', 'Whale', 'Hermit Crab'] },
        'B': { archetype: 'Vanguard', animals: ['Shark', 'Orca', 'Polar Bear'] },
        'C': { archetype: 'Charisma', animals: ['Dolphin', 'Clownfish', 'Sea Otter'] },
        'D': { archetype: 'Scout', animals: ['Seagull', 'Pelican', 'Flying Fish'] }
    },
    q2: {
        'A': { vibe: 'vibrant colors, adventurous atmosphere' },
        'B': { vibe: 'warm pastel colors, cozy atmosphere' },
        'C': { vibe: 'mystic blue and purple neon, magical atmosphere' },
        'D': { vibe: 'cool blue and silver, technological atmosphere' }
    },
    q3: {
        'A': { item: 'holding a vintage golden compass' },
        'B': { item: 'wearing a red voyager scarf' },
        'C': { item: 'holding a wooden lute' },
        'D': { item: 'holding a rusty wrench or sword' }
    }
} as const;

/**
 * Resolves the Oracle's logic based on user answers.
 */
export function resolveAwakeningLogic(answers: DiagnosticAnswers): OracleMappingResult {
    const roleData = ORACLE_MAPPING.q1[answers.q1_role];
    const styleData = ORACLE_MAPPING.q2[answers.q2_style];
    const itemData = ORACLE_MAPPING.q3[answers.q3_item];

    // Select random animal from the archetype list
    // In Nouns-style, we want this to be deterministic based on a seed or index if possible, 
    // but for the ritual, we can pick and then freeze it in the seed.
    const animalIndex = Math.floor(Math.random() * roleData.animals.length);
    const selectedAnimal = roleData.animals[animalIndex];

    // Generate a unique seed string for this generation
    const seed = `${answers.q1_role}${answers.q2_style}${answers.q3_item}-${animalIndex}-${Date.now()}`;

    return {
        archetype: roleData.archetype,
        animal: selectedAnimal,
        vibe: styleData.vibe,
        item: itemData.item,
        seed
    };
}

/**
 * Constructs the image generation prompt for the Avatar.
 * Neo-Vintage Logbook aesthetic with Leonardo da Vinci technical sketch style.
 * Maintains anthropomorphic animal avatars from Oracle mapping.
 * Ship appears at Rank 2+ (Captain and Admiral).
 */
export function constructAvatarPrompt(result: OracleMappingResult, rank: number = 1): string {
    // Base Positive Prompt - Focus on CHARACTER FIRST, then style
    const BASE_POSITIVE = "(masterpiece, best quality:1.3), (detailed character portrait:1.4), sketch art, pen and ink drawing, beige and sepia tones, warm vintage colors, parchment texture background, Leonardo da Vinci drawing style, detailed linework";

    // Base Negative Prompt (Keep geometric patterns from dominating)
    const BASE_NEGATIVE = "(low quality, worst quality:1.4), (only geometric patterns:1.5), (no character:1.5), abstract art, photorealistic, 3d render, cgi, bright neon colors, modern digital art, anime, cartoon, watermark, text, blurry, bad anatomy, cropped, oversaturated, compass rose only, map only";

    // CHARACTER FIRST - Anthropomorphic animal (from Oracle mapping)
    const characterMain = `(anthropomorphic ${result.animal}:1.4), (full character:1.3), naval explorer character, cute expressive face, big round eyes, detailed fur texture, standing portrait, upper body and face clearly visible, character as main focus`;

    // Item/Accessory integration
    const accessory = `holding ${result.item}, maritime accessories`;

    // Rank-based character clothing and minor background
    let rankEnhancement = "";
    let backgroundHints = "";

    if (rank === 1) {
        // Rank 1: Sailor - Simple, calm
        rankEnhancement = "simple sailor outfit with rope details, weathered cloth, humble appearance";
        backgroundHints = "soft light, gentle atmosphere, (subtle dry flower sketches in corner:0.6), peaceful mood";
    } else if (rank === 2) {
        // Rank 2: Captain - With ship hint
        rankEnhancement = "captain's naval uniform, brass buttons, small tricorn hat, confident pose";
        backgroundHints = "(small sailing ship sketch in background:0.8), ocean waves hint, (faint nautical lines:0.5), dynamic composition";
    } else if (rank === 3) {
        // Rank 3: Admiral - Majestic
        rankEnhancement = "ornate admiral coat, gold trim details, elegant cape, astrolabe accessory, commanding presence";
        backgroundHints = "(grand ship silhouette behind:0.8), (star pattern hints:0.6), (subtle navigation lines:0.5), majestic atmosphere";
    }

    // Vibe from Oracle result
    const vibeElement = result.vibe;

    // Build prompt: CHARACTER FIRST, then details, then subtle background
    const fullPositivePrompt = `${BASE_POSITIVE}, ${characterMain}, ${rankEnhancement}, ${accessory}, ${vibeElement}, ${backgroundHints}`;

    // Return with negative prompt
    return fullPositivePrompt + ` ### NEGATIVE: ${BASE_NEGATIVE}`;
}


/**
 * Generates a high-quality avatar using Stable Diffusion via Replicate.
 * Uses the constructed prompt to create 3D voxel art style characters.
 * Cost: $0.0038 per image. GitHub signup, super easy setup.
 */
export async function generateReplicateAvatar(
    result: OracleMappingResult,
    rank: number = 1
): Promise<string> {
    const fullPrompt = constructAvatarPrompt(result, rank);

    // Extract positive and negative prompts
    const [positivePrompt, negativePart] = fullPrompt.split(' ### NEGATIVE: ');
    const negativePrompt = negativePart || "(low quality, worst quality:1.4), (photorealistic:1.3), 3d render, cgi, bright colors, neon, modern digital art, anime style, cartoon, watermark, text, signature, blurry, distorted, bad anatomy, cropped, oversaturated";

    console.log('[Replicate Avatar] Positive prompt:', positivePrompt.substring(0, 100) + '...');
    console.log('[Replicate Avatar] Negative prompt:', negativePrompt.substring(0, 100) + '...');

    if (!process.env.REPLICATE_API_TOKEN) {
        throw new Error('REPLICATE_API_TOKEN is not configured. Get your token from https://replicate.com/account/api-tokens');
    }

    try {
        // 1. Start prediction
        const startResponse = await fetch('https://api.replicate.com/v1/predictions', {
            method: 'POST',
            headers: {
                'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                version: '39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b', // SDXL
                input: {
                    prompt: positivePrompt,
                    negative_prompt: negativePrompt,
                    width: 1024,
                    height: 1024,
                    num_inference_steps: 40,  // Higher for sketch detail
                    guidance_scale: 7.5,
                    scheduler: "DPMSolverMultistep"  // Better for artwork
                }
            })
        });

        if (!startResponse.ok) {
            const errorText = await startResponse.text();
            console.error('[Replicate Avatar] API error:', startResponse.status, errorText);
            throw new Error(`Replicate API returned ${startResponse.status}: ${errorText.substring(0, 200)}`);
        }

        let prediction = await startResponse.json();
        console.log('[Replicate Avatar] Prediction started:', prediction.id);

        // 2. Poll for completion (max 30 seconds)
        const maxAttempts = 30;
        let attempts = 0;

        while (
            prediction.status !== 'succeeded' &&
            prediction.status !== 'failed' &&
            attempts < maxAttempts
        ) {
            await new Promise(resolve => setTimeout(resolve, 1000));

            const statusResponse = await fetch(
                `https://api.replicate.com/v1/predictions/${prediction.id}`,
                {
                    headers: {
                        'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`
                    }
                }
            );

            if (!statusResponse.ok) {
                throw new Error(`Status check failed: ${statusResponse.status}`);
            }

            prediction = await statusResponse.json();
            attempts++;

            console.log(`[Replicate Avatar] Status: ${prediction.status} (attempt ${attempts})`);
        }

        // 3. Check result
        if (prediction.status === 'failed') {
            throw new Error(`Image generation failed: ${prediction.error || 'Unknown error'}`);
        }

        if (attempts >= maxAttempts) {
            throw new Error('Image generation timeout (30s)');
        }

        if (!prediction.output || prediction.output.length === 0) {
            throw new Error('No image generated');
        }

        const imageUrl = prediction.output[0];
        console.log('[Replicate Avatar] Image generated successfully:', imageUrl);

        return imageUrl;

    } catch (error) {
        console.error('[Replicate Avatar] Generation failed:', error);
        throw new Error(`Avatar generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}



/**
 * Main orchestrator for the Awakening Process.
 * Ideally, this runs on a secure backend (Edge Function).
 */
export async function processAwakening(userId: string, answers: DiagnosticAnswers) {
    // 1. Logic Resolution
    const result = resolveAwakeningLogic(answers);

    console.log(`[The Awakening] User ${userId} resolved to:`, result);

    // 2. Construct Prompt
    const prompt = constructAvatarPrompt(result);
    console.log(`[The Awakening] Generated Prompt:`, prompt);

    // 3. (Mock) Call Image Generator
    // const imageUrl = await aiService.generate(prompt);

    // 4. (Mock) Save to Database
    // await db.insert('avatar_generations', ...);
    // await db.update('profiles', ...);

    return {
        success: true,
        result,
        prompt
    };
}
