"use client";

import { cn } from "@/lib/utils";

export function CompassLoader({ className }: { className?: string }) {
    return (
        <div className={cn("relative flex items-center justify-center", className)}>
            <svg
                viewBox="0 0 100 100"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="animate-[spin_4s_linear_infinite] h-full w-full text-primary"
            >
                {/* Outer Ring */}
                <circle cx="50" cy="50" r="46" stroke="currentColor" strokeWidth="2" />
                <circle cx="50" cy="50" r="42" stroke="currentColor" strokeWidth="1" strokeDasharray="4 2" />

                {/* Cardinal Points */}
                <path d="M50 5 L53 15 L50 20 L47 15 Z" fill="currentColor" /> {/* N */}
                <path d="M50 95 L53 85 L50 80 L47 85 Z" fill="currentColor" /> {/* S */}
                <path d="M95 50 L85 53 L80 50 L85 47 Z" fill="currentColor" /> {/* E */}
                <path d="M5 50 L15 53 L20 50 L15 47 Z" fill="currentColor" /> {/* W */}

                {/* Needle */}
                <g className="animate-[spin_3s_ease-in-out_infinite] origin-center">
                    <path d="M50 25 L55 50 L50 75 L45 50 Z" fill="#D2691E" /> {/* Bronze Needle */}
                    <circle cx="50" cy="50" r="2" fill="white" />
                </g>
            </svg>
        </div>
    );
}
