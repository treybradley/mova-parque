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
  const { user, signInWithMagicLink, signOut, error } = useAuth();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    const { error: err } = await signInWithMagicLink(email.trim());
    setSubmitting(false);
    if (!err) {
      setSent(true);
    }
  };

  const handleClose = (next: boolean) => {
    if (!next) {
      setSent(false);
      setEmail("");
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-[#2a2d2f] border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="text-white text-medium font-normal">
            {user ? "Signed in" : sent ? "Check your email" : "Login / Create Account"}
          </DialogTitle>
          <DialogDescription className="text-white/60 text-sm font-normal">
            {user
              ? "You're signed in. You can use High/Max quality and export without watermark."
              : sent
                ? "We sent a sign-in link to your email. Click the link to sign in, then return here."
                : "Enter your email and we'll send you a link to sign in. Creating an account unlocks advanced exporting features."}
          </DialogDescription>
        </DialogHeader>
        {user ? (
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
        ) : sent ? (
          <DialogFooter>
            <button
              type="button"
              onClick={() => setSent(false)}
              className="px-3 py-2 rounded-lg border border-white/20 text-white/80 hover:bg-white/10 text-sm"
            >
              Use a different email
            </button>
            <button
              type="button"
              onClick={() => handleClose(false)}
              className="px-3 py-2 rounded-lg bg-white/20 text-white hover:bg-white/30 text-sm"
            >
              Close
            </button>
          </DialogFooter>
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
                {submitting ? "Sending…" : "Send link"}
              </button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
