import React, { useEffect, useState } from "react";
import { db } from "../lib/firebase";
import { doc, getDocFromServer } from "firebase/firestore";

export default function StatusIndicator() {
  const [status, setStatus] = useState<"server" | "firebase" | "offline" | null>(null);

  const checkConnection = async () => {
    // 1. Try local Express backend first
    try {
      const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
      const timeoutId = controller ? setTimeout(() => controller.abort(), 2000) : null;
      
      const res = await fetch("/api/health", {
        signal: controller ? controller.signal : undefined,
        headers: { "Cache-Control": "no-cache" }
      });
      
      if (timeoutId) clearTimeout(timeoutId);
      
      if (res.ok) {
        setStatus("server");
        return;
      }
    } catch (err) {
      // Failed local check
    }

    // 2. Fallback: check Firebase Cloud connection using standard Firebase getDocFromServer
    try {
      const sDocRef = doc(db, "config", "survey_settings");
      await getDocFromServer(sDocRef);
      setStatus("firebase");
    } catch (err) {
      console.warn("StatusIndicator: Failed to connect to Firebase:", err);
      setStatus("offline");
    }
  };

  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 12000); // Check every 12 seconds
    return () => clearInterval(interval);
  }, []);

  if (status === null) {
    // Initial loading: show a neutral pulsing gray light
    return (
      <div 
        id="status-indicator-loading"
        className="fixed top-4 right-4 z-50 flex items-center justify-center p-2 bg-white/80 backdrop-blur-xl rounded-full border border-slate-200/50 shadow-[0_4px_20px_rgb(0,0,0,0.04)]"
        title="Verificando conexión..."
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-zinc-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-zinc-400"></span>
        </span>
      </div>
    );
  }

  const isOnline = status === "server" || status === "firebase";

  return (
    <div 
      id="status-indicator"
      className="fixed top-4 right-4 z-50 flex items-center justify-center p-2 px-3 gap-2 bg-white/90 backdrop-blur-xl rounded-full border border-slate-200/80 shadow-[0_4px_20px_rgb(0,0,0,0.04)] transition-all duration-300"
      title={
        status === "server"
          ? "Servidor Local Conectado: Sincronización activa" 
          : status === "firebase"
          ? "Conectado a Firebase Cloud: Sincronización activa"
          : "Modo Local: Guardando respuestas en el navegador de forma segura"
      }
    >
      <span className="relative flex h-2 w-2">
        <span 
          className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
            isOnline ? "bg-emerald-500" : "bg-rose-500"
          }`}
        />
        <span 
          className={`relative inline-flex rounded-full h-2 w-2 transition-colors duration-500 ${
            isOnline 
              ? "bg-emerald-500" 
              : "bg-rose-500"
          }`}
        />
      </span>
      <span className={`text-[9px] font-bold uppercase tracking-widest leading-none mt-px ${
        status === "server" ? "text-emerald-600" : status === "firebase" ? "text-emerald-500" : "text-rose-500"
      }`}>
        {status === "server" && "Online"}
        {status === "firebase" && "Cloud"}
        {status === "offline" && "Offline"}
      </span>
    </div>
  );
}
