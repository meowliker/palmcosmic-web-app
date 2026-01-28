"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Upload, Download, Loader2, Hand, ArrowLeft, Camera, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { detectPalmFeatures } from "@/lib/palm-detection";
import { useRouter } from "next/navigation";

interface Fingertip {
  x: number;
  y: number;
}

export default function TestPalmPage() {
  const router = useRouter();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [fingertips, setFingertips] = useState<Fingertip[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const animationStartRef = useRef<number | null>(null);
  const latestImageRef = useRef<HTMLImageElement | null>(null);
  const latestTipsRef = useRef<Fingertip[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement>(null);

  // Start camera
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      setCameraStream(stream);
      setShowCamera(true);
      
      // Wait for next tick to ensure video element is rendered
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(err => {
            console.error("Video play error:", err);
          });
        }
      }, 100);
    } catch (err) {
      console.error("Camera error:", err);
      setError("Could not access camera. Please check permissions.");
    }
  };

  // Stop camera
  const stopCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
  }, [cameraStream]);

  // Capture photo from camera
  const capturePhoto = () => {
    if (!videoRef.current || !captureCanvasRef.current) return;

    const video = videoRef.current;
    const canvas = captureCanvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      const imageData = canvas.toDataURL("image/jpeg", 0.9);
      setSelectedImage(imageData);
      setFingertips([]);
      setError(null);
      stopCamera();
    }
  };

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [cameraStream]);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setSelectedImage(event.target?.result as string);
        setFingertips([]);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const detectPalm = async () => {
    if (!selectedImage) return;

    setIsDetecting(true);
    setError(null);

    try {
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.src = selectedImage;
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      const result = await detectPalmFeatures(img);

      if (result.fingertips.length === 0) {
        setError("No hand detected in the image. Please upload a clear palm image with good lighting.");
        setIsDetecting(false);
        return;
      }

      const tips = result.fingertips.map((t) => ({ x: t.x, y: t.y }));
      setFingertips(tips);
      drawPalmFeatures(img, tips);
    } catch (err) {
      console.error("Detection error:", err);
      setError("Failed to detect palm features. Please try another image with a clearer palm view.");
    } finally {
      setIsDetecting(false);
    }
  };

  const drawPalmFeatures = (
    img: HTMLImageElement,
    tips: Fingertip[]
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = img.width;
    canvas.height = img.height;

    latestImageRef.current = img;
    latestTipsRef.current = tips;

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    animationStartRef.current = null;

    const render = (now: number) => {
      if (!latestImageRef.current) return;
      if (animationStartRef.current === null) animationStartRef.current = now;
      const t = (now - animationStartRef.current) / 1000;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(latestImageRef.current, 0, 0);

    // Draw fingertips
    tips.forEach((tip) => {
      const baseRadius = Math.max(8, canvas.width / 60);
      const pulse = 0.5 + 0.5 * Math.sin(t * 2.2 + tip.x * 10);
      const radius = baseRadius * (0.85 + 0.35 * pulse);

      // Outer glow
      ctx.shadowColor = "rgba(255, 255, 255, 0.9)";
      ctx.shadowBlur = 18;
      ctx.fillStyle = `rgba(255, 255, 255, ${0.35 + 0.45 * pulse})`;
      ctx.beginPath();
      ctx.arc(tip.x * canvas.width, tip.y * canvas.height, radius, 0, 2 * Math.PI);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Inner circle
      ctx.fillStyle = "white";
      ctx.beginPath();
      ctx.arc(tip.x * canvas.width, tip.y * canvas.height, radius * 0.45, 0, 2 * Math.PI);
      ctx.fill();

      // Draw fingertip label
      // (intentionally omitted)
    });

      animationFrameRef.current = requestAnimationFrame(render);
    };

    animationFrameRef.current = requestAnimationFrame(render);
  };

  const generatePDF = async () => {
    setIsGeneratingPDF(true);

    try {
      const response = await fetch("/api/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          palmReading: {
            love: {
              score: 85,
              description:
                "Your heart line shows deep emotional capacity and strong romantic connections. You value meaningful relationships and have the ability to form lasting bonds. Your palm indicates a passionate nature balanced with emotional intelligence. The curve and depth of your heart line suggests you express love openly and seek deep emotional fulfillment in relationships.",
            },
            health: {
              score: 78,
              description:
                "Your life line suggests good vitality and resilience. You have strong physical constitution with the ability to recover quickly from setbacks. Focus on maintaining balance between activity and rest for optimal wellbeing. The clarity of your life line indicates a steady energy flow and good overall health prospects throughout your life journey.",
            },
            career: {
              score: 92,
              description:
                "Your fate line indicates strong career potential and professional success. You possess natural leadership qualities and the determination to achieve your goals. Your palm shows excellent prospects for advancement and recognition. The depth and direction of your fate line suggests you will find fulfillment in work that allows you to make meaningful contributions.",
            },
            wisdom: {
              score: 88,
              description:
                "Your head line reveals sharp intellect and analytical abilities. You have a balanced approach to problem-solving, combining logic with intuition. Your palm indicates strong decision-making capabilities and mental clarity. The length and formation of your head line shows you think deeply and consider multiple perspectives before reaching conclusions.",
            },
          },
          userInfo: {
            name: "Test User",
            birthDate: "1990-01-15",
            readingDate: new Date().toISOString(),
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate PDF");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `palm-reading-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("PDF generation error:", err);
      setError("Failed to generate PDF. Please try again.");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0E1A] py-6 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div>
            <h1 className="text-white text-2xl sm:text-3xl font-bold">
              Palm Detection Test
            </h1>
            <p className="text-white/60 text-sm">
              Upload a palm image to test computer vision detection
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Upload Section */}
          <div className="space-y-4">
            <div className="bg-[#1A1F2E] rounded-2xl p-4 sm:p-6 border border-white/10">
              <h2 className="text-white text-lg sm:text-xl font-semibold mb-4">
                Upload Palm Image
              </h2>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />

              <div className="grid grid-cols-2 gap-3 mb-4">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="h-32 sm:h-40 border-2 border-dashed border-white/20 rounded-xl hover:border-primary transition-colors flex flex-col items-center justify-center gap-2"
                >
                  <Upload className="w-8 h-8 sm:w-10 sm:h-10 text-white/40" />
                  <p className="text-white/60 text-xs sm:text-sm">Upload Image</p>
                </button>

                <button
                  onClick={startCamera}
                  className="h-32 sm:h-40 border-2 border-dashed border-white/20 rounded-xl hover:border-primary transition-colors flex flex-col items-center justify-center gap-2"
                >
                  <Camera className="w-8 h-8 sm:w-10 sm:h-10 text-white/40" />
                  <p className="text-white/60 text-xs sm:text-sm">Use Camera</p>
                </button>
              </div>

              {/* Hidden canvas for capturing */}
              <canvas ref={captureCanvasRef} className="hidden" />

              {selectedImage && (
                <div className="mt-4">
                  <img
                    src={selectedImage}
                    alt="Palm"
                    className="w-full rounded-xl max-h-64 object-contain bg-black/20"
                  />
                </div>
              )}

              <div className="mt-4 space-y-3">
                <Button
                  onClick={detectPalm}
                  disabled={!selectedImage || isDetecting}
                  className="w-full bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90"
                >
                  {isDetecting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Detecting Palm Features...
                    </>
                  ) : (
                    <>
                      <Hand className="w-4 h-4 mr-2" />
                      Detect Palm Features
                    </>
                  )}
                </Button>

                <Button
                  onClick={generatePDF}
                  disabled={isGeneratingPDF}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
                >
                  {isGeneratingPDF ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating PDF...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Generate Sample PDF Report
                    </>
                  )}
                </Button>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl"
                >
                  <p className="text-red-400 text-sm">{error}</p>
                </motion.div>
              )}
            </div>

            {/* Detection Results */}
            {fingertips.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#1A1F2E] rounded-2xl p-4 sm:p-6 border border-white/10"
              >
                <h3 className="text-white text-lg font-semibold mb-4">
                  Detection Results
                </h3>

                <div className="space-y-4">
                  <div>
                    <h4 className="text-white/80 text-sm font-medium mb-2">
                      Fingertips ({fingertips.length})
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {fingertips.map((tip, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 text-sm bg-white/5 rounded-lg px-3 py-2"
                        >
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: "white" }}
                          />
                          <span className="text-white/80">Detected</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Canvas Section */}
          <div className="bg-[#1A1F2E] rounded-2xl p-4 sm:p-6 border border-white/10">
            <h2 className="text-white text-lg sm:text-xl font-semibold mb-4">
              Detected Features
            </h2>

            {fingertips.length > 0 ? (
              <div className="relative">
                <canvas
                  ref={canvasRef}
                  className="w-full rounded-xl border border-white/10"
                />
              </div>
            ) : (
              <div className="h-64 sm:h-96 border-2 border-dashed border-white/10 rounded-xl flex items-center justify-center">
                <div className="text-center px-4">
                  <Hand className="w-12 h-12 sm:w-16 sm:h-16 text-white/20 mx-auto mb-3" />
                  <p className="text-white/40 text-sm sm:text-base">
                    Upload an image and click "Detect" to see results
                  </p>
                </div>
              </div>
            )}

            {/* Tips */}
            <div className="mt-4 p-4 bg-primary/10 border border-primary/20 rounded-xl">
              <h4 className="text-primary text-sm font-medium mb-2">
                Tips for Best Results
              </h4>
              <ul className="text-white/60 text-xs sm:text-sm space-y-1">
                <li>• Use good lighting - natural light works best</li>
                <li>• Keep your palm flat and fingers spread</li>
                <li>• Ensure the entire palm is visible in the frame</li>
                <li>• Avoid shadows across your palm</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Camera Modal */}
      {showCamera && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/90 z-50 flex flex-col"
        >
          {/* Camera Header */}
          <div className="flex items-center justify-between p-4 bg-black/50">
            <h3 className="text-white font-semibold">Capture Your Palm</h3>
            <button
              onClick={stopCamera}
              className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Camera View */}
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="relative w-full max-w-lg">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full rounded-2xl"
              />
              {/* Guide overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-64 h-80 border-2 border-dashed border-white/50 rounded-3xl flex items-center justify-center">
                  <p className="text-white/60 text-sm text-center px-4">
                    Position your palm here
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Capture Button */}
          <div className="p-6 flex justify-center">
            <button
              onClick={capturePhoto}
              className="w-20 h-20 rounded-full bg-white flex items-center justify-center hover:bg-white/90 transition-colors shadow-lg"
            >
              <div className="w-16 h-16 rounded-full border-4 border-black/20" />
            </button>
          </div>

          {/* Tips */}
          <div className="p-4 bg-black/50">
            <p className="text-white/60 text-xs text-center">
              Hold your palm flat with fingers spread • Use good lighting • Keep steady
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
