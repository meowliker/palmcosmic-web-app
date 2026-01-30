"use client";

import { useMemo } from "react";

interface UserAvatarProps {
  name?: string | null;
  email?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const gradients = [
  "from-rose-500 to-pink-500",
  "from-purple-500 to-indigo-500",
  "from-blue-500 to-cyan-500",
  "from-teal-500 to-emerald-500",
  "from-green-500 to-lime-500",
  "from-yellow-500 to-orange-500",
  "from-orange-500 to-red-500",
  "from-pink-500 to-purple-500",
  "from-indigo-500 to-blue-500",
  "from-cyan-500 to-teal-500",
];

const sizeClasses = {
  sm: "w-8 h-8 text-sm",
  md: "w-10 h-10 text-base",
  lg: "w-12 h-12 text-lg",
};

export function UserAvatar({ name, email, size = "md", className = "" }: UserAvatarProps) {
  // Get initial from name or email
  const initial = useMemo(() => {
    if (name && name.trim().length > 0) {
      return name.trim().charAt(0).toUpperCase();
    }
    if (email && email.trim().length > 0) {
      return email.trim().charAt(0).toUpperCase();
    }
    return "U";
  }, [name, email]);

  // Generate consistent gradient based on name/email
  const gradient = useMemo(() => {
    const str = name || email || "user";
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % gradients.length;
    return gradients[index];
  }, [name, email]);

  return (
    <div
      className={`rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center font-semibold text-white ${sizeClasses[size]} ${className}`}
    >
      {initial}
    </div>
  );
}

export function getUserDisplayName(name?: string | null, email?: string | null): string {
  if (name && name.trim().length > 0) {
    return name.trim();
  }
  if (email && email.trim().length > 0) {
    // Extract name from email (before @)
    const emailName = email.split("@")[0];
    // Capitalize first letter
    return emailName.charAt(0).toUpperCase() + emailName.slice(1);
  }
  return "You";
}
