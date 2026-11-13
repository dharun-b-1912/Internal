"use client";

import React, { useEffect, useRef, useState } from "react";
import { PenTool, Check, Trash2, Camera, FolderOpen, RotateCcw, AlertTriangle, Upload } from "lucide-react";

interface SignaturePadProps {
  value?: string | null;
  onChange: (dataUrl: string) => void;
  label?: string;
  helperText?: string;
}

export function SignaturePad({
  value,
  onChange,
  label = "Employee Real Signature",
  helperText = "Draw real signature using your finger, stylus, or mouse, or snap a photo of your paper signature."
}: SignaturePadProps) {
  const [mode, setMode] = useState<"draw" | "camera" | "upload">("draw");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Initialize Canvas
  const setupCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Support High DPI
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // Initial fill with transparent background
    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.strokeStyle = "#0f172a"; // Deep navy ink
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  };

  useEffect(() => {
    if (mode === "draw") {
      const timer = setTimeout(() => {
        setupCanvas();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [mode]);

  // Coordinate helper
  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ("touches" in e) {
      if (e.touches.length === 0) return { x: 0, y: 0 };
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if ("touches" in e) {
      // Prevent scrolling when touching the canvas
      e.stopPropagation();
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const coords = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    if ("touches" in e) {
      e.stopPropagation();
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const coords = getCoordinates(e);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
    setHasDrawn(true);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    setHasDrawn(false);
  };

  const saveDrawnSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn) return;

    // Crop or export as PNG Data URL
    const dataUrl = canvas.toDataURL("image/png");
    onChange(dataUrl);
  };

  // Camera Management
  const startCamera = async () => {
    setCameraError("");
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera is not supported on this browser.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });
      mediaStreamRef.current = stream;
      setCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      setCameraError(err.message || "Failed to access camera. Please check camera permissions.");
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const captureCameraSignature = () => {
    const video = videoRef.current;
    if (!video) return;

    const snapCanvas = document.createElement("canvas");
    snapCanvas.width = video.videoWidth || 640;
    snapCanvas.height = video.videoHeight || 480;
    const ctx = snapCanvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, snapCanvas.width, snapCanvas.height);
    const dataUrl = snapCanvas.toDataURL("image/png");
    stopCamera();
    onChange(dataUrl);
  };

  // Upload Handling
  const handleFileUpload = (file?: File) => {
    if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) {
      window.alert("Please choose a PNG, JPEG, or WebP image.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      window.alert("Please choose an image smaller than 2 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        onChange(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const isSigned = Boolean(value && value.startsWith("data:image/"));

  return (
    <div style={{ marginTop: 12, marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <div>
          <strong style={{ fontSize: 14, color: "#0f172a", display: "inline-flex", alignItems: "center", gap: 6 }}>
            <PenTool size={15} style={{ color: "#2563eb" }} />
            <span>{label}</span>
          </strong>
          <span style={{ fontSize: 12, color: "#64748b", display: "block", marginTop: 2 }}>{helperText}</span>
        </div>
        {isSigned && (
          <span style={{ fontSize: 12, fontWeight: 700, padding: "3px 8px", background: "#dcfce7", color: "#166534", borderRadius: 6, display: "inline-flex", alignItems: "center", gap: 4 }}>
            <Check size={14} /> Signature Recorded
          </span>
        )}
      </div>

      {isSigned ? (
        <div style={{ border: "2px solid #86efac", background: "#f0fdf4", borderRadius: 10, padding: 14, display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ background: "#ffffff", padding: "8px 16px", borderRadius: 8, border: "1px solid #bbf7d0", display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 180, minHeight: 70 }}>
            <img src={value!} alt="Recorded Signature" style={{ maxHeight: 60, maxWidth: 220, objectFit: "contain" }} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={() => onChange("")}
              style={{ padding: "7px 12px", background: "#fee2e2", color: "#991b1b", border: "1px solid #f87171", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <Trash2 size={14} /> Re-sign / Clear
            </button>
          </div>
        </div>
      ) : (
        <div style={{ border: "1px solid #cbd5e1", borderRadius: 10, background: "#ffffff", overflow: "hidden" }}>
          {/* Mode Switch Tabs */}
          <div style={{ display: "flex", borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}>
            <button
              type="button"
              onClick={() => { stopCamera(); setMode("draw"); }}
              style={{
                flex: 1,
                padding: "10px 8px",
                fontSize: 13,
                fontWeight: 700,
                border: "none",
                borderBottom: mode === "draw" ? "3px solid #2563eb" : "3px solid transparent",
                background: mode === "draw" ? "#ffffff" : "transparent",
                color: mode === "draw" ? "#2563eb" : "#64748b",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6
              }}
            >
              <PenTool size={14} /> Draw with Finger / Pen
            </button>
            <button
              type="button"
              onClick={() => { setMode("camera"); startCamera(); }}
              style={{
                flex: 1,
                padding: "10px 8px",
                fontSize: 13,
                fontWeight: 700,
                border: "none",
                borderBottom: mode === "camera" ? "3px solid #2563eb" : "3px solid transparent",
                background: mode === "camera" ? "#ffffff" : "transparent",
                color: mode === "camera" ? "#2563eb" : "#64748b",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6
              }}
            >
              <Camera size={14} /> Snap Paper Sign
            </button>
            <button
              type="button"
              onClick={() => { stopCamera(); setMode("upload"); }}
              style={{
                flex: 1,
                padding: "10px 8px",
                fontSize: 13,
                fontWeight: 700,
                border: "none",
                borderBottom: mode === "upload" ? "3px solid #2563eb" : "3px solid transparent",
                background: mode === "upload" ? "#ffffff" : "transparent",
                color: mode === "upload" ? "#2563eb" : "#64748b",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6
              }}
            >
              <FolderOpen size={14} /> Browse File
            </button>
          </div>

          {/* Mode 1: Interactive Canvas */}
          {mode === "draw" && (
            <div style={{ padding: 14 }}>
              <div style={{ position: "relative", border: "2px dashed #94a3b8", borderRadius: 8, background: "#f8fafc", overflow: "hidden" }}>
                <canvas
                  ref={canvasRef}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  style={{
                    width: "100%",
                    height: 140,
                    display: "block",
                    cursor: "crosshair",
                    touchAction: "none"
                  }}
                />
                <div style={{ position: "absolute", bottom: 25, left: "5%", width: "90%", borderBottom: "1px dashed #cbd5e1", pointerEvents: "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: "#94a3b8", background: "#f8fafc", padding: "0 4px" }}>Sign above this line</span>
                  <span style={{ fontSize: 11, color: "#cbd5e1" }}>×</span>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
                <button
                  type="button"
                  onClick={clearCanvas}
                  disabled={!hasDrawn}
                  style={{ padding: "6px 12px", background: "#f1f5f9", color: "#475569", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: hasDrawn ? "pointer" : "not-allowed", opacity: hasDrawn ? 1 : 0.5, display: "inline-flex", alignItems: "center", gap: 5 }}
                >
                  <RotateCcw size={13} /> Clear &amp; Redo
                </button>
                <button
                  type="button"
                  onClick={saveDrawnSignature}
                  disabled={!hasDrawn}
                  style={{ padding: "8px 16px", background: hasDrawn ? "#16a34a" : "#cbd5e1", color: "#ffffff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: hasDrawn ? "pointer" : "not-allowed", display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  <Check size={14} /> Confirm &amp; Save Signature
                </button>
              </div>
            </div>
          )}

          {/* Mode 2: Camera Snap */}
          {mode === "camera" && (
            <div style={{ padding: 14, textAlign: "center" }}>
              {cameraError ? (
                <div style={{ padding: 12, background: "#fef2f2", color: "#991b1b", borderRadius: 8, fontSize: 13, marginBottom: 10 }}>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <AlertTriangle size={15} />
                    <span>{cameraError}</span>
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <button type="button" onClick={startCamera} style={{ padding: "6px 12px", background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                      Try Again
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ position: "relative", width: "100%", maxWidth: 360, margin: "0 auto", background: "#000", borderRadius: 8, overflow: "hidden", minHeight: 180, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      style={{ width: "100%", height: "auto", display: cameraActive ? "block" : "none" }}
                    />
                    {!cameraActive && (
                      <span style={{ color: "#fff", fontSize: 13 }}>Initializing camera…</span>
                    )}
                    {cameraActive && (
                      <div style={{ position: "absolute", top: "20%", left: "10%", width: "80%", height: "60%", border: "2px dashed #22c55e", borderRadius: 6, pointerEvents: "none", boxSizing: "border-box" }}>
                        <span style={{ position: "absolute", top: -20, left: 4, background: "rgba(0,0,0,0.7)", color: "#fff", fontSize: 10, padding: "2px 6px", borderRadius: 4 }}>Align paper signature here</span>
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 12 }}>
                    <button
                      type="button"
                      onClick={captureCameraSignature}
                      disabled={!cameraActive}
                      style={{ padding: "8px 18px", background: "#2563eb", color: "#ffffff", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 700, cursor: cameraActive ? "pointer" : "not-allowed", display: "inline-flex", alignItems: "center", gap: 6 }}
                    >
                      <Camera size={15} /> Capture Paper Signature
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Mode 3: File Upload */}
          {mode === "upload" && (
            <div style={{ padding: 20, textAlign: "center" }}>
              <label style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "18px 24px", background: "#f8fafc", border: "2px dashed #cbd5e1", borderRadius: 8, cursor: "pointer", width: "100%", maxWidth: 320, boxSizing: "border-box" }}>
                <Upload size={28} style={{ color: "#64748b", marginBottom: 6 }} />
                <strong style={{ fontSize: 13, color: "#1e293b" }}>Select Signature Image</strong>
                <span style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>PNG, JPEG or WebP (max 2 MB)</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  style={{ display: "none" }}
                  onChange={e => handleFileUpload(e.target.files?.[0])}
                />
              </label>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
