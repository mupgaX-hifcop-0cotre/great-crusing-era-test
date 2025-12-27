
import { createTheme } from '@mui/material/styles';

// Note: Fonts are loaded in layout.tsx using next/font, but we reference their CSS variable names here.
// The fallback fonts are essential.

// Extend MUI theme types for M3 colors
declare module '@mui/material/styles' {
    interface Palette {
        tertiary: Palette['primary'];
        surface: {
            main: string;
            variant: string;
        };
        surfaceTint: {
            main: string;
        };
        outline: {
            main: string;
            variant: string;
        };
        onSurface: {
            main: string;
            variant: string;
        }
    }
    interface PaletteOptions {
        tertiary?: PaletteOptions['primary'];
        surface?: {
            main?: string;
            variant?: string;
        };
        surfaceTint?: {
            main?: string;
        };
        outline?: {
            main?: string;
            variant?: string;
        };
        onSurface?: {
            main?: string;
            variant?: string;
        }
    }
}

// "Golden Voyage" Theme
export const theme = createTheme({
    palette: {
        mode: 'dark', // Forced dark mode for atmosphere
        primary: {
            main: '#D4AF37',           // Gold (Starlight/Brass) - Used for Action Buttons
            light: '#F9A825',
            dark: '#917926',
            contrastText: '#000000',
        },
        secondary: {
            main: '#4CB5F5',           // Sky Blue (Horizon) - Used for Secondary Accents
            light: '#84D8FF',
            dark: '#1677B1',
            contrastText: '#000000',
        },
        tertiary: {
            main: '#B8860B',           // Dark Goldenrod
            light: '#E2B857',
            dark: '#845E00',
            contrastText: '#FFFFFF',
        },
        error: {
            main: '#CF6679',           // M3 Error Dark
            light: '#FF99AA',
            dark: '#9B334C',
        },
        background: {
            default: '#051E3E',        // Deep Ocean Blue
            paper: 'rgba(13, 25, 41, 0.7)', // Glassy Dark
        },
        surface: {
            main: 'rgba(13, 25, 41, 0.7)',
            variant: 'rgba(255, 255, 255, 0.05)',
        },
        onSurface: {
            main: '#E0E6ED',           // Moonlight White
            variant: '#94A3B8',        // Muted Blue-Grey
        },
        text: {
            primary: '#E0E6ED',
            secondary: '#94A3B8',
        },
        divider: 'rgba(212, 175, 55, 0.2)', // Subtle Gold Divider
    },
    typography: {
        fontFamily: 'var(--font-lato), sans-serif',
        h1: {
            fontFamily: 'var(--font-cinzel), serif',
            fontWeight: 700,
            letterSpacing: '0.05em',
            color: '#D4AF37', // Gold Headings
        },
        h2: {
            fontFamily: 'var(--font-cinzel), serif',
            fontWeight: 600,
            letterSpacing: '0.05em',
            color: '#E0E6ED',
        },
        h3: {
            fontFamily: 'var(--font-cinzel), serif',
            fontWeight: 600,
        },
        h4: {
            fontFamily: 'var(--font-cinzel), serif',
            fontWeight: 600,
        },
        h5: {
            fontFamily: 'var(--font-cinzel), serif',
            fontWeight: 600,
        },
        h6: {
            fontFamily: 'var(--font-cinzel), serif',
            fontWeight: 600,
            letterSpacing: '0.02em',
        },
        button: {
            fontFamily: 'var(--font-cinzel), serif', // Buttons use serif for impact
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
        },
        body1: {
            fontFamily: 'var(--font-lato), sans-serif',
            fontSize: '1rem',
            lineHeight: 1.6,
        },
        body2: {
            fontFamily: 'var(--font-lato), sans-serif',
            fontSize: '0.875rem',
            lineHeight: 1.6,
            color: '#94A3B8',
        },
    },
    shape: {
        borderRadius: 16,
    },
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 4,      // Slight rounding, classical feel
                    backdropFilter: 'blur(4px)',
                },
                contained: {
                    background: 'linear-gradient(45deg, #D4AF37 30%, #F9A825 90%)',
                    color: '#051E3E',
                    border: '1px solid #D4AF37',
                    boxShadow: '0 3px 5px 2px rgba(212, 175, 55, .3)',
                    '&:hover': {
                        background: 'linear-gradient(45deg, #F9A825 30%, #FFD700 90%)',
                        boxShadow: '0 3px 15px 2px rgba(212, 175, 55, .5)',
                    }
                },
                outlined: {
                    borderColor: '#D4AF37',
                    color: '#D4AF37',
                    '&:hover': {
                        borderColor: '#FFD700',
                        backgroundColor: 'rgba(212, 175, 55, 0.1)',
                    }
                }
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    background: 'rgba(5, 30, 62, 0.4)', // Glassmorphism
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(212, 175, 55, 0.15)', // Subtle gold border
                    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)',
                },
            },
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    backgroundImage: 'none', // Remove default brightness overlay in dark mode
                    backgroundColor: 'rgba(13, 25, 41, 0.8)',
                    backdropFilter: 'blur(10px)',
                },
            },
        },
        MuiDialog: {
            styleOverrides: {
                paper: {
                    background: '#051E3E', // Solid background for dialogs to prevent too much transparency
                    border: '1px solid #D4AF37',
                }
            }
        },
        MuiChip: {
            styleOverrides: {
                root: {
                    borderRadius: 4,
                    fontFamily: 'var(--font-cinzel), serif',
                    fontWeight: 600,
                },
                filled: {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                },
                colorPrimary: {
                    backgroundColor: 'rgba(212, 175, 55, 0.2)',
                    color: '#FFD700',
                    border: '1px solid rgba(212, 175, 55, 0.3)',
                }
            }
        }
    },
});

// Rank colors for custom usage
export const rankColors = {
    guest: '#64748B',      // Slate
    deckhand: '#38BDF8',   // Sky
    skipper: '#D4AF37',    // Gold
    admiral: '#FF4D4D',    // Crimson
};
