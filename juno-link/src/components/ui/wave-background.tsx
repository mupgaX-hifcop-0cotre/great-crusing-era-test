"use client";

export function WaveBackground() {
    return (
        <div className="fixed inset-0 -z-10 overflow-hidden bg-[#Fdfbf7] pointer-events-none">
            {/* Gradient Overlay for Ocean Depth - Cleaner blend */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#fdfbf7] via-[#e6e2d3] to-[#d2b48c]/20 z-[0]" />

            {/* Waves Container */}
            <div className="absolute bottom-0 left-0 w-full h-[50vh]">

                {/* Wave 1 (Back) - Slow, Deep, Smooth */}
                <div className="absolute bottom-0 flex w-[200%] h-full opacity-40 animate-wave-slow">
                    <WaveSVG
                        color1="#000080"
                        color2="#000040"
                        path="M0,192 C320,320 640,64 960,192 C1280,320 1440,256 1440,256 V320 H0 Z"
                        index={0}
                    />
                    <WaveSVG
                        color1="#000080"
                        color2="#000040"
                        path="M0,192 C320,320 640,64 960,192 C1280,320 1440,256 1440,256 V320 H0 Z"
                        index={1}
                    />
                </div>

                {/* Wave 2 (Front) - Faster, Lighter, Elegant */}
                <div className="absolute bottom-[-10px] flex w-[200%] h-full opacity-30 animate-wave-medium delay-1000">
                    <WaveSVG
                        color1="#4169E1"
                        color2="#000080"
                        path="M0,256 C360,128 720,356 1080,224 C1260,160 1440,256 1440,256 V320 H0 Z"
                        index={2}
                    />
                    <WaveSVG
                        color1="#4169E1"
                        color2="#000080"
                        path="M0,256 C360,128 720,356 1080,224 C1260,160 1440,256 1440,256 V320 H0 Z"
                        index={3}
                    />
                </div>
            </div>
        </div>
    );
}

function WaveSVG({ color1, color2, path, index }: { color1: string, color2: string, path: string, index: number }) {
    // Use deterministic ID based on color and index to avoid hydration mismatch
    const id = `grad-${color1.replace('#', '')}-${color2.replace('#', '')}-${index}`;

    return (
        <svg viewBox="0 0 1440 320" className="w-1/2 h-full" preserveAspectRatio="none">
            <defs>
                <linearGradient id={id} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style={{ stopColor: color1, stopOpacity: 0.7 }} />
                    <stop offset="100%" style={{ stopColor: color2, stopOpacity: 0.9 }} />
                </linearGradient>
            </defs>
            <path fill={`url(#${id})`} d={path}></path>
        </svg>
    );
}
