import React, { useState, useEffect } from "react";
import { Question, Response } from "./types";
import LoginScreen from "./components/LoginScreen";
import SurveyScreen from "./components/SurveyScreen";
import AdminDashboard from "./components/AdminDashboard";
import StatusIndicator from "./components/StatusIndicator";
import { HelpCircle, RefreshCw } from "lucide-react";
import {
  saveQuestionsToFirestore,
  getQuestionsFromFirestore,
  saveWebhookToFirestore,
  getWebhookFromFirestore,
  saveResponseToFirestore,
  getResponsesFromFirestore,
  clearResponsesFromFirestore,
  saveSettingsToFirestore,
  getSettingsFromFirestore
} from "./lib/firebase";

// Default fallback questions when the backend server is unreachable (such as on GitHub Pages)
const DEFAULT_QUESTIONS: Question[] = [
  {
    id: "q1",
    type: "rating",
    title: "Satisfacción General",
    description: "Califique su nivel de satisfacción general con nuestros servicios corporativos.",
    required: true,
  },
  {
    id: "q2",
    type: "single",
    title: "Área de Mayor Interés",
    description: "¿Qué área de nuestra empresa le resulta de mayor relevancia para su negocio?",
    options: [
      "Desarrollo de Software a Medida",
      "Consultoría Tecnológica",
      "Soporte y Mantenimiento TI",
      "Ciberseguridad y Cumplimiento",
      "Soluciones de Inteligencia Artificial"
    ],
    required: true,
  },
  {
    id: "q3",
    type: "multiple",
    title: "Aspectos a Mejorar",
    description: "¿Qué aspectos considera que deberíamos priorizar para optimizar su experiencia? (Seleccione todos los que correspondan)",
    options: [
      "Tiempo de respuesta en soporte",
      "Claridad en las propuestas comerciales",
      "Profundidad en el análisis técnico",
      "Variedad de herramientas y tecnologías",
      "Proactividad en sugerir mejoras"
    ],
    required: false,
  },
  {
    id: "q4",
    type: "text",
    title: "Comentarios y Sugerencias Adicionales",
    description: "Por favor, comparta con nosotros cualquier detalle adicional que nos ayude a perfeccionar nuestro servicio.",
    required: false,
  }
];

