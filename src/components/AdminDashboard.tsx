import React, { useState, useEffect } from "react";
import { Question, Response, SurveyTemplate } from "../types";
import { motion } from "motion/react";
import {
  Download,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  BarChart3,
  Settings,
  Database,
  RefreshCw,
  LogOut,
  Sliders,
  Check,
  Play,
  FileSpreadsheet,
  Trash,
  HelpCircle,
  Bookmark,
  Save
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from "recharts";

interface AdminDashboardProps {
  initialQuestions: Question[];
  initialResponses: Response[];
  initialWebhookUrl: string;
  initialAllowAnonymous: boolean;
  onSaveQuestions: (questions: Question[]) => Promise<boolean>;
  onSaveWebhook: (url: string) => Promise<boolean>;
  onSaveSettings: (allowAnonymous: boolean) => Promise<boolean>;
  onTestWebhook: (url: string) => Promise<{ success: boolean; message: string }>;
  onClearResponses: () => Promise<boolean>;
  onExit: () => void;
}

export default function AdminDashboard({
  initialQuestions,
  initialResponses,
  initialWebhookUrl,
  initialAllowAnonymous,
  onSaveQuestions,
  onSaveWebhook,
  onSaveSettings,
  onTestWebhook,
  onClearResponses,
  onExit
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<"questions" | "responses" | "analytics" | "excel" | "templates">("questions");
  const [questions, setQuestions] = useState<Question[]>(initialQuestions);
  const [responses, setResponses] = useState<Response[]>(initialResponses);
  const [webhookUrl, setWebhookUrl] = useState(initialWebhookUrl);
  const [allowAnonymous, setAllowAnonymous] = useState(initialAllowAnonymous);
  const [isSavingQuestions, setIsSavingQuestions] = useState(false);
  const [isSavingWebhook, setIsSavingWebhook] = useState(false);
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);
  const [webhookResult, setWebhookResult] = useState<{ success?: boolean; msg?: string } | null>(null);
  const [searchName, setSearchName] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");

  // Template states
  const [templates, setTemplates] = useState<SurveyTemplate[]>([]);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateDesc, setTemplateDesc] = useState("");
  const [templateSuccessMsg, setTemplateSuccessMsg] = useState("");

  // New Question Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [newQTitle, setNewQTitle] = useState("");
  const [newQDescription, setNewQDescription] = useState("");
  const [newQType, setNewQType] = useState<"text" | "single" | "multiple" | "rating">("text");
  const [newQRequired, setNewQRequired] = useState(true);
  const [newQOptionsString, setNewQOptionsString] = useState("");

  // Reload responses from server to get updates
  const fetchLatestResponses = async () => {
    try {
      const res = await fetch("/api/survey/responses");
      if (res.ok) {
        const data = await res.json();
        setResponses(data);
        localStorage.setItem("survey_responses", JSON.stringify(data));
      } else {
        throw new Error();
      }
    } catch (e) {
      console.warn("Fallo temporal de conexión al actualizar respuestas, usando caché local:", e);
      const cached = localStorage.getItem("survey_responses");
      if (cached) {
        try {
          setResponses(JSON.parse(cached));
        } catch {}
      }
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await fetch("/api/survey/templates");
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
        localStorage.setItem("survey_templates", JSON.stringify(data));
      } else {
        throw new Error();
      }
    } catch (e) {
      console.warn("Error al cargar plantillas, usando caché local:", e);
      const cached = localStorage.getItem("survey_templates");
      if (cached) {
        try {
          setTemplates(JSON.parse(cached));
        } catch {}
      }
    }
  };

  useEffect(() => {
    fetchLatestResponses();
    fetchTemplates();
    const interval = setInterval(fetchLatestResponses, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const handleSaveCurrentAsTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateName.trim()) return;
    setIsSavingTemplate(true);

    const newTemplate: SurveyTemplate = {
      id: "temp_" + Math.random().toString(36).substring(2, 11),
      name: templateName,
      description: templateDesc,
      questions: [...questions],
      createdAt: new Date().toISOString()
    };

    // Preemptively save to local state and localStorage
    const updatedTemplates = [...templates, newTemplate];
    setTemplates(updatedTemplates);
    localStorage.setItem("survey_templates", JSON.stringify(updatedTemplates));

    setTemplateName("");
    setTemplateDesc("");
    setTemplateSuccessMsg("¡Plantilla guardada con éxito!");
    setTimeout(() => setTemplateSuccessMsg(""), 4000);

    try {
      const res = await fetch("/api/survey/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newTemplate.name,
          description: newTemplate.description,
          questions: newTemplate.questions
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.template) {
          const synced = updatedTemplates.map(t => t.id === newTemplate.id ? data.template : t);
          setTemplates(synced);
          localStorage.setItem("survey_templates", JSON.stringify(synced));
        }
      }
    } catch (e) {
      console.warn("Error saving template to server, saved locally:", e);
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleApplyTemplate = async (template: SurveyTemplate) => {
    if (window.confirm(`¿Está seguro de que desea aplicar la plantilla "${template.name}"? Esto REEMPLAZARÁ todas sus preguntas activas actuales.`)) {
      setQuestions(template.questions);
      // Automatically save to the active list
      setIsSavingQuestions(true);
      const success = await onSaveQuestions(template.questions);
      setIsSavingQuestions(false);
      if (success) {
        alert("¡Plantilla aplicada y guardada como cuestionario activo!");
      } else {
        alert("Se aplicó la plantilla al cuestionario activo, pero no se pudo persistir en el servidor.");
      }
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (window.confirm("¿Está seguro de que desea eliminar esta plantilla permanentemente?")) {
      const updatedTemplates = templates.filter((t) => t.id !== id);
      setTemplates(updatedTemplates);
      localStorage.setItem("survey_templates", JSON.stringify(updatedTemplates));

      try {
        await fetch(`/api/survey/templates/${id}`, {
          method: "DELETE"
        });
      } catch (e) {
        console.warn("Error deleting template from server, deleted locally:", e);
      }
    }
  };

  // Format date helper
  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  // Question sorting/moving helpers
  const moveQuestion = (index: number, direction: "up" | "down") => {
    const updated = [...questions];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= questions.length) return;

    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setQuestions(updated);
  };

  const deleteQuestion = (id: string) => {
    setQuestions(questions.filter((q) => q.id !== id));
  };

  const handleAddQuestionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQTitle.trim()) return;

    const options = newQOptionsString
      .split("\n")
      .map((opt) => opt.trim())
      .filter((opt) => opt.length > 0);

    const newQ: Question = {
      id: "q_" + Math.random().toString(36).substring(2, 11),
      title: newQTitle,
      description: newQDescription || undefined,
      type: newQType,
      required: newQRequired,
      options: ["single", "multiple"].includes(newQType) ? options : undefined
    };

    setQuestions([...questions, newQ]);

    // Reset Form
    setNewQTitle("");
    setNewQDescription("");
    setNewQType("text");
    setNewQRequired(true);
    setNewQOptionsString("");
    setShowAddForm(false);
  };

  const handleSaveQuestionsClick = async () => {
    setIsSavingQuestions(true);
    setSaveStatus("idle");
    const success = await onSaveQuestions(questions);
    if (success) {
      setSaveStatus("success");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } else {
      setSaveStatus("error");
    }
    setIsSavingQuestions(false);
  };

  const handleSaveWebhookClick = async () => {
    setIsSavingWebhook(true);
    const success = await onSaveWebhook(webhookUrl);
    if (success) {
      setWebhookResult({ success: true, msg: "Webhook guardado correctamente para sincronización." });
    } else {
      setWebhookResult({ success: false, msg: "No se pudo guardar la configuración del Webhook." });
    }
    setIsSavingWebhook(false);
    setTimeout(() => setWebhookResult(null), 4000);
  };

  const handleTestWebhookClick = async () => {
    if (!webhookUrl) {
      setWebhookResult({ success: false, msg: "Ingrese una URL válida antes de realizar la prueba." });
      return;
    }
    setIsTestingWebhook(true);
    const res = await onTestWebhook(webhookUrl);
    setWebhookResult({ success: res.success, msg: res.message });
    setIsTestingWebhook(false);
  };

  const handleClearAllResponsesClick = async () => {
    if (window.confirm("¿Está seguro de que desea eliminar todas las respuestas recibidas? Esta acción es irreversible.")) {
      const success = await onClearResponses();
      if (success) {
        setResponses([]);
      }
    }
  };

  // CSV Generator for Excel download (Spanish-friendly using UTF-8 with BOM)
  const downloadExcelCSV = () => {
    if (responses.length === 0) {
      alert("No hay respuestas disponibles para descargar.");
      return;
    }

    // Header definition
    const headers = ["ID de Respuesta", "Nombre del Participante", "Fecha y Hora"];
    questions.forEach((q) => {
      headers.push(q.title);
    });

    // Generate CSV rows
    const csvRows = [headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(";")];

    responses.forEach((res) => {
      const row = [res.id, res.userName, formatDate(res.timestamp)];
      questions.forEach((q) => {
        const ans = res.answers[q.id];
        let cellVal = "";
        if (ans !== undefined && ans !== null) {
          if (Array.isArray(ans)) {
            cellVal = ans.join(", ");
          } else {
            cellVal = String(ans);
          }
        }
        row.push(cellVal);
      });
      csvRows.push(row.map((val) => `"${val.replace(/"/g, '""')}"`).join(";"));
    });

    // Excel friendly CSV encoding (UTF-8 with BOM: \uFEFF)
    const csvContent = "\uFEFF" + csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Respuestas_Encuesta_Corporativa_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered Responses
  const filteredResponses = responses.filter((res) =>
    res.userName.toLowerCase().includes(searchName.toLowerCase())
  );

  // Stats / Analytics Calculations
  const getQuestionStats = (q: Question) => {
    if (q.type === "rating") {
      const validAnswers = responses
        .map((r) => r.answers[q.id])
        .filter((val) => val !== undefined && val !== null) as number[];

      const total = validAnswers.length;
      const sum = validAnswers.reduce((a, b) => a + b, 0);
      const avg = total > 0 ? (sum / total).toFixed(1) : "0.0";

      // Distribution count
      const distribution = [1, 2, 3, 4, 5].map((star) => ({
        name: `${star} ⭐`,
        cantidad: validAnswers.filter((v) => v === star).length
      }));

      return { avg, total, distribution };
    }

    if (["single", "multiple"].includes(q.type)) {
      const counts: Record<string, number> = {};
      // Initialize counts
      q.options?.forEach((opt) => {
        counts[opt] = 0;
      });

      responses.forEach((r) => {
        const ans = r.answers[q.id];
        if (ans) {
          if (Array.isArray(ans)) {
            ans.forEach((val) => {
              counts[val] = (counts[val] || 0) + 1;
            });
          } else {
            counts[ans] = (counts[ans] || 0) + 1;
          }
        }
      });

      const data = Object.entries(counts).map(([name, value]) => ({
        name: name.length > 25 ? name.substring(0, 22) + "..." : name,
        votos: value
      }));

      return { data };
    }

    return null;
  };

  return (
    <div id="admin-dashboard-wrapper" className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans">
      {/* Sidebar for Navigation */}
      <aside className="w-full md:w-64 bg-slate-900 text-slate-200 p-6 flex flex-col justify-between border-r border-slate-800">
        <div>
          <div className="flex items-center gap-3 mb-8 border-b border-slate-800 pb-5">
            <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center font-bold text-white shadow-[0_2px_10px_rgb(0,0,0,0.1)]">
              M
            </div>
            <div>
              <h2 className="font-bold text-white text-base leading-tight">Panel Editor</h2>
              <span className="text-xs text-slate-400 font-semibold tracking-wider uppercase">ADMINISTRACIÓN</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab("questions")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                activeTab === "questions"
                  ? "bg-purple-600 text-white shadow-md shadow-purple-900/20"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Sliders className="w-4 h-4" />
              Editar Preguntas
            </button>

            <button
              onClick={() => setActiveTab("templates")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                activeTab === "templates"
                  ? "bg-purple-600 text-white shadow-md shadow-purple-900/20"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Bookmark className="w-4 h-4" />
              Plantillas de Encuestas
              {templates.length > 0 && (
                <span className={`ml-auto px-2 py-0.5 rounded-full text-xs font-bold border transition-colors ${
                  activeTab === "templates"
                    ? "bg-white/20 text-white border-white/30"
                    : "bg-slate-800 text-slate-300 border-slate-700"
                }`}>
                  {templates.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("responses")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                activeTab === "responses"
                  ? "bg-purple-600 text-white shadow-md shadow-purple-900/20"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Database className="w-4 h-4" />
              Respuestas Recibidas
              {responses.length > 0 && (
                <span className={`ml-auto px-2 py-0.5 rounded-full text-xs font-bold border transition-colors ${
                  activeTab === "responses"
                    ? "bg-white/20 text-white border-white/30"
                    : "bg-slate-800 text-slate-300 border-slate-700"
                }`}>
                  {responses.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("analytics")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                activeTab === "analytics"
                  ? "bg-purple-600 text-white shadow-md shadow-purple-900/20"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Estadísticas Visuales
            </button>

            <button
              onClick={() => setActiveTab("excel")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                activeTab === "excel"
                  ? "bg-purple-600 text-white shadow-md shadow-purple-900/20"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              Conexión Excel / Sheets
            </button>
          </nav>
        </div>

        {/* User Session Info / Exit */}
        <div className="pt-6 border-t border-slate-800 space-y-4">
          <div className="text-xs text-slate-400 font-medium">
            Modo Edición Activado
          </div>
          <button
            onClick={onExit}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white rounded-xl text-sm font-medium transition-all"
          >
            <LogOut className="w-4 h-4" />
            Salir de Administración
          </button>
        </div>
      </aside>

      {/* Main Panel Area */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        {/* Title and Top Actions */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5 mb-8">
          <div>
            <span className="text-xs font-bold text-slate-400 tracking-wider uppercase">Plataforma Empresarial</span>
            <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight mt-1">
              {activeTab === "questions" && "Diseñador de Preguntas"}
              {activeTab === "responses" && "Visor de Respuestas"}
              {activeTab === "analytics" && "Analíticas e Indicadores Clave"}
              {activeTab === "excel" && "Integración con Excel y Google Sheets"}
              {activeTab === "templates" && "Gestor de Plantillas de Encuestas"}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchLatestResponses}
              className="p-2 text-slate-500 hover:text-slate-700 bg-white border border-slate-200 rounded-xl hover:shadow-sm transition-all"
              title="Sincronizar Datos"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <button
              onClick={downloadExcelCSV}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl text-sm shadow-[0_2px_10px_rgb(0,0,0,0.02)] hover:shadow-[0_4px_20px_rgb(0,0,0,0.04)] transition-all"
            >
              <Download className="w-4 h-4" />
              Descargar Excel (CSV)
            </button>
          </div>
        </header>

        {/* Tab 1: Questions Editor */}
        {activeTab === "questions" && (
          <div className="space-y-6">
            {/* Global Access & Privacy Card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-1">
                  <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-purple-600" />
                    Acceso y Privacidad de la Encuesta
                  </h3>
                  <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
                    Controle las opciones del portal de inicio. Permita que los colaboradores realicen la encuesta de forma anónima o exija que introduzcan su nombre completo para poder responder.
                  </p>
                </div>
                
                <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-xl border border-slate-200/60 shrink-0 w-full md:w-auto justify-between">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-700">Permitir Encuestas Anónimas</span>
                    <span className="text-[10px] text-slate-400 font-medium">Habilita opción "Anónimo" al ingresar</span>
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => {
                      const newValue = !allowAnonymous;
                      setAllowAnonymous(newValue);
                      onSaveSettings(newValue);
                    }}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      allowAnonymous ? "bg-purple-600" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        allowAnonymous ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h3 className="font-bold text-slate-800 text-base">Estructura del Cuestionario</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Modifique, ordene, agregue o elimine las preguntas que ven los participantes al iniciar.
                </p>
              </div>
              <div className="flex items-center gap-3 w-full md:w-auto">
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-xl text-sm shadow transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Nueva Pregunta
                </button>

                <button
                  onClick={handleSaveQuestionsClick}
                  disabled={isSavingQuestions}
                  className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-xl text-sm shadow transition-all disabled:opacity-50"
                >
                  {isSavingQuestions ? "Guardando..." : "Guardar Cambios"}
                  {saveStatus === "success" && <Check className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Save Status Notification */}
            {saveStatus === "success" && (
              <div className="p-4 bg-slate-50 border border-slate-200 text-emerald-800 rounded-xl text-sm font-medium flex items-center gap-2">
                <Check className="w-5 h-5 text-slate-700" />
                ¡Cuestionario guardado con éxito! Las preguntas ya se encuentran actualizadas para todos los participantes.
              </div>
            )}

            {/* Add New Question Inline Drawer/Form */}
            {showAddForm && (
              <motion.form
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                onSubmit={handleAddQuestionSubmit}
                className="bg-white p-6 rounded-2xl border-2 border-slate-200 shadow-[0_2px_10px_rgb(0,0,0,0.02)] space-y-4"
              >
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <h4 className="font-bold text-slate-800 text-sm">Nueva Pregunta del Formulario</h4>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="text-xs text-slate-400 hover:text-slate-600 font-medium"
                  >
                    Cancelar
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Título / Pregunta</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. ¿Qué opina sobre..."
                      className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-zinc-700 focus:outline-none"
                      value={newQTitle}
                      onChange={(e) => setNewQTitle(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 font-sans">Tipo de Entrada</label>
                    <select
                      className="w-full p-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:ring-1 focus:ring-zinc-700 focus:outline-none"
                      value={newQType}
                      onChange={(e) => setNewQType(e.target.value as any)}
                    >
                      <option value="text">Texto Libre (Respuesta corta/larga)</option>
                      <option value="single">Selección Única (Botones de opción)</option>
                      <option value="multiple">Selección Múltiple (Casillas)</option>
                      <option value="rating">Calificación de Estrellas (1-5 ⭐)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Descripción / Instrucción adicional (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Ej. Explique brevemente o brinde detalles..."
                    className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-zinc-700 focus:outline-none"
                    value={newQDescription}
                    onChange={(e) => setNewQDescription(e.target.value)}
                  />
                </div>

                {["single", "multiple"].includes(newQType) && (
                  <div className="space-y-1.5 bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                      <span>Opciones (Una opción por línea)</span>
                      <span className="text-[10px] font-normal text-slate-900 uppercase">Requerido</span>
                    </label>
                    <textarea
                      rows={3}
                      required
                      placeholder="Ej.&#10;Excelente&#10;Bueno&#10;Regular&#10;Malo"
                      className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-zinc-700 focus:outline-none bg-white"
                      value={newQOptionsString}
                      onChange={(e) => setNewQOptionsString(e.target.value)}
                    />
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newQRequired}
                      onChange={(e) => setNewQRequired(e.target.checked)}
                      className="rounded border-slate-300 text-slate-900 focus:ring-zinc-700"
                    />
                    Obligatorio responder esta pregunta
                  </label>

                  <button
                    type="submit"
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold shadow"
                  >
                    Añadir al Listado
                  </button>
                </div>
              </motion.form>
            )}

            {/* Questions List */}
            <div className="space-y-3">
              {questions.map((q, idx) => (
                <div
                  key={q.id}
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-start gap-4 hover:border-slate-300 transition-all"
                >
                  <div className="flex flex-col gap-1.5">
                    <button
                      onClick={() => moveQuestion(idx, "up")}
                      disabled={idx === 0}
                      className="p-1 rounded bg-slate-100 text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => moveQuestion(idx, "down")}
                      disabled={idx === questions.length - 1}
                      className="p-1 rounded bg-slate-100 text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex-grow">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold text-slate-400">#{idx + 1}</span>
                      <span className="text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-500">
                        {q.type === "text" && "Texto Libre"}
                        {q.type === "single" && "Opción Única"}
                        {q.type === "multiple" && "Opción Múltiple"}
                        {q.type === "rating" && "Evaluación ⭐"}
                      </span>
                      {q.required && (
                        <span className="text-[10px] font-semibold text-rose-500 uppercase bg-rose-50 px-1.5 rounded">Requerida</span>
                      )}
                    </div>

                    <div className="mt-2 space-y-1.5">
                      <input
                        type="text"
                        className="font-bold text-slate-800 text-sm md:text-base border-b border-transparent hover:border-slate-300 focus:border-zinc-700 focus:outline-none w-full py-0.5 bg-transparent"
                        value={q.title}
                        onChange={(e) => {
                          const updated = [...questions];
                          updated[idx].title = e.target.value;
                          setQuestions(updated);
                        }}
                      />
                      <input
                        type="text"
                        placeholder="Sin descripción adicional."
                        className="text-xs text-slate-500 border-b border-transparent hover:border-slate-300 focus:border-zinc-700 focus:outline-none w-full bg-transparent"
                        value={q.description || ""}
                        onChange={(e) => {
                          const updated = [...questions];
                          updated[idx].description = e.target.value || undefined;
                          setQuestions(updated);
                        }}
                      />
                    </div>

                    {["single", "multiple"].includes(q.type) && q.options && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {q.options.map((opt, oIdx) => (
                          <span key={oIdx} className="text-xs font-medium bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-lg text-slate-600">
                            {opt}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => deleteQuestion(q.id)}
                    className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                    title="Eliminar Pregunta"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Responses Viewer */}
        {activeTab === "responses" && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="relative w-full md:max-w-xs">
                <input
                  type="text"
                  placeholder="Buscar por participante..."
                  className="w-full pl-3 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-1 focus:ring-zinc-700 focus:outline-none"
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                <span className="text-xs text-slate-500 font-medium">
                  Mostrando {filteredResponses.length} de {responses.length} respuestas
                </span>
                <button
                  onClick={handleClearAllResponsesClick}
                  className="ml-auto flex items-center gap-1 text-xs text-rose-500 hover:text-rose-700 hover:bg-rose-50 border border-rose-100 px-3 py-2 rounded-xl transition-all"
                >
                  <Trash className="w-3.5 h-3.5" />
                  Limpiar Datos
                </button>
              </div>
            </div>

            {filteredResponses.length === 0 ? (
              <div className="bg-white p-12 text-center rounded-2xl border border-slate-100">
                <Database className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h4 className="font-bold text-slate-700">No se encontraron respuestas</h4>
                <p className="text-slate-500 text-sm mt-1">
                  Tan pronto los participantes envíen sus encuestas, se registrarán en tiempo real en este panel.
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase">
                        <th className="p-4 w-48">Participante</th>
                        <th className="p-4 w-40">Fecha y Hora</th>
                        {questions.map((q) => (
                          <th key={q.id} className="p-4 min-w-[150px] font-sans">
                            {q.title}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 text-sm text-slate-700">
                      {filteredResponses.map((res) => (
                        <tr key={res.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="p-4 font-bold text-slate-800">
                            {res.userName}
                          </td>
                          <td className="p-4 text-xs text-slate-500">
                            {formatDate(res.timestamp)}
                          </td>
                          {questions.map((q) => {
                            const val = res.answers[q.id];
                            return (
                              <td key={q.id} className="p-4">
                                {val !== undefined && val !== null ? (
                                  Array.isArray(val) ? (
                                    <div className="flex flex-wrap gap-1">
                                      {val.map((item, idx) => (
                                        <span key={idx} className="bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded font-medium">
                                          {item}
                                        </span>
                                      ))}
                                    </div>
                                  ) : q.type === "rating" ? (
                                    <span className="font-semibold text-amber-500 flex items-center gap-1">
                                      {val} <span className="text-xs">⭐</span>
                                    </span>
                                  ) : (
                                    <span className="line-clamp-2">{val}</span>
                                  )
                                ) : (
                                  <span className="text-slate-300">—</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Analytics & Charts */}
        {activeTab === "analytics" && (
          <div className="space-y-8">
            {responses.length === 0 ? (
              <div className="bg-white p-12 text-center rounded-2xl border border-slate-100">
                <BarChart3 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h4 className="font-bold text-slate-700 font-sans">Sin Datos para Gráficos</h4>
                <p className="text-slate-500 text-sm mt-1">
                  Se requieren envíos de encuestas para compilar y graficar los indicadores empresariales automáticamente.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-8">
                {questions.map((q, idx) => {
                  const stats = getQuestionStats(q);
                  if (!stats) {
                    // Text questions can just display a list of recent feedback quotes
                    const textResponses = responses
                      .map((r) => ({ name: r.userName, text: r.answers[q.id] }))
                      .filter((item) => item.text && item.text.trim().length > 0);

                    return (
                      <div key={q.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="border-b border-slate-100 pb-3 mb-4">
                          <span className="text-xs font-bold text-slate-700 uppercase">Respuesta de Texto Libre</span>
                          <h4 className="font-bold text-slate-800 text-base mt-1">#{idx + 1}: {q.title}</h4>
                        </div>
                        {textResponses.length === 0 ? (
                          <p className="text-sm text-slate-400 italic">No se han ingresado comentarios para esta pregunta.</p>
                        ) : (
                          <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                            {textResponses.map((tr, tIdx) => (
                              <div key={tIdx} className="bg-slate-50 p-3 rounded-xl border border-slate-100/70 text-sm text-slate-700">
                                <p className="font-medium text-slate-800 mb-1">{tr.name}</p>
                                <p className="text-slate-600 italic">"{tr.text}"</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  }

                  // Render Star ratings or option charts
                  if (q.type === "rating" && stats.distribution) {
                    return (
                      <div key={q.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="flex flex-col justify-center items-center md:border-r border-slate-100 md:pr-6">
                          <span className="text-xs font-bold text-slate-700 uppercase">Satisfacción Promedio</span>
                          <div className="text-5xl font-extrabold text-slate-800 mt-2 flex items-baseline gap-1.5">
                            {stats.avg}
                            <span className="text-lg text-slate-400 font-normal">/ 5.0</span>
                          </div>
                          <div className="flex gap-1 mt-2 text-amber-400">
                            {Array.from({ length: 5 }).map((_, sIdx) => (
                              <span key={sIdx} className="text-lg">
                                {sIdx < Math.round(Number(stats.avg)) ? "★" : "☆"}
                              </span>
                            ))}
                          </div>
                          <span className="text-xs text-slate-400 mt-2">{stats.total} opiniones recolectadas</span>
                        </div>

                        <div className="col-span-2 h-56">
                          <h4 className="font-bold text-slate-800 text-sm mb-3">#{idx + 1}: {q.title} - Distribución</h4>
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.distribution}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                              <XAxis dataKey="name" fontSize={11} stroke="#94a3b8" />
                              <YAxis allowDecimals={false} fontSize={11} stroke="#94a3b8" />
                              <Tooltip cursor={{ fill: "#f8fafc" }} />
                              <Bar dataKey="cantidad" radius={[4, 4, 0, 0]}>
                                {stats.distribution.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={["#9333ea", "#3b82f6", "#10b981", "#fbbf24", "#ec4899"][index]} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    );
                  }

                  if (["single", "multiple"].includes(q.type) && stats.data) {
                    return (
                      <div key={q.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-72">
                        <div className="flex justify-between items-center mb-4">
                          <div>
                            <span className="text-xs font-bold text-slate-700 uppercase">Resultados de Opción Única/Múltiple</span>
                            <h4 className="font-bold text-slate-800 text-sm mt-0.5">#{idx + 1}: {q.title}</h4>
                          </div>
                        </div>
                        <div className="h-48">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.data} layout="vertical">
                              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                              <XAxis type="number" allowDecimals={false} fontSize={11} stroke="#94a3b8" />
                              <YAxis dataKey="name" type="category" width={110} fontSize={10} stroke="#94a3b8" />
                              <Tooltip cursor={{ fill: "#f8fafc" }} />
                              <Bar dataKey="votos" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={16}>
                                {stats.data.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={index % 2 === 0 ? "#8b5cf6" : "#10b981"} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    );
                  }

                  return null;
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Excel Connection */}
        {activeTab === "excel" && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-slate-700" />
                Sincronización Avanzada con Microsoft Excel y Google Sheets
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Nuestra plataforma ofrece dos métodos eficientes y profesionales para enviar y analizar los datos directamente en sus planillas de cálculo, permitiendo un flujo continuo sin interrupciones.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Option A: Webhook Sync */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-extrabold uppercase bg-slate-50 text-slate-900 px-2 py-1 rounded">Método Automatizado</span>
                  <h4 className="font-bold text-slate-800 text-base mt-2.5">Sincronización por Webhook en Tiempo Real</h4>
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                    Vincule la encuesta con herramientas como <strong>Zapier, Make (Integromat) o Power Automate</strong>. Cada vez que un usuario responda la encuesta, se añadirá automáticamente una fila con todas las respuestas a su libro de Excel en la nube o Google Sheets.
                  </p>

                  <div className="mt-6 space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Webhook URL de Destino</label>
                      <input
                        type="url"
                        placeholder="https://hooks.zapier.com/hooks/catch/..."
                        className="w-full p-2.5 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-zinc-700 focus:outline-none"
                        value={webhookUrl}
                        onChange={(e) => setWebhookUrl(e.target.value)}
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveWebhookClick}
                        disabled={isSavingWebhook}
                        className="flex-1 py-2 px-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl text-xs transition-all disabled:opacity-50"
                      >
                        {isSavingWebhook ? "Guardando..." : "Guardar Configuración"}
                      </button>

                      <button
                        onClick={handleTestWebhookClick}
                        disabled={isTestingWebhook || !webhookUrl}
                        className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                        title="Enviar fila de prueba"
                      >
                        <Play className="w-3 h-3" />
                        Prueba
                      </button>
                    </div>
                  </div>
                </div>

                {webhookResult && (
                  <div className={`mt-4 p-3 rounded-lg text-xs font-medium border ${
                    webhookResult.success ? "bg-slate-50 border-slate-200 text-emerald-800" : "bg-rose-50 border-rose-200 text-rose-800"
                  }`}>
                    {webhookResult.msg}
                  </div>
                )}
              </div>

              {/* Option B: Direct CSV Export */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-extrabold uppercase bg-slate-50 text-slate-900 px-2 py-1 rounded">Descarga Directa</span>
                  <h4 className="font-bold text-slate-800 text-base mt-2.5">Descarga Manual de Archivo Excel</h4>
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                    Si prefiere no automatizar, simplemente descargue un archivo CSV formateado con separadores de punto y coma (;) y codificación compatible con español europeo y latinoamericano (UTF-8 con BOM). Microsoft Excel lo abrirá perfectamente con doble clic, separando cada respuesta en una columna individual de forma automática.
                  </p>

                  <div className="mt-8 p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-2">
                    <h5 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5 text-slate-700" />
                      ¿Cómo abrirlo en Microsoft Excel?
                    </h5>
                    <ol className="text-[11px] text-slate-500 list-decimal pl-4 space-y-1">
                      <li>Haga clic en el botón verde superior <strong>"Descargar Excel (CSV)"</strong>.</li>
                      <li>Abra el archivo descargado directamente con Excel.</li>
                      <li>¡Listo! Las columnas se alinean automáticamente según cada pregunta configurada.</li>
                    </ol>
                  </div>
                </div>

                <div className="mt-6 pt-4">
                  <button
                    onClick={downloadExcelCSV}
                    className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs shadow transition-all flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Descargar Respuestas Ahora
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Templates */}
        {activeTab === "templates" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Save current config card */}
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2 text-slate-900 mb-4">
                    <Save className="w-5 h-5" />
                    <h3 className="font-bold text-slate-800 text-base">Guardar Cuestionario Actual</h3>
                  </div>
                  
                  <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                    Guarde la combinación de preguntas que tiene configurada actualmente en el diseñador (<strong>{questions.length} preguntas</strong>) para poder restaurarla en el futuro con un solo clic.
                  </p>

                  <form onSubmit={handleSaveCurrentAsTemplate} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                        Nombre de la Plantilla <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ej. Encuesta de Clima Laboral Q3"
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-700 focus:border-zinc-700 placeholder-zinc-400"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                        Descripción Breve (Opcional)
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Ej. Plantilla estándar para medir la satisfacción interna y sugerencias de mejora."
                        value={templateDesc}
                        onChange={(e) => setTemplateDesc(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-700 focus:border-zinc-700 placeholder-zinc-400 resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSavingTemplate || questions.length === 0}
                      className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs shadow-[0_2px_10px_rgb(0,0,0,0.02)] hover:shadow-[0_4px_20px_rgb(0,0,0,0.04)] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isSavingTemplate ? "Guardando..." : "Guardar Preguntas Actuales"}
                    </button>
                  </form>

                  {templateSuccessMsg && (
                    <div className="mt-4 p-3 bg-slate-50 border border-slate-200 text-emerald-800 text-xs font-medium rounded-xl text-center">
                      {templateSuccessMsg}
                    </div>
                  )}
                </div>

                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/60">
                  <h4 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-slate-900" />
                    ¿Qué son las plantillas?
                  </h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Las plantillas le permiten almacenar listas predefinidas de preguntas. Esto le facilita alternar entre diferentes tipos de encuestas (por ejemplo, encuestas semanales, mensuales, específicas de clima u opinión) sin tener que rediseñar las preguntas de forma manual cada vez.
                  </p>
                </div>
              </div>

              {/* Saved templates list card */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm min-h-[400px]">
                  <h3 className="font-bold text-slate-800 text-base mb-1">Plantillas Guardadas Disponibles</h3>
                  <p className="text-xs text-slate-500 mb-6">
                    Haga clic en una plantilla para activarla y aplicarla al cuestionario actual.
                  </p>

                  {templates.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center mb-4 text-slate-400">
                        <Bookmark className="w-6 h-6" />
                      </div>
                      <h4 className="font-bold text-slate-700 text-sm">No hay plantillas guardadas</h4>
                      <p className="text-xs text-slate-400 max-w-sm mt-1 leading-relaxed">
                        Aún no ha guardado ninguna combinación de preguntas. Rellene el formulario de la izquierda para registrar su primera plantilla de encuesta.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {templates.map((template) => (
                        <div
                          key={template.id}
                          className="border border-zinc-150 rounded-2xl p-5 hover:border-purple-300 hover:shadow-sm transition-all flex flex-col justify-between bg-slate-50/35"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-[10px] font-extrabold uppercase bg-slate-50 text-slate-900 px-2 py-0.5 rounded-md">
                                {template.questions.length} {template.questions.length === 1 ? "pregunta" : "preguntas"}
                              </span>
                              <span className="text-[10px] text-slate-400 font-medium">
                                {formatDate(template.createdAt)}
                              </span>
                            </div>

                            <h4 className="font-bold text-slate-800 text-sm mt-3 line-clamp-1">
                              {template.name}
                            </h4>

                            {template.description && (
                              <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
                                {template.description}
                              </p>
                            )}

                            {/* Questions quick preview */}
                            <div className="mt-4 pt-3 border-t border-slate-100">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Vista previa de preguntas:</p>
                              <ul className="mt-1.5 space-y-1">
                                {template.questions.slice(0, 3).map((q, idx) => (
                                  <li key={q.id || idx} className="text-[11px] text-slate-600 truncate flex items-center gap-1">
                                    <span className="text-[9px] bg-slate-200 text-slate-600 w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 font-bold">{idx + 1}</span>
                                    <span className="truncate">{q.title}</span>
                                  </li>
                                ))}
                                {template.questions.length > 3 && (
                                  <li className="text-[10px] text-slate-900 font-medium pl-4">
                                    + {template.questions.length - 3} preguntas más...
                                  </li>
                                )}
                              </ul>
                            </div>
                          </div>

                          <div className="mt-6 pt-3 border-t border-slate-100 flex items-center gap-2">
                            <button
                              onClick={() => handleApplyTemplate(template)}
                              className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs shadow-sm transition-all flex items-center justify-center gap-1.5"
                            >
                              <Play className="w-3.5 h-3.5" />
                              Aplicar Plantilla
                            </button>

                            <button
                              onClick={() => handleDeleteTemplate(template.id)}
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-100 rounded-xl transition-all"
                              title="Eliminar Plantilla"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}
      </main>
    </div>
  );
}
