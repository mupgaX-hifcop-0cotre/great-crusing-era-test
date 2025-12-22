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
    // Deterministic randomness based on simple hash could be used if we want reproducibility,
    // but for now, standard Math.random() is sufficient for this logic demo.
    const selectedAnimal = roleData.animals[Math.floor(Math.random() * roleData.animals.length)];

    return {
        archetype: roleData.archetype,
        animal: selectedAnimal,
        vibe: styleData.vibe,
        item: itemData.item
    };
}

/**
 * Constructs the image generation prompt for the Avatar.
 */
export function constructAvatarPrompt(result: OracleMappingResult): string {
    const FIXED_PREFIX = "3D voxel art, isometric view, MagicaVoxel style, high quality rendering, clean white background, soft global illumination, cute and iconic design, single character centered.";
    const dynamicPart = `a cute ${result.animal} ${result.item}, ${result.vibe}`;

    return `${FIXED_PREFIX} ${dynamicPart}`;
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
