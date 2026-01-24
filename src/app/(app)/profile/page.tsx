"use client";

import { motion } from "framer-motion";
import { fadeUp } from "@/lib/motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Mail, Calendar, MapPin, Coins } from "lucide-react";

export default function ProfilePage() {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={fadeUp}
      className="p-6 max-w-lg mx-auto"
    >
      <h1 className="font-cormorant text-3xl font-bold mb-6">Your Profile</h1>

      <Card className="p-6 mb-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
            <User className="w-8 h-8 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-lg">User Name</p>
            <p className="text-muted-foreground text-sm">Premium Member</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Mail className="w-5 h-5 text-muted-foreground" />
            <span>user@example.com</span>
          </div>
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-muted-foreground" />
            <span>January 15, 1990</span>
          </div>
          <div className="flex items-center gap-3">
            <MapPin className="w-5 h-5 text-muted-foreground" />
            <span>New York, USA</span>
          </div>
        </div>
      </Card>

      <Card className="p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Coins className="w-6 h-6 text-accent" />
            <div>
              <p className="font-semibold">Cosmic Coins</p>
              <p className="text-muted-foreground text-sm">Your balance</p>
            </div>
          </div>
          <p className="text-2xl font-bold text-accent">150</p>
        </div>
      </Card>

      <Button variant="secondary" className="w-full">
        Edit Profile
      </Button>
    </motion.div>
  );
}
