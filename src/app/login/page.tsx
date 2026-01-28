"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, Mail, Lock, Eye, EyeOff, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  signInWithEmailAndPassword, 
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink
} from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  
  // OTP Modal states
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpEmail, setOtpEmail] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState("");

  const handleEmailPasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!email || !password) {
      setError("Please enter both email and password");
      return;
    }

    setIsLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Save user info to localStorage
      localStorage.setItem("palmcosmic_user_id", user.uid);
      localStorage.setItem("palmcosmic_email", user.email || "");
      localStorage.setItem("palmcosmic_password", password); // For delete account verification
      
      // Redirect to dashboard
      router.push("/reports");
    } catch (err: any) {
      console.error("Login error:", err);
      
      // Handle specific Firebase errors
      switch (err.code) {
        case "auth/user-not-found":
          setError("No account found with this email. Please sign up first.");
          break;
        case "auth/wrong-password":
          setError("Incorrect password. Please try again.");
          break;
        case "auth/invalid-email":
          setError("Invalid email address.");
          break;
        case "auth/too-many-requests":
          setError("Too many failed attempts. Please try again later.");
          break;
        default:
          setError("Login failed. Please check your credentials.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendOtp = async () => {
    setOtpError("");
    
    if (!otpEmail) {
      setOtpError("Please enter your email address");
      return;
    }

    setOtpLoading(true);

    try {
      const actionCodeSettings = {
        url: `${window.location.origin}/login?email=${encodeURIComponent(otpEmail)}`,
        handleCodeInApp: true,
      };

      await sendSignInLinkToEmail(auth, otpEmail, actionCodeSettings);
      
      // Save email for verification
      localStorage.setItem("palmcosmic_email_for_signin", otpEmail);
      
      setOtpSent(true);
    } catch (err: any) {
      console.error("OTP send error:", err);
      
      switch (err.code) {
        case "auth/invalid-email":
          setOtpError("Invalid email address.");
          break;
        case "auth/user-not-found":
          setOtpError("No account found with this email.");
          break;
        default:
          setOtpError("Failed to send sign-in link. Please try again.");
      }
    } finally {
      setOtpLoading(false);
    }
  };

  // Check if user arrived via email link
  useState(() => {
    if (typeof window !== "undefined" && isSignInWithEmailLink(auth, window.location.href)) {
      let emailForSignIn = localStorage.getItem("palmcosmic_email_for_signin");
      
      if (!emailForSignIn) {
        // User opened link on different device, ask for email
        emailForSignIn = window.prompt("Please provide your email for confirmation");
      }

      if (emailForSignIn) {
        signInWithEmailLink(auth, emailForSignIn, window.location.href)
          .then((result) => {
            localStorage.removeItem("palmcosmic_email_for_signin");
            localStorage.setItem("palmcosmic_user_id", result.user.uid);
            localStorage.setItem("palmcosmic_email", result.user.email || "");
            router.push("/reports");
          })
          .catch((error) => {
            console.error("Email link sign-in error:", error);
            setError("Failed to sign in with email link. Please try again.");
          });
      }
    }
  });

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <div className="w-full max-w-md h-screen bg-[#0A0E1A] overflow-hidden shadow-2xl shadow-black/50 flex flex-col relative">
        {/* Starry background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(80)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-white animate-pulse"
              style={{
                width: `${Math.random() * 2 + 1}px`,
                height: `${Math.random() * 2 + 1}px`,
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                opacity: Math.random() * 0.7 + 0.3,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${Math.random() * 2 + 2}s`,
              }}
            />
          ))}
        </div>

        {/* Content */}
        <div className="relative z-10 flex-1 flex flex-col px-6">
        {/* Back Button */}
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => router.push("/welcome")}
          className="pt-6 pb-2 text-white/70 hover:text-white transition-colors self-start"
        >
          <ArrowLeft className="w-6 h-6" />
        </motion.button>

        {/* Logo and Title */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center mb-10 pt-8"
        >
          <div className="relative mb-4">
            <div className="absolute inset-0 blur-xl bg-primary/20 rounded-full scale-150" />
            <div className="relative w-20 h-20 rounded-2xl overflow-hidden border border-primary/30">
              <Image
                src="/logo.png"
                alt="PalmCosmic"
                width={80}
                height={80}
                className="object-cover w-full h-full"
              />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white">Welcome Back</h1>
          <p className="text-white/50 text-sm mt-1">Sign in to continue your journey</p>
        </motion.div>

        {/* Login Form */}
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          onSubmit={handleEmailPasswordLogin}
          className="space-y-4"
        >
          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl"
            >
              <p className="text-red-400 text-sm text-center">{error}</p>
            </motion.div>
          )}

          {/* Email Field */}
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              className="w-full bg-[#1A1F2E] border border-white/10 rounded-xl pl-12 pr-4 py-4 text-white placeholder:text-white/40 focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          {/* Password Field */}
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full bg-[#1A1F2E] border border-white/10 rounded-xl pl-12 pr-12 py-4 text-white placeholder:text-white/40 focus:outline-none focus:border-primary transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          {/* Login Button */}
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-14 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-500 text-white font-semibold text-lg rounded-xl"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              "Login"
            )}
          </Button>
        </motion.form>

        {/* OTP Sign In Link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-6 text-center"
        >
          <button
            onClick={() => setShowOtpModal(true)}
            className="text-primary hover:text-primary/80 text-sm font-medium transition-colors"
          >
            Sign in with a code
          </button>
        </motion.div>

        {/* Sign Up Link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 text-center"
        >
          <p className="text-white/50 text-sm">
            Don&apos;t have an account?{" "}
            <button
              onClick={() => router.push("/welcome")}
              className="text-primary hover:text-primary/80 font-medium transition-colors"
            >
              Sign up
            </button>
          </p>
        </motion.div>
        </div>
      </div>

      {/* OTP Modal */}
      <AnimatePresence>
        {showOtpModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => {
              setShowOtpModal(false);
              setOtpSent(false);
              setOtpEmail("");
              setOtpError("");
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#1A1F2E] rounded-2xl w-full max-w-sm p-6 border border-white/10"
            >
              {/* Close Button */}
              <button
                onClick={() => {
                  setShowOtpModal(false);
                  setOtpSent(false);
                  setOtpEmail("");
                  setOtpError("");
                }}
                className="absolute top-4 right-4 text-white/50 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              {!otpSent ? (
                <>
                  <h2 className="text-white text-xl font-bold text-center mb-2">
                    Sign in with Email Link
                  </h2>
                  <p className="text-white/60 text-center text-sm mb-6">
                    We&apos;ll send a sign-in link to your email
                  </p>

                  {otpError && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                      <p className="text-red-400 text-sm text-center">{otpError}</p>
                    </div>
                  )}

                  <div className="relative mb-4">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                    <input
                      type="email"
                      value={otpEmail}
                      onChange={(e) => setOtpEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="w-full bg-[#0A0E1A] border border-white/20 rounded-xl pl-12 pr-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-primary"
                    />
                  </div>

                  <Button
                    onClick={handleSendOtp}
                    disabled={otpLoading}
                    className="w-full h-12 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-500 text-white font-semibold"
                  >
                    {otpLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      "Send Sign-in Link"
                    )}
                  </Button>
                </>
              ) : (
                <>
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                      <Mail className="w-8 h-8 text-primary" />
                    </div>
                    <h2 className="text-white text-xl font-bold mb-2">
                      Check Your Email
                    </h2>
                    <p className="text-white/60 text-sm mb-4">
                      We&apos;ve sent a sign-in link to
                    </p>
                    <p className="text-primary font-medium mb-6">{otpEmail}</p>
                    <p className="text-white/40 text-xs">
                      Click the link in the email to sign in. The link will expire in 1 hour.
                    </p>
                  </div>

                  <Button
                    onClick={() => {
                      setShowOtpModal(false);
                      setOtpSent(false);
                      setOtpEmail("");
                    }}
                    variant="outline"
                    className="w-full h-12 mt-6 border-white/20 text-white hover:bg-white/10"
                  >
                    Close
                  </Button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
