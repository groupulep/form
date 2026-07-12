import React, { useState } from "react";
import { Question } from "../types";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, CircleDashed, ClipboardCheck, MessageSquare, Star } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface SurveyScreenProps {
  userName: string;
  questions: Question[];
  onSubmit: (answers: Record<string, any>) => Promise<boolean>;
  onExit: () => void;
}

export default function SurveyScreen({ userName, questions, onSubmit, onExit }: SurveyScreenProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-10 rounded-[24px] shadow-[0_8px_40px_rgb(0,0,0,0.04)] border border-slate-200/50 max-w-sm text-center">
          <CircleDashed className="w-10 h-10 text-slate-400 mx-auto mb-5 animate-[spin_3s_linear_infinite]" strokeWidth={1.5} />
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">No hay preguntas disponibles</h2>
          <p className="text-slate-500 mt-2 text-sm leading-relaxed">Por favor, contacte al administrador para añadir preguntas.</p>
          <button onClick={onExit} className="mt-8 px-6 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 transition-colors">
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex) / questions.length) * 100;
  const isLastStep = currentIndex === questions.length - 1;

  // Answer state modifiers
  const handleRatingSelect = (rating: number) => {
    setAnswers({ ...answers, [currentQuestion.id]: rating });
    setError("");
  };

  const handleSingleSelect = (option: string) => {
    setAnswers({ ...answers, [currentQuestion.id]: option });
    setError("");
  };

  const handleMultipleSelect = (option: string) => {
    const currentSelections: string[] = answers[currentQuestion.id] || [];
    let updatedSelections: string[];
    if (currentSelections.includes(option)) {
      updatedSelections = currentSelections.filter((item) => item !== option);
    } else {
      updatedSelections = [...currentSelections, option];
    }
    setAnswers({ ...answers, [currentQuestion.id]: updatedSelections });
    setError("");
  };

  const handleTextChange = (text: string) => {
    setAnswers({ ...answers, [currentQuestion.id]: text });
    setError("");
  };

  const validateCurrentStep = (): boolean => {
    if (currentQuestion.required) {
      const answer = answers[currentQuestion.id];
      if (answer === undefined || answer === null || answer === "" || (Array.isArray(answer) && answer.length === 0)) {
        setError("Esta pregunta es obligatoria. Por favor, proporcione una respuesta para continuar.");
        return false;
      }
    }
    return true;
  };

  const handleSiguiente = () => {
    if (validateCurrentStep()) {
      if (isLastStep) {
        handleSubmitSurvey();
      } else {
        setCurrentIndex((prev) => prev + 1);
        setError("");
      }
    }
  };

  const handleAnterior = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setError("");
    }
  };

  const handleSubmitSurvey = async () => {
    setIsSubmitting(true);
    try {
      const success = await onSubmit(answers);
      if (success) {
        setSubmitted(true);
      } else {
        setError("Ocurrió un error al enviar. Por favor, inténtelo de nuevo.");
      }
    } catch (err) {
      setError("Error de conexión al servidor.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="survey-screen-wrapper" className="min-h-screen bg-slate-50 flex flex-col items-center justify-center py-10 px-4 relative overflow-hidden font-sans">
      <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none">
        <div className="w-[800px] h-[800px] bg-white rounded-full blur-3xl opacity-60" />
      </div>

      <div className="max-w-2xl w-full flex flex-col flex-grow z-10">
        {/* Header */}
        <header className="flex items-center justify-between mb-8 px-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-[10px] bg-purple-600 flex items-center justify-center shadow-sm">
              <ClipboardCheck className="w-4 h-4 text-white" strokeWidth={2} />
            </div>
            <span className="font-semibold text-slate-900 tracking-tight">Encuesta Corporativa</span>
          </div>
          <div className="text-xs font-medium px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-full flex items-center gap-2 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-600 animate-pulse" />
            <span className="hidden sm:inline">Participante:</span> <strong className="text-slate-900 font-semibold">{userName}</strong>
          </div>
        </header>

        {/* Main Container */}
        <main className="bg-white/80 backdrop-blur-xl rounded-[32px] shadow-[0_8px_40px_rgb(0,0,0,0.04)] border border-slate-200/50 flex-grow flex flex-col overflow-hidden">
          <AnimatePresence mode="wait">
            {!submitted ? (
              <motion.div
                key={`survey-flow-${currentIndex}`}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="flex flex-col flex-grow p-8 sm:p-12 justify-between"
              >
                {/* Progress Bar */}
                <div>
                  <div className="flex justify-between items-center text-[11px] uppercase tracking-widest text-slate-400 font-bold mb-4">
                    <span>Pregunta {currentIndex + 1} de {questions.length}</span>
                    <span>{Math.round((currentIndex / questions.length) * 100)}%</span>
                  </div>
                  <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden mb-12">
                    <div
                      className="h-full bg-purple-600 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  {/* Question Info */}
                  <div className="space-y-4 mb-10">
                    <div className="flex items-start gap-3">
                      {currentQuestion.required && (
                        <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 bg-slate-100 text-slate-500 rounded-md">
                          Obligatoria
                        </span>
                      )}
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight leading-tight">
                      {currentQuestion.title}
                    </h2>
                    {currentQuestion.description && (
                      <p className="text-slate-500 text-sm sm:text-base leading-relaxed">
                        {currentQuestion.description}
                      </p>
                    )}
                  </div>

                  {/* Question Answer Inputs */}
                  <div className="mb-10">
                    {/* Rating Input */}
                    {currentQuestion.type === "rating" && (
                      <div className="flex items-center gap-2 sm:gap-4 py-4">
                        {[1, 2, 3, 4, 5].map((star) => {
                          const isSelected = (answers[currentQuestion.id] || 0) >= star;
                          return (
                            <button
                              key={star}
                              onClick={() => handleRatingSelect(star)}
                              className="p-2 sm:p-3 rounded-2xl transition-all hover:bg-slate-50 focus:outline-none group active:scale-95"
                            >
                              <Star
                                className={`w-8 h-8 sm:w-10 sm:h-10 transition-all duration-300 ${
                                  isSelected
                                    ? "fill-zinc-900 text-slate-900"
                                    : "text-slate-300 group-hover:text-slate-400 stroke-1"
                                }`}
                              />
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Single Choice Input */}
                    {currentQuestion.type === "single" && (
                      <div className="space-y-3">
                        {currentQuestion.options?.map((option, idx) => {
                          const isSelected = answers[currentQuestion.id] === option;
                          return (
                            <button
                              key={idx}
                              onClick={() => handleSingleSelect(option)}
                              className={`w-full text-left p-5 rounded-2xl border-2 transition-all duration-200 flex items-center justify-between group ${
                                isSelected
                                  ? "border-purple-600 bg-purple-600 text-white shadow-md shadow-purple-900/10"
                                  : "border-slate-100 hover:border-slate-200 hover:bg-slate-50 text-slate-700"
                              }`}
                            >
                              <span className="font-medium text-sm sm:text-base">{option}</span>
                              <div
                                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                                  isSelected ? "border-white bg-white" : "border-slate-300 group-hover:border-slate-400"
                                }`}
                              >
                                {isSelected && <div className="w-2 h-2 rounded-full bg-purple-600" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Multiple Choice Input */}
                    {currentQuestion.type === "multiple" && (
                      <div className="space-y-3">
                        {currentQuestion.options?.map((option, idx) => {
                          const isSelected = (answers[currentQuestion.id] || []).includes(option);
                          return (
                            <button
                              key={idx}
                              onClick={() => handleMultipleSelect(option)}
                              className={`w-full text-left p-5 rounded-2xl border-2 transition-all duration-200 flex items-center justify-between group ${
                                isSelected
                                  ? "border-purple-600 bg-purple-600 text-white shadow-md shadow-purple-900/10"
                                  : "border-slate-100 hover:border-slate-200 hover:bg-slate-50 text-slate-700"
                              }`}
                            >
                              <span className="font-medium text-sm sm:text-base">{option}</span>
                              <div
                                className={`w-6 h-6 rounded-[8px] border-2 flex items-center justify-center transition-colors ${
                                  isSelected ? "border-white bg-white" : "border-slate-300 group-hover:border-slate-400 bg-transparent"
                                }`}
                              >
                                {isSelected && <Check className="w-4 h-4 text-slate-900" strokeWidth={3} />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Text Input */}
                    {currentQuestion.type === "text" && (
                      <div className="w-full relative">
                        <MessageSquare className="absolute top-5 left-5 w-5 h-5 text-slate-400" />
                        <textarea
                          rows={5}
                          className="w-full pl-14 pr-5 py-5 border-2 border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-purple-500/20 focus:border-purple-600 bg-slate-50/50 hover:bg-slate-50 text-slate-900 placeholder-zinc-400 transition-all text-sm sm:text-base resize-none leading-relaxed"
                          placeholder="Escriba su respuesta aquí..."
                          value={answers[currentQuestion.id] || ""}
                          onChange={(e) => handleTextChange(e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Navigation Action Buttons */}
                <div className="space-y-5">
                  <AnimatePresence>
                    {error && (
                      <motion.p
                        initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                        className="text-xs text-rose-500 font-medium bg-rose-50 p-3 rounded-xl border border-rose-100 flex items-center"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-2 shrink-0" />
                        {error}
                      </motion.p>
                    )}
                  </AnimatePresence>

                  <div className="flex items-center justify-between gap-4">
                    <button
                      onClick={handleAnterior}
                      disabled={currentIndex === 0}
                      className={`flex items-center gap-2 px-6 py-3.5 rounded-2xl text-sm font-semibold transition-all ${
                        currentIndex === 0
                          ? "text-slate-300 cursor-not-allowed"
                          : "text-slate-600 hover:bg-slate-100 active:scale-95"
                      }`}
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Anterior
                    </button>

                    <button
                      onClick={handleSiguiente}
                      disabled={isSubmitting}
                      className="flex items-center gap-2 px-8 py-3.5 rounded-2xl text-sm font-semibold text-white shadow-md bg-purple-600 hover:bg-purple-700 transition-all transform active:scale-95 disabled:opacity-50 group"
                    >
                      {isSubmitting ? (
                        "Enviando..."
                      ) : isLastStep ? (
                        <>
                          Enviar
                          <CheckCircle2 className="w-4 h-4" />
                        </>
                      ) : (
                        <>
                          Siguiente
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="survey-completion"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="p-12 text-center flex flex-col justify-center items-center flex-grow"
              >
                <div className="w-20 h-20 bg-purple-600 rounded-[24px] flex items-center justify-center shadow-xl shadow-purple-900/10 mb-8 transform -rotate-6">
                  <CheckCircle2 className="w-10 h-10 text-white" strokeWidth={2} />
                </div>
                <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
                  ¡Encuesta Completada!
                </h2>
                <p className="text-slate-500 text-base max-w-sm mt-4 leading-relaxed">
                  Gracias por su tiempo, <strong className="text-slate-900">{userName}</strong>. Sus respuestas han sido guardadas de forma segura y son vitales para nuestra mejora continua.
                </p>

                <div className="mt-12 flex gap-4">
                  <button
                    onClick={onExit}
                    className="px-8 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-900 font-semibold rounded-2xl text-sm transition-all active:scale-95"
                  >
                    Volver al Inicio
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Footer */}
        <footer className="text-center text-[11px] font-medium tracking-wide text-slate-400 mt-8 mb-4 uppercase">
          Plataforma Confidencial de Encuestas Corporativas
        </footer>
      </div>
    </div>
  );
}
