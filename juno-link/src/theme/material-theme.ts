import { createTheme } from '@mui/material/styles';

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
    }
}

// Material Design 3 Theme with Japanese Optimization
export const theme = createTheme({
    palette: {
        mode: 'light',
        primary: {
            main: '#006493',           // Primary-40
            light: '#4C91BF',
            dark: '#004A74',
            contrastText: '#FFFFFF',
        },
        secondary: {
            main: '#4C5F6D',           // Secondary-40
            light: '#748895',
            dark: '#334450',
            contrastText: '#FFFFFF',
        },
        tertiary: {
            main: '#5D5B7D',           // Tertiary-40
            light: '#8682A5',
            dark: '#454360',
            contrastText: '#FFFFFF',
        },
        error: {
            main: '#BA1A1A',           // Error-40
            light: '#F2B8B5',
            dark: '#690005',
            contrastText: '#FFFFFF',
        },
        warning: {
            main: '#8B5000',           // Warning-40
            light: '#FFB77C',
        },
        info: {
            main: '#006493',
        },
        success: {
            main: '#006E26',           // Success-40
            light: '#6FDB8D',
        },
        background: {
            default: '#FDFBFF',        // Neutral-99
            paper: '#FDFBFF',
        },
        surface: {
            main: '#FDFBFF',
            variant: '#DDE3EA',        // Neutral-Variant-90
        },
        surfaceTint: {
            main: '#006493',           // Primary-40 for tinting
        },
        outline: {
            main: '#6F777F',           // Neutral-Variant-50
            variant: '#BFC8CE',        // Neutral-Variant-80
        },
        text: {
            primary: '#191C1E',        // Neutral-10
            secondary: '#42474B',      // Neutral-Variant-30
            disabled: '#A9B0B7',
        },
    },
    typography: {
        fontFamily: [
            'Noto Sans JP',       // Japanese primary
            'Roboto',             // English fallback
            'sans-serif',
        ].join(','),
        h1: {
            fontWeight: 300,
            fontSize: '6rem',
            lineHeight: 1.7,      // Japanese optimization
            letterSpacing: '-0.01562em',
        },
        h2: {
            fontWeight: 300,
            fontSize: '3.75rem',
            lineHeight: 1.7,
            letterSpacing: '-0.00833em',
        },
        h3: {
            fontWeight: 400,
            fontSize: '3rem',
            lineHeight: 1.7,
            letterSpacing: '0em',
        },
        h4: {
            fontWeight: 400,
            fontSize: '2.125rem',
            lineHeight: 1.7,
            letterSpacing: '0.00735em',
        },
        h5: {
            fontWeight: 400,
            fontSize: '1.5rem',
            lineHeight: 1.7,
            letterSpacing: '0em',
        },
        h6: {
            fontWeight: 500,
            fontSize: '1.25rem',
            lineHeight: 1.7,
            letterSpacing: '0.0075em',
        },
        body1: {
            fontWeight: 400,
            fontSize: '1rem',
            lineHeight: 1.7,      // Japanese optimization
            letterSpacing: '0.05em',
        },
        body2: {
            fontWeight: 400,
            fontSize: '0.875rem',
            lineHeight: 1.7,
            letterSpacing: '0.05em',
        },
        button: {
            fontWeight: 500,
            fontSize: '0.875rem',
            lineHeight: 1.75,
            letterSpacing: '0.02857em',
            textTransform: 'none',  // Disable uppercase for Japanese
        },
    },
    shape: {
        borderRadius: 12,         // M3 uses 12dp for medium components
    },
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 20,     // M3 full-rounded buttons
                    padding: '10px 24px',
                    fontWeight: 500,
                    textTransform: 'none',
                    boxShadow: 'none',
                },
                contained: {
                    '&:hover': {
                        boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.3), 0px 1px 3px 1px rgba(0, 0, 0, 0.15)',
                    },
                },
                outlined: {
                    borderWidth: '1px',
                    '&:hover': {
                        borderWidth: '1px',
                        backgroundColor: 'rgba(0, 100, 147, 0.08)', // State layer
                    },
                },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    borderRadius: 12,      // M3 medium shape
                    boxShadow: '0px 1px 3px 1px rgba(0, 0, 0, 0.15), 0px 1px 2px rgba(0, 0, 0, 0.3)', // Elevation 1
                    transition: 'box-shadow 280ms cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                        boxShadow: '0px 2px 6px 2px rgba(0, 0, 0, 0.15), 0px 1px 2px rgba(0, 0, 0, 0.3)', // Elevation 2
                    },
                },
            },
        },
        MuiChip: {
            styleOverrides: {
                root: {
                    fontWeight: 500,
                    letterSpacing: ' 0.1px',
                    borderRadius: 8,       // M3 small shape
                },
                filled: {
                    backgroundColor: '#DDE3EA', // Surface-variant
                },
            },
        },
        MuiTextField: {
            styleOverrides: {
                root: {
                    '& .MuiOutlinedInput-root': {
                        borderRadius: 4,    // M3 extra-small shape for text fields
                    },
                },
            },
        },
        MuiAppBar: {
            styleOverrides: {
                root: {
                    boxShadow: 'none',
                    borderBottom: '1px solid #DDE3EA',
                },
            },
        },
        MuiPaper: {
            styleOverrides: {
                rounded: {
                    borderRadius: 12,
                },
                elevation1: {
                    boxShadow: '0px 1px 3px 1px rgba(0, 0, 0, 0.15), 0px 1px 2px rgba(0, 0, 0, 0.3)',
                },
                elevation2: {
                    boxShadow: '0px 2px 6px 2px rgba(0, 0, 0, 0.15), 0px 1px 2px rgba(0, 0, 0, 0.3)',
                },
                elevation3: {
                    boxShadow: '0px 4px 8px 3px rgba(0, 0, 0, 0.15), 0px 1px 3px rgba(0, 0, 0, 0.3)',
                },
            },
        },
    },
});

// Rank-specific colors (M3 compliant)
export const rankColors = {
    guest: '#6F777F',      // Neutral-Variant-50
    deckhand: '#006493',   // Primary-40 (Blue)
    skipper: '#8B5000',    // Warning-40 (Amber/Gold)
    admiral: '#FFD700',    // Gold
};

