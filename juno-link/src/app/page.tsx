"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { useLanguage } from "@/components/providers/language-provider";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { WaveBackground } from "@/components/ui/wave-background";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Container,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
} from "@mui/material";
import AnchorIcon from "@mui/icons-material/Anchor";
import LanguageIcon from "@mui/icons-material/Language";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";

export default function Home() {
  const { loggedIn, login, isInitialized, error } = useAuth();
  const { t, toggleLanguage, language } = useLanguage();
  const router = useRouter();
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);
  const [showCopySnackbar, setShowCopySnackbar] = useState(false);

  useEffect(() => {
    if (loggedIn) {
      router.push("/dashboard");
    }

    // Detect Android in-app browsers
    const ua = typeof window !== "undefined" ? window.navigator.userAgent.toLowerCase() : "";
    const isAndroid = /android/i.test(ua);
    const isRestricted = /line|slack|discord|version\/4\.0|wv|fban|fbav|instagram/i.test(ua);

    if (isAndroid && isRestricted) {
      setIsInAppBrowser(true);
    }
  }, [loggedIn, router]);

  const handleCopyUrl = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setShowCopySnackbar(true);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
        bgcolor: "background.default",
      }}
    >
      <WaveBackground />

      <Box sx={{ position: 'absolute', top: 16, right: 16, zIndex: 20 }}>
        <Button
          onClick={toggleLanguage}
          startIcon={<LanguageIcon />}
          sx={{
            color: "primary.main",
            bgcolor: 'rgba(255,255,255,0.8)',
            '&:hover': { bgcolor: 'rgba(255,255,255,1)' },
            textTransform: 'none',
            borderRadius: 2
          }}
        >
          {language === 'ja' ? 'English' : '日本語'}
        </Button>
      </Box>

      <Container maxWidth="sm" sx={{ position: "relative", zIndex: 10 }}>
        <Card
          elevation={3}
          sx={{
            borderRadius: 4,
            overflow: "hidden",
            maxWidth: 420,
            transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              transform: 'translateY(-4px)',
            },
          }}
        >
          <CardContent sx={{ p: 6 }}>
            <Stack spacing={4} alignItems="center">
              {/* Logo Icon with M3 styling */}
              <Box
                sx={{
                  bgcolor: 'white',
                  borderRadius: '50%',
                  p: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0px 4px 8px 3px rgba(0, 0, 0, 0.15)',
                  width: 120,
                  height: 120,
                  overflow: 'hidden'
                }}
              >
                <Box
                  component="img"
                  src="/assets/logo.jpg"
                  alt="Great Cruising Era DAO"
                  sx={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                />
              </Box>

              {/* Title with M3 Typography */}
              <Typography
                variant="h3"
                component="h1"
                fontWeight={400}
                color="primary"
                sx={{
                  fontSize: '2.5rem',
                  letterSpacing: '0',
                  lineHeight: 1.7,
                }}
              >
                {t.login.title}
              </Typography>

              {/* Subtitle */}
              <Typography
                variant="h6"
                color="text.secondary"
                sx={{
                  textAlign: 'center',
                  fontWeight: 400,
                  fontSize: '1.25rem',
                }}
              >
                {t.login.subtitle}
              </Typography>

              {/* Connect Button with M3 styling */}
              <Button
                variant="contained"
                size="large"
                startIcon={isInitialized ? <AnchorIcon /> : null}
                onClick={login}
                disabled={!isInitialized}
                sx={{
                  mt: 3,
                  px: 8,
                  py: 1.5,
                  fontSize: '0.95rem',
                  fontWeight: 500,
                  borderRadius: '100px',
                  textTransform: 'none',
                  boxShadow: '0px 1px 3px 1px rgba(0, 0, 0, 0.15)',
                  '&:hover': {
                    boxShadow: '0px 2px 6px 2px rgba(0, 0, 0, 0.15)',
                    transform: 'translateY(-2px)',
                  },
                  transition: 'all 280ms cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                {isInitialized ? t.login.button : t.common.loading}
              </Button>

              {error && (
                <Typography color="error" variant="body2" sx={{ mt: 2, textAlign: 'center' }}>
                  {error}
                </Typography>
              )}

              {/* Footer Text */}
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  mt: 4,
                  textAlign: 'center',
                  opacity: 0.8,
                  fontSize: '0.875rem',
                }}
              >
                {t.login.footer}
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      </Container>

      {/* In-App Browser Warning Dialog */}
      <Dialog
        open={isInAppBrowser}
        onClose={() => setIsInAppBrowser(false)}
        PaperProps={{
          sx: { borderRadius: 4, p: 1 }
        }}
      >
        <DialogTitle sx={{ fontWeight: 500 }}>
          {t.login.inAppBrowserModal.title}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" color="text.secondary">
            {t.login.inAppBrowserModal.description}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, justifyContent: 'center', gap: 2 }}>
          <Button
            variant="contained"
            startIcon={<ContentCopyIcon />}
            onClick={handleCopyUrl}
            sx={{ borderRadius: 100, px: 4 }}
          >
            {t.login.inAppBrowserModal.copyButton}
          </Button>
          <Button
            onClick={() => setIsInAppBrowser(false)}
            sx={{ borderRadius: 100 }}
          >
            {t.common.finish || 'Close'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Copy Success Snackbar */}
      <Snackbar
        open={showCopySnackbar}
        autoHideDuration={3000}
        onClose={() => setShowCopySnackbar(false)}
        message={t.login.inAppBrowserModal.copySuccess}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        ContentProps={{
          sx: { borderRadius: 2 }
        }}
      />
    </Box>
  );
}
