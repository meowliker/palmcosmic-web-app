"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";

interface PalmLine {
  color: string;
  points: { x: number; y: number }[];
}

interface PalmAnalysisProps {
  imageData: string;
  onComplete: () => void;
}

export function PalmAnalysis({ imageData, onComplete }: PalmAnalysisProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("Initializing analysis...");
  const [fingertips, setFingertips] = useState<{ x: number; y: number }[]>([]);
  const [palmLines, setPalmLines] = useState<PalmLine[]>([]);
  const [scanLineY, setScanLineY] = useState(0);
  const [showLines, setShowLines] = useState(false);

  const detectPalmFeatures = useCallback(() => {
    if (!imageData) return;

    // Simulate progressive analysis with scanning animation
    const scanDuration = 5000;
    const startTime = Date.now();
    
    const animateScan = () => {
      const elapsed = Date.now() - startTime;
      const scanProgress = Math.min(elapsed / scanDuration, 1);
      
      // Update scan line position
      setScanLineY(scanProgress * 100);
      
      // Update progress
      const currentProgress = Math.min(Math.floor(scanProgress * 100), 100);
      setProgress(currentProgress);

      // Update status text based on progress
      if (currentProgress < 20) {
        setStatusText("Detecting hand position...");
      } else if (currentProgress < 40) {
        setStatusText("Locating fingertips...");
        // Add fingertips at 30%
        if (currentProgress >= 30 && fingertips.length === 0) {
          setFingertips([
            { x: 25, y: 15 },  // Pinky
            { x: 38, y: 8 },   // Ring
            { x: 50, y: 5 },   // Middle
            { x: 62, y: 10 },  // Index
            { x: 80, y: 40 },  // Thumb
          ]);
        }
      } else if (currentProgress < 60) {
        setStatusText("Identifying lines, mounts and plains...");
      } else if (currentProgress < 80) {
        setStatusText("Analyzing palm lines...");
        if (!showLines) {
          setShowLines(true);
          // Add palm lines
          if (palmLines.length === 0) {
            setPalmLines([
              {
                color: "#F27067",
                points: [
                  { x: 75, y: 38 },
                  { x: 55, y: 35 },
                  { x: 35, y: 42 },
                  { x: 22, y: 52 },
                ],
              },
              {
                color: "#4ECDC4",
                points: [
                  { x: 38, y: 38 },
                  { x: 32, y: 55 },
                  { x: 30, y: 75 },
                  { x: 35, y: 90 },
                ],
              },
              {
                color: "#F5C542",
                points: [
                  { x: 25, y: 55 },
                  { x: 40, y: 50 },
                  { x: 60, y: 48 },
                  { x: 75, y: 55 },
                ],
              },
              {
                color: "#E88BE8",
                points: [
                  { x: 50, y: 90 },
                  { x: 50, y: 70 },
                  { x: 48, y: 55 },
                  { x: 46, y: 42 },
                ],
              },
            ]);
          }
        }
      } else {
        setStatusText("Generating your palm reading result...");
      }

      if (scanProgress < 1) {
        requestAnimationFrame(animateScan);
      } else {
        // Complete after a short delay
        setTimeout(() => {
          onComplete();
        }, 1500);
      }
    };

    // Start animation
    setTimeout(animateScan, 500);
  }, [imageData, onComplete, fingertips.length, showLines, palmLines.length]);

  useEffect(() => {
    detectPalmFeatures();
  }, [detectPalmFeatures]);

  const generatePathD = (points: { x: number; y: number }[]) => {
    if (points.length < 2) return "";
    
    let d = `M${points[0].x} ${points[0].y}`;
    
    if (points.length === 2) {
      d += ` L${points[1].x} ${points[1].y}`;
    } else {
      // Create smooth curve through points
      for (let i = 1; i < points.length - 1; i++) {
        const xc = (points[i].x + points[i + 1].x) / 2;
        const yc = (points[i].y + points[i + 1].y) / 2;
        d += ` Q${points[i].x} ${points[i].y} ${xc} ${yc}`;
      }
      // Last point
      const last = points[points.length - 1];
      d += ` L${last.x} ${last.y}`;
    }
    
    return d;
  };

  return (
    <div className="flex flex-col items-center w-full">
      <div className="relative w-full max-w-sm aspect-[3/4] bg-black/50 rounded-lg overflow-hidden">
        {/* Captured palm image */}
        <img
          src={imageData}
          alt="Captured palm"
          className="w-full h-full object-cover"
        />

        {/* SVG overlay for lines and fingertips */}
        <svg
          viewBox="0 0 100 133"
          className="absolute inset-0 w-full h-full pointer-events-none"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="xMidYMid slice"
        >
          {/* Scanning line */}
          {progress < 100 && (
            <motion.line
              x1="0"
              y1={scanLineY}
              x2="100"
              y2={scanLineY}
              stroke="rgba(239, 107, 107, 0.8)"
              strokeWidth="0.5"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            />
          )}

          {/* Fingertip dots */}
          {fingertips.map((tip, index) => (
            <motion.circle
              key={index}
              cx={tip.x}
              cy={tip.y}
              r="1.5"
              fill="white"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: index * 0.1, duration: 0.3 }}
            />
          ))}

          {/* Palm lines */}
          {showLines && palmLines.map((line, index) => (
            <motion.path
              key={index}
              d={generatePathD(line.points)}
              stroke={line.color}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ 
                delay: index * 0.4, 
                duration: 1.2, 
                ease: "easeInOut" 
              }}
            />
          ))}
        </svg>

        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Progress section */}
      <div className="w-full max-w-sm mt-6 px-4">
        <motion.p
          className="text-2xl font-bold text-center mb-3"
          key={progress}
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
        >
          {progress}%
        </motion.p>

        {/* Progress bar */}
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-primary/70"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        <p className="text-muted-foreground text-center text-sm mt-3">
          {statusText}
        </p>
      </div>
    </div>
  );
}
