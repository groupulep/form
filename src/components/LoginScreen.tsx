import React, { useState } from "react";
import { ArrowRight, User, Sparkles, Smile } from "lucide-react";
import { motion } from "motion/react";

interface LoginScreenProps {
  onLogin: (name: string, isAdmin: boolean) => void;
  allowAnonymous?: boolean;
}

export default function LoginScreen({ onLogin, allowAnonymous = true }: LoginScreenProps) {
  const [name, setName] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = isAnonymous ? "Anónimo" : name.trim();
    if (!finalName) {
      setError("Por favor, escribe tu nombre para continuar o activa el modo anónimo.");
      return;
    }

    if (finalName === "902050377") {
      onLogin(finalName, true);
    } else {
      onLogin(finalName, false);
    }
  };

  return (
    <div id="login-container" className="min-h-screen bg-gradient-to-b from-slate-50 via-purple-50/20 to-emerald-50/20 flex items-center justify-center p-6 relative overflow-hidden font-sans select-none">
      {/* Warm, pastel glowing backgrounds for a friendly and welcoming feel */}
      <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-purple-200/30 rounded-full mix-blend-multiply filter blur-[120px] animate-pulse duration-[12000ms]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[650px] h-[650px] bg-emerald-200/20 rounded-full mix-blend-multiply filter blur-[130px] animate-pulse duration-[10000ms] delay-1000" />
      <div className="absolute top-1/4 right-1/4 w-[450px] h-[450px] bg-blue-100/30 rounded-full mix-blend-multiply filter blur-[100px] animate-pulse duration-[14000ms] delay-2000" />

      {/* Playful, subtle polka dot background pattern for a warm, cozy vibe */}
      <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] bg-[size:24px_24px] opacity-40 pointer-events-none" />

      {/* Main Container Wrapper with gradient border */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md p-[1.5px] bg-gradient-to-br from-purple-300/60 via-blue-200/40 to-emerald-300/60 rounded-[40px] shadow-[0_25px_60px_-15px_rgba(147,51,234,0.08)] backdrop-blur-xl relative z-10"
      >
        <div
          id="login-card"
          className="w-full bg-white/90 backdrop-blur-xl rounded-[38.5px] p-10 md:p-12"
        >
          <div className="text-center mb-9 flex flex-col items-center">
            {/* Friendly Logo Emblem (Cute corporate smile badge) */}
            <motion.div 
              initial={{ scale: 0.8, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 100 }}
              className="w-16 h-16 rounded-[24px] bg-gradient-to-br from-purple-500 via-blue-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-purple-500/10 mb-6 relative group"
            >
              <Smile className="w-8 h-8 text-white transition-transform duration-300 group-hover:scale-110" />
              <div className="absolute -top-1 -right-1 bg-yellow-300 text-yellow-800 rounded-full p-1 border-2 border-white shadow-sm">
                <Sparkles className="w-3.5 h-3.5 fill-yellow-400 text-yellow-600" />
              </div>
            </motion.div>

            {/* Elegant active state badge */}
            <motion.div 
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="inline-flex items-center gap-2 px-3 py-1 bg-purple-50/80 rounded-full border border-purple-100/80 mb-4"
            >
              <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
              <span className="text-[10px] font-bold text-purple-700 tracking-wider uppercase">Portal de Opinión</span>
            </motion.div>

            <motion.h1 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="text-3xl md:text-4xl font-extrabold text-slate-800 tracking-tight"
            >
              <span className="bg-gradient-to-r from-slate-800 via-purple-900 to-slate-800 bg-clip-text text-transparent">GROUP</span>{" "}
              <span className="bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent">ULEP</span>
            </motion.h1>

            <motion.p 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="text-sm text-slate-500 mt-3 font-medium max-w-[280px] leading-relaxed"
            >
              Tu opinión es muy valiosa para seguir creciendo juntos de forma segura.
            </motion.p>
          </div>

          <motion.form 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            onSubmit={handleSubmit} 
            className="space-y-6"
          >
            <div className="space-y-2">
              <label htmlFor="name-input" className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                Escribe tu nombre aquí
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1 group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 transition-colors group-focus-within:text-purple-500">
                    <User className="h-5 w-5 transition-transform duration-300 group-focus-within:scale-105" />
                  </div>
                  <input
                    type="text"
                    id="name-input"
                    autoComplete="off"
                    disabled={isAnonymous}
                    className={`block w-full pl-12 pr-4 py-4 border rounded-[20px] text-sm focus:outline-none focus:ring-4 focus:ring-purple-500/10 focus:border-purple-400 transition-all duration-300 shadow-inner ${
                      isAnonymous 
                        ? "bg-slate-100/80 text-slate-400 border-slate-200/50 cursor-not-allowed select-none" 
                        : "bg-slate-50/60 border-slate-200/60 text-slate-800 focus:bg-white"
                    }`}
                    placeholder={isAnonymous ? "Anonimato Activado 🔒" : "Ej. Sofía Rodríguez"}
                    value={isAnonymous ? "Anónimo" : name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (error) setError("");
                    }}
                  />
                </div>
                {allowAnonymous && (
                  <button
                    type="button"
                    onClick={() => {
                      const newAnon = !isAnonymous;
                      setIsAnonymous(newAnon);
                      if (newAnon) {
                        setName("Anónimo");
                      } else {
                        setName("");
                      }
                      setError("");
                    }}
                    className={`px-4 rounded-[20px] text-[11px] font-extrabold tracking-wide transition-all duration-300 flex flex-col items-center justify-center gap-0.5 shrink-0 border cursor-pointer ${
                      isAnonymous
                        ? "bg-purple-100/80 border-purple-200 text-purple-700 shadow-sm"
                        : "bg-white hover:bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-800"
                    }`}
                  >
                    <span className="text-sm">{isAnonymous ? "🔒" : "🔓"}</span>
                    <span>Anónimo</span>
                  </button>
                )}
              </div>
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
            </div>

            <button
              type="submit"
              id="login-submit-btn"
              className="w-full bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-sm font-semibold py-4 px-4 rounded-[20px] shadow-lg shadow-purple-600/15 hover:shadow-purple-600/25 transition-all duration-300 flex items-center justify-center gap-2 group cursor-pointer transform active:scale-[0.98]"
            >
              Comenzar Encuesta
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.form>

          {/* Footer text indicating security */}
          <div className="mt-8 text-center border-t border-slate-100 pt-6">
            <p className="text-[10px] text-slate-400 font-medium tracking-wide">
              🔒 Encuesta 100% segura y anónima para colaboradores
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
