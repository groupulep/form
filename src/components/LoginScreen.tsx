import React, { useState } from "react";
import { ArrowRight, User, Sparkles, Building2 } from "lucide-react";
import { motion } from "motion/react";

interface LoginScreenProps {
  onLogin: (name: string, isAdmin: boolean) => void;
  allowAnonymous?: boolean;
  companyName?: string;
}

export default function LoginScreen({ onLogin, allowAnonymous = true, companyName = "GROUP ULEP S.A.S" }: LoginScreenProps) {
  const [mode, setMode] = useState<"anonymous" | "identified">(allowAnonymous ? "anonymous" : "identified");
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const renderCompanyName = () => {
    const trimmed = companyName.trim();
    const words = trimmed.split(/\s+/);
    if (words.length > 1) {
      const lastWord = words.pop();
      const firstPart = words.join(" ");
      return (
        <>
          <span className="bg-gradient-to-r from-slate-700 via-slate-800 to-slate-900 bg-clip-text text-transparent">{firstPart}</span>{" "}
          <span className="bg-gradient-to-r from-purple-600 via-blue-600 to-emerald-500 bg-clip-text text-transparent">{lastWord}</span>
        </>
      );
    }
    return (
      <span className="bg-gradient-to-r from-purple-600 via-blue-600 to-emerald-500 bg-clip-text text-transparent">{trimmed}</span>
    );
  };

  React.useEffect(() => {
    if (!allowAnonymous) {
      setMode("identified");
    }
  }, [allowAnonymous]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = mode === "anonymous" ? "Anónimo" : name.trim();
    if (mode === "identified" && !finalName) {
      setError("Por favor, escribe tu nombre para continuar.");
      return;
    }

    if (finalName === "902050377") {
      onLogin(finalName, true);
    } else {
      onLogin(finalName, false);
    }
  };

  return (
    <div id="login-container" className="min-h-screen bg-gradient-to-b from-slate-50 via-purple-50/25 to-emerald-50/25 flex items-center justify-center p-6 relative overflow-hidden font-sans select-none">
      {/* Warm, pastel glowing backgrounds for a friendly and welcoming feel */}
      <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-purple-200/30 rounded-full mix-blend-multiply filter blur-[120px] animate-pulse duration-[12000ms]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[650px] h-[650px] bg-emerald-200/25 rounded-full mix-blend-multiply filter blur-[130px] animate-pulse duration-[10000ms] delay-1000" />
      <div className="absolute top-1/4 right-1/4 w-[450px] h-[450px] bg-blue-100/40 rounded-full mix-blend-multiply filter blur-[100px] animate-pulse duration-[14000ms] delay-2000" />

      {/* Playful, subtle polka dot background pattern for a warm, cozy vibe */}
      <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] bg-[size:24px_24px] opacity-40 pointer-events-none" />

      {/* Main Container Wrapper with gradient border */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md p-[1.5px] bg-gradient-to-br from-purple-200 via-blue-200 to-emerald-200 rounded-[40px] shadow-[0_25px_60px_-15px_rgba(147,51,234,0.06)] backdrop-blur-xl relative z-10"
      >
        <div
          id="login-card"
          className="w-full bg-white rounded-[38.5px] p-10 md:p-12"
        >
          <div className="text-center mb-9 flex flex-col items-center">
            {/* Friendly Logo Emblem (Cute corporate badge) */}
            <motion.div 
              initial={{ scale: 0.8, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 100 }}
              className="w-16 h-16 rounded-[24px] bg-gradient-to-br from-purple-600 via-blue-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-purple-600/10 mb-6 relative group"
            >
              <Building2 className="w-8 h-8 text-white transition-transform duration-300 group-hover:scale-110" />
              <div className="absolute -top-1 -right-1 bg-yellow-300 text-yellow-800 rounded-full p-1 border-2 border-white shadow-sm">
                <Sparkles className="w-3.5 h-3.5 fill-yellow-400 text-yellow-600" />
              </div>
            </motion.div>

            {/* Elegant active state badge */}
            <motion.div 
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="inline-flex items-center gap-2 px-3 py-1 bg-purple-50 rounded-full border border-purple-100 mb-4"
            >
              <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse" />
              <span className="text-[10px] font-bold text-purple-700 tracking-wider uppercase">Encuesta</span>
            </motion.div>

            <motion.h1 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight"
            >
              {renderCompanyName()}
            </motion.h1>
          </div>

          <motion.form 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            onSubmit={handleSubmit} 
            className="space-y-6"
          >
            <div className="grid grid-cols-2 gap-3 mb-6">
              {!allowAnonymous ? (
                <button
                  type="button"
                  disabled
                  className="flex flex-col items-center justify-center gap-1.5 p-4 rounded-2xl border-2 border-slate-100 bg-slate-50 text-slate-400 opacity-60 cursor-not-allowed relative h-24"
                >
                  <span className="text-xl grayscale">🔒</span>
                  <span className="text-xs font-bold uppercase tracking-wider">Anónimo</span>
                  <span className="text-[9px] font-medium text-slate-400">No disponible</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setMode("anonymous");
                    setError("");
                  }}
                  className={`flex flex-col items-center justify-center gap-1.5 p-4 rounded-2xl border-2 transition-all duration-300 cursor-pointer h-24 ${
                    mode === "anonymous"
                      ? "border-purple-500 bg-purple-50 text-purple-700 shadow-sm"
                      : "border-slate-100 bg-slate-50 text-slate-500 hover:bg-slate-100/80"
                  }`}
                >
                  <span className="text-xl">🔒</span>
                  <span className="text-xs font-bold uppercase tracking-wider">Anónimo</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setMode("identified");
                  setError("");
                }}
                className={`flex flex-col items-center justify-center gap-1.5 p-4 rounded-2xl border-2 transition-all duration-300 cursor-pointer h-24 ${
                  mode === "identified"
                    ? "border-purple-500 bg-purple-50 text-purple-700 shadow-sm"
                    : "border-slate-100 bg-slate-50 text-slate-500 hover:bg-slate-100/80"
                }`}
              >
                <span className="text-xl">👤</span>
                <span className="text-xs font-bold uppercase tracking-wider">Identificado</span>
              </button>
            </div>

            {!allowAnonymous && (
              <div className="mb-4 p-3 bg-slate-50 border border-slate-200/60 rounded-xl text-center text-slate-500 text-[11px] font-semibold">
                El ingreso anónimo está desactivado. Escriba su nombre.
              </div>
            )}

            {mode === "identified" && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="space-y-2 mb-6 overflow-hidden"
              >
                <label htmlFor="name-input" className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                  Escribe tu nombre aquí
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 transition-colors group-focus-within:text-purple-600">
                    <User className="h-5 w-5 transition-transform duration-300 group-focus-within:scale-105" />
                  </div>
                  <input
                    type="text"
                    id="name-input"
                    autoComplete="off"
                    className="block w-full pl-12 pr-4 py-4 border border-slate-200 rounded-[20px] text-sm focus:outline-none focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 transition-all duration-300 bg-slate-50 text-slate-800 focus:bg-white shadow-inner"
                    placeholder="Ej. Sofía Rodríguez"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (error) setError("");
                    }}
                  />
                </div>
              </motion.div>
            )}

            {error && (
              <motion.p 
                initial={{ opacity: 0, y: -4 }} 
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-rose-500 mt-2 ml-1 flex items-center gap-1.5 font-medium"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                {error}
              </motion.p>
            )}

            <button
              type="submit"
              id="login-submit-btn"
              className="w-full bg-gradient-to-r from-purple-600 via-blue-600 to-emerald-500 hover:from-purple-500 hover:to-emerald-500 text-white text-sm font-semibold py-4 px-4 rounded-[20px] shadow-lg shadow-purple-600/10 hover:shadow-purple-600/20 transition-all duration-300 flex items-center justify-center gap-2 group cursor-pointer transform active:scale-[0.98]"
            >
              Comenzar Encuesta
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.form>

          {/* Footer text indicating security */}
          <div className="mt-8 text-center border-t border-slate-100 pt-6">
            <p className="text-[10px] text-slate-400 font-medium tracking-wide">
              🔒 Encuestas de {companyName}
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