export default function App() {
  const [userName, setUserName] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [responses, setResponses] = useState<Response[]>([]);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [allowAnonymous, setAllowAnonymous] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch initial survey questions and webhook configurations
  const fetchSurveyConfig = async () => {
    try {
      setLoading(true);

      // Load settings (allowAnonymous) from Firestore first
      try {
        const fbSettings = await getSettingsFromFirestore();
        setAllowAnonymous(fbSettings !== false);
        localStorage.setItem("survey_allowAnonymous", JSON.stringify(fbSettings !== false));
      } catch (err) {
        console.warn("Fallo al obtener configuración de anonimato desde Firestore:", err);
      }
      
      // 1. Try Firestore first
      const fbQuestions = await getQuestionsFromFirestore();
      const fbWebhook = await getWebhookFromFirestore();
      
      if (fbQuestions && Array.isArray(fbQuestions) && fbQuestions.length > 0) {
        setQuestions(fbQuestions);
        setWebhookUrl(fbWebhook || "");
        localStorage.setItem("survey_questions", JSON.stringify(fbQuestions));
        localStorage.setItem("survey_webhookUrl", fbWebhook || "");
        setError(null);
        return;
      }
      
      // 2. Try the Express backend next
      const res = await fetch("/api/survey");
      if (res.ok) {
        const data = await res.json();
        const loadedQs = data.questions || [];
        const loadedWebhook = data.webhookUrl || "";
        setQuestions(loadedQs);
        setWebhookUrl(loadedWebhook);
        localStorage.setItem("survey_questions", JSON.stringify(loadedQs));
        localStorage.setItem("survey_webhookUrl", loadedWebhook);

        // Also fetch allowAnonymous setting from backend
        try {
          const settingsRes = await fetch("/api/survey/settings");
          if (settingsRes.ok) {
            const settingsData = await settingsRes.json();
            setAllowAnonymous(settingsData.allowAnonymous !== false);
            localStorage.setItem("survey_allowAnonymous", JSON.stringify(settingsData.allowAnonymous !== false));
          }
        } catch {}

        setError(null);
        return;
      }
      
      throw new Error("No se pudo obtener la configuración de la encuesta.");
    } catch (err: any) {
      console.warn("Fallo al conectar con Firestore/servidor, iniciando en modo offline (respaldo local):", err);
      
      // Load from fallback
      const cachedQs = localStorage.getItem("survey_questions");
      const cachedWebhook = localStorage.getItem("survey_webhookUrl") || "";
      const cachedAnon = localStorage.getItem("survey_allowAnonymous");

      if (cachedQs) {
        try {
          setQuestions(JSON.parse(cachedQs));
        } catch {
          setQuestions(DEFAULT_QUESTIONS);
        }
      } else {
        setQuestions(DEFAULT_QUESTIONS);
      }
      setWebhookUrl(cachedWebhook);

      if (cachedAnon) {
        try {
          setAllowAnonymous(JSON.parse(cachedAnon) !== false);
        } catch {
          setAllowAnonymous(true);
        }
      } else {
        setAllowAnonymous(true);
      }

      setError(null); // Clear error, we work in offline fallback mode!
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSurveyConfig();
  }, []);

  const handleLogin = async (name: string, adminMode: boolean) => {
    setUserName(name);
    setIsAdmin(adminMode);

    if (adminMode) {
      // If admin, load the responses right away
      try {
        // 1. Try Firebase Firestore first
        const fbResponses = await getResponsesFromFirestore();
        if (fbResponses && fbResponses.length > 0) {
          setResponses(fbResponses);
          localStorage.setItem("survey_responses", JSON.stringify(fbResponses));
          return;
        }

        // 2. Fall back to local Express backend if no firebase responses or failed
        const res = await fetch("/api/survey/responses");
        if (res.ok) {
          const data = await res.json();
          setResponses(data);
          localStorage.setItem("survey_responses", JSON.stringify(data));
        } else {
          throw new Error();
        }
      } catch (err) {
        console.warn("Error fetching admin responses on login, using cache:", err);
        const cachedResp = localStorage.getItem("survey_responses");
        if (cachedResp) {
          try {
            setResponses(JSON.parse(cachedResp));
          } catch {
            setResponses([]);
          }
        }
      }
    }
  };

  const handleExit = () => {
    setUserName(null);
    setIsAdmin(false);
  };

  const handleSurveySubmit = async (answers: Record<string, any>): Promise<boolean> => {
    if (!userName) return false;

    // Preemptively append to offline responses
    const newResponse: Response = {
      id: "resp_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
      userName,
      answers,
      timestamp: new Date().toISOString()
    };

    const cachedStr = localStorage.getItem("survey_responses");
    let cachedList: Response[] = [];
    if (cachedStr) {
      try { cachedList = JSON.parse(cachedStr); } catch {}
    }
    cachedList.push(newResponse);
    localStorage.setItem("survey_responses", JSON.stringify(cachedList));

    try {
      // 1. Direct write to Firebase Firestore
      await saveResponseToFirestore(userName, answers);
    } catch (fbErr) {
      console.warn("No se pudo guardar la respuesta directamente en Firebase:", fbErr);
    }

    try {
      // 2. Also try local Express server
      await fetch("/api/survey/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userName, answers })
      });
    } catch (err) {
      console.warn("No se pudo enviar la encuesta al servidor local, se guardó localmente y Firebase:", err);
    }
    return true; // Return true as it was successfully stored
  };

  const handleSaveQuestions = async (newQuestions: Question[]): Promise<boolean> => {
    setQuestions(newQuestions);
    localStorage.setItem("survey_questions", JSON.stringify(newQuestions));

    try {
      // 1. Save to Firebase
      await saveQuestionsToFirestore(newQuestions);
    } catch (fbErr) {
      console.warn("Error guardando preguntas en Firebase:", fbErr);
    }

    try {
      // 2. Try Express server
      await fetch("/api/survey/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions: newQuestions })
      });
    } catch (err) {
      console.warn("Error saving questions to local server, saved locally and Firebase:", err);
    }
    return true;
  };

  const handleSaveWebhook = async (url: string): Promise<boolean> => {
    setWebhookUrl(url);
    localStorage.setItem("survey_webhookUrl", url);

    try {
      // 1. Save to Firebase
      await saveWebhookToFirestore(url);
    } catch (fbErr) {
      console.warn("Error guardando webhook en Firebase:", fbErr);
    }

    try {
      // 2. Try Express server
      await fetch("/api/survey/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhookUrl: url })
      });
    } catch (err) {
      console.warn("Error saving webhook configuration to local server, saved locally and Firebase:", err);
    }
    return true;
  };

  const handleSaveSettings = async (anonEnabled: boolean): Promise<boolean> => {
    setAllowAnonymous(anonEnabled);
    localStorage.setItem("survey_allowAnonymous", JSON.stringify(anonEnabled));

    try {
      // 1. Save to Firebase
      await saveSettingsToFirestore(anonEnabled);
    } catch (fbErr) {
      console.warn("Error guardando configuración en Firebase:", fbErr);
    }

    try {
      // 2. Try Express server
      await fetch("/api/survey/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allowAnonymous: anonEnabled })
      });
    } catch (err) {
      console.warn("Error saving settings to local server, saved locally and Firebase:", err);
    }
    return true;
  };

  const handleTestWebhook = async (url: string): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await fetch("/api/survey/webhook/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhookUrl: url })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return { success: true, message: data.message };
      } else {
        return { success: false, message: data.error || "Fallo en la prueba del webhook." };
      }
    } catch (err: any) {
      return { success: false, message: `Error de conexión: ${err.message}` };
    }
  };

  const handleClearResponses = async (): Promise<boolean> => {
    setResponses([]);
    localStorage.removeItem("survey_responses");

    try {
      // 1. Clear from Firebase
      await clearResponsesFromFirestore();
    } catch (fbErr) {
      console.warn("Error borrando respuestas de Firebase:", fbErr);
    }

    try {
      // 2. Try Express server
      await fetch("/api/survey/responses/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
    } catch (err) {
      console.warn("Error clearing responses from local server, cleared locally and Firebase:", err);
    }
    return true;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-purple-600 animate-spin" />
          <p className="text-sm font-semibold text-slate-600">Iniciando plataforma empresarial...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-rose-100 max-w-md text-center space-y-4">
          <div className="w-12 h-12 bg-rose-50 border border-rose-100 rounded-full flex items-center justify-center text-rose-500 mx-auto">
            <HelpCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">Error de Conexión</h2>
          <p className="text-slate-500 text-sm leading-relaxed">{error}</p>
          <button
            onClick={fetchSurveyConfig}
            className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-xl text-sm shadow transition-all"
          >
            Reintentar Conexión
          </button>
        </div>
      </div>
    );
  }

  // Router View Selection
  if (!userName) {
    return (
      <>
        <StatusIndicator />
        <LoginScreen onLogin={handleLogin} allowAnonymous={allowAnonymous} />
      </>
    );
  }

  if (isAdmin) {
    return (
      <>
        <StatusIndicator />
        <AdminDashboard
          initialQuestions={questions}
          initialResponses={responses}
          initialWebhookUrl={webhookUrl}
          initialAllowAnonymous={allowAnonymous}
          onSaveQuestions={handleSaveQuestions}
          onSaveWebhook={handleSaveWebhook}
          onSaveSettings={handleSaveSettings}
          onTestWebhook={handleTestWebhook}
          onClearResponses={handleClearResponses}
          onExit={handleExit}
        />
      </>
    );
  }

  return (
    <>
      <StatusIndicator />
      <SurveyScreen
        userName={userName}
        questions={questions}
        onSubmit={handleSurveySubmit}
        onExit={handleExit}
      />
    </>
  );
}
