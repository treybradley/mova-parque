import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { useAuth } from "@/app/auth/AuthProvider";

interface SignInModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SignInModal({ open, onOpenChange }: SignInModalProps) {
  const { user, signInWithMagicLink, verifyEmailOtp, signOut, error } = useAuth();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    const { error: err } = await signInWithMagicLink(email.trim());
    setSubmitting(false);
    if (!err) {
      setSent(true);
      setCode("");
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.replace(/\D/g, "").slice(0, 6);
    if (trimmed.length !== 6) return;
    setVerifying(true);
    const { error: err } = await verifyEmailOtp(email.trim(), trimmed);
    setVerifying(false);
    if (!err) {
      setSent(false);
      setCode("");
    }
  };

  const handleClose = (next: boolean) => {
    if (!next) {
      setSent(false);
      setEmail("");
      setCode("");
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-[#2a2d2f] border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="text-white text-medium font-normal">
            {user ? "Account Details" : sent ? "Check your email" : "Sign In / Create Account"}
          </DialogTitle>
          <DialogDescription className="text-white/60 text-sm font-normal">
            {user
              ? "You're signed in. You can use High/Max quality and export without watermark."
              : sent
                ? "We sent a sign-in link and 6-digit code to your email. Click the link or enter the code below."
                : "Enter your email and we'll send you a 6-digit code to sign in. Signing in or creating an account unlocks advanced exporting features."}
          </DialogDescription>
        </DialogHeader>
        {user ? (
          <>
            <p className="text-sm text-white/80 truncate" title={user.email ?? undefined}>
              {user.email}
            </p>
            <DialogFooter>
              <button
                type="button"
                onClick={() => signOut().then(() => handleClose(false))}
                className="px-3 py-2 rounded-lg border border-white/20 text-white/80 hover:bg-white/10 text-sm"
              >
                Sign out
              </button>
              <button
                type="button"
                onClick={() => handleClose(false)}
                className="px-3 py-2 rounded-lg bg-white/20 text-white hover:bg-white/30 text-sm"
              >
                Close
              </button>
            </DialogFooter>
          </>
        ) : sent ? (
          <div className="space-y-4">
            <form onSubmit={handleVerifyCode} className="space-y-3">
              {error && (
                <p className="text-sm text-red-300">{error}</p>
              )}
              <label htmlFor="otp-code" className="block text-xs text-white/60">
                6-digit code
              </label>
              <input
                id="otp-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/20 text-center text-lg tracking-[0.5em] font-mono"
                disabled={verifying}
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={verifying || code.replace(/\D/g, "").length !== 6}
                  className="flex-1 px-3 py-2 rounded-lg bg-white/20 text-white hover:bg-white/30 disabled:opacity-50 text-sm"
                >
                  {verifying ? "Verifying…" : "Verify code"}
                </button>
                <button
                  type="button"
                  onClick={() => handleClose(false)}
                  className="px-3 py-2 rounded-lg border border-white/20 text-white/80 hover:bg-white/10 text-sm"
                >
                  Close
                </button>
              </div>
            </form>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setSent(false)}
                className="px-3 py-2 rounded-lg border border-white/20 text-white/80 hover:bg-white/10 text-sm"
              >
                Use a different email
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <p className="text-sm text-red-300">{error}</p>
            )}
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
              required
              disabled={submitting}
            />
            <DialogFooter>
              <button
                type="button"
                onClick={() => handleClose(false)}
                className="px-3 py-2 rounded-lg border border-white/20 text-white/80 hover:bg-white/10 text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-3 py-2 rounded-lg bg-white/20 text-white hover:bg-white/30 disabled:opacity-50 text-sm"
              >
                {submitting ? "Sending…" : "Send Code"}
              </button>
            </DialogFooter>
          </form>
        )}
        <p className="mt-4 pt-4 border-t border-white/10 text-xs text-white/40 text-center">
          By signing in you agree to our{" "}
          <a
            href="https://app.termly.io/policy-viewer/policy.html?policyUUID=fdbd3538-3be4-42d1-8c89-ba7676b7d238"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/70 underline hover:text-white/90"
          >
            Terms of Service
          </a>{" "}
          and{" "}
          <a
            href="https://app.termly.io/policy-viewer/policy.html?policyUUID=4d4ccf3e-a802-44df-aa73-51822d5d7f9d"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/70 underline hover:text-white/90"
          >
            Privacy Policy
          </a>
          .
        </p>
      </DialogContent>
    </Dialog>
  );
}
