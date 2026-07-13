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
  Save,
  Pencil,
  X
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
  initialCompanyName?: string;
  onSaveQuestions: (questions: Question[]) => Promise<boolean>;
  onSaveWebhook: (url: string) => Promise<boolean>;
  onSaveSettings: (allowAnonymous: boolean, companyName?: string) => Promise<boolean>;
  onTestWebhook: (url: string) => Promise<{ success: boolean; message: string }>;
  onClearResponses: () => Promise<boolean>;
  onExit: () => void;
}

export default function AdminDashboard({
  initialQuestions,
  initialResponses,
  initialWebhookUrl,
  initialAllowAnonymous,
  initialCompanyName,
  onSaveQuestions,
  onSaveWebhook,
  onSaveSettings,
  onTestWebhook,
  onClearResponses,
  onExit
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<"questions" | "responses" | "templates" | "settings">("questions");
  const [questions, setQuestions] = useState<Question[]>(initialQuestions);
  const [responses, setResponses] = useState<Response[]>(initialResponses);
  const [webhookUrl, setWebhookUrl] = useState(initialWebhookUrl);
  const [allowAnonymous, setAllowAnonymous] = useState(initialAllowAnonymous);
  const [companyName, setCompanyName] = useState(initialCompanyName || "GROUP ULEP S.A.S");
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempCompanyName, setTempCompanyName] = useState(initialCompanyName || "GROUP ULEP S.A.S");
  const [isSavingQuestions, setIsSavingQuestions] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [showSettingsSuccess, setShowSettingsSuccess] = useState(false);
  const [isSavingWebhook, setIsSavingWebhook] = useState(false);
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);
  const [webhookResult, setWebhookResult] = useState<{ success?: boolean; msg?: string } | null>(null);
  const [searchName, setSearchName] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");

  useEffect(() => {
    if (initialCompanyName) {
      setCompanyName(initialCompanyName);
      setTempCompanyName(initialCompanyName);
    }
  }, [initialCompanyName]);

  const handleSaveGeneralSettings = async (overrideAnon?: boolean, overrideCompanyName?: string) => {
    setIsSavingSettings(true);
    const finalAnon = overrideAnon !== undefined ? overrideAnon : allowAnonymous;
    const finalName = overrideCompanyName !== undefined ? overrideCompanyName : companyName;
    const success = await onSaveSettings(finalAnon, finalName);
    setIsSavingSettings(false);
    if (success) {
      setCompanyName(finalName);
      setTempCompanyName(finalName);
      setShowSettingsSuccess(true);
      setTimeout(() => setShowSettingsSuccess(false), 3000);
      return true;
    }
    return false;
  };

  // Template states
  const [templates, setTemplates] = useState<SurveyTemplate[]>([]);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateDesc, setTemplateDesc] = useState("");
  const [templateSuccessMsg, setTemplateSuccessMsg] = useState("");
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(() => {
    return localStorage.getItem("survey_active_template_id") || null;
  });
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editTpl, setEditTpl] = useState<SurveyTemplate | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const isActiveTemplate = (template: SurveyTemplate) => {
    if (activeTemplateId !== null) {
      if (template.id !== activeTemplateId) return false;
    }
    const templateQuestions = template.questions;
    if (templateQuestions.length !== questions.length) return false;
    return templateQuestions.every((q, idx) => {
      const activeQ = questions[idx];
      if (!activeQ) return false;
      return (
        q.title === activeQ.title &&
        q.type === activeQ.type &&
        q.required === activeQ.required &&
        JSON.stringify(q.options) === JSON.stringify(activeQ.options)
      );
    });
  };

  const activeTemplate = templates.find(t => isActiveTemplate(t));

  // Auto-initialize activeTemplateId when templates or questions change
  useEffect(() => {
    if (templates.length > 0) {
      let currentActiveMatches = false;
      if (activeTemplateId) {
        const currentActive = templates.find(t => t.id === activeTemplateId);
        if (currentActive) {
          const match = currentActive.questions.length === questions.length &&
            currentActive.questions.every((q, idx) => {
              const activeQ = questions[idx];
              if (!activeQ) return false;
              return (
                q.title === activeQ.title &&
                q.type === activeQ.type &&
                q.required === activeQ.required &&
                JSON.stringify(q.options) === JSON.stringify(activeQ.options)
              );
            });
          if (match) {
            currentActiveMatches = true;
          }
        }
      }

      if (!currentActiveMatches) {
        const firstMatching = templates.find(t => {
          if (t.questions.length !== questions.length) return false;
          return t.questions.every((q, idx) => {
            const activeQ = questions[idx];
            if (!activeQ) return false;
            return (
              q.title === activeQ.title &&
              q.type === activeQ.type &&
              q.required === activeQ.required &&
              JSON.stringify(q.options) === JSON.stringify(activeQ.options)
            );
          });
        });
        if (firstMatching) {
          setActiveTemplateId(firstMatching.id);
          localStorage.setItem("survey_active_template_id", firstMatching.id);
        } else if (activeTemplateId !== null) {
          setActiveTemplateId(null);
          localStorage.removeItem("survey_active_template_id");
        }
      }
    }
  }, [templates, questions, activeTemplateId]);

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
    setQuestions(template.questions);
    setActiveTemplateId(template.id);
    localStorage.setItem("survey_active_template_id", template.id);
    
    // Automatically save to the active list
    setIsSavingQuestions(true);
    const success = await onSaveQuestions(template.questions);
    setIsSavingQuestions(false);
    if (success) {
      setTemplateSuccessMsg(`¡Cuestionario cambiado con éxito a la plantilla "${template.name}"!`);
      setTimeout(() => setTemplateSuccessMsg(""), 5000);
    } else {
      setTemplateSuccessMsg("Error al guardar la plantilla en el servidor.");
      setTimeout(() => setTemplateSuccessMsg(""), 5000);
    }
  };

  const executeDeleteTemplate = async (id: string) => {
    const updatedTemplates = templates.filter((t) => t.id !== id);
    setTemplates(updatedTemplates);
    localStorage.setItem("survey_templates", JSON.stringify(updatedTemplates));

    if (activeTemplateId === id) {
      setActiveTemplateId(null);
      localStorage.removeItem("survey_active_template_id");
    }

    try {
      await fetch(`/api/survey/templates/${id}`, {
        method: "DELETE"
      });
    } catch (e) {
      console.warn("Error deleting template from server, deleted locally:", e);
    }
  };

  const handleEditTemplateClick = (template: SurveyTemplate) => {
    setEditTpl(JSON.parse(JSON.stringify(template)));
  };

  const handleUpdateTemplateField = (field: keyof SurveyTemplate, value: any) => {
    if (!editTpl) return;
    setEditTpl({
      ...editTpl,
      [field]: value
    });
  };

  const handleUpdateTplQuestion = (idx: number, updatedQ: Question) => {
    if (!editTpl) return;
    const qs = [...editTpl.questions];
    qs[idx] = updatedQ;
    setEditTpl({ ...editTpl, questions: qs });
  };

  const handleAddTplQuestion = () => {
    if (!editTpl) return;
    const newQ: Question = {
      id: "q_" + Math.random().toString(36).substring(2, 11),
      title: "Nueva Pregunta",
      type: "text",
      required: true
    };
    setEditTpl({ ...editTpl, questions: [...editTpl.questions, newQ] });
  };

  const handleDeleteTplQuestion = (idx: number) => {
    if (!editTpl) return;
    const qs = editTpl.questions.filter((_, i) => i !== idx);
    setEditTpl({ ...editTpl, questions: qs });
  };

  const handleMoveTplQuestion = (idx: number, direction: "up" | "down") => {
    if (!editTpl) return;
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= editTpl.questions.length) return;
    const qs = [...editTpl.questions];
    const temp = qs[idx];
    qs[idx] = qs[targetIdx];
    qs[targetIdx] = temp;
    setEditTpl({ ...editTpl, questions: qs });
  };

  const handleSaveEditedTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTpl) return;
    if (!editTpl.name.trim()) return;

    try {
      const response = await fetch(`/api/survey/templates/${editTpl.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editTpl.name,
          description: editTpl.description,
          questions: editTpl.questions
        })
      });

      if (response.ok) {
        const result = await response.json();
        const updatedTemplate = result.template;
        
        const updatedList = templates.map((t) => t.id === editTpl.id ? updatedTemplate : t);
        setTemplates(updatedList);
        localStorage.setItem("survey_templates", JSON.stringify(updatedList));

        if (activeTemplateId === editTpl.id) {
          setQuestions(updatedTemplate.questions);
          await onSaveQuestions(updatedTemplate.questions);
        }

        setTemplateSuccessMsg(`¡Plantilla "${updatedTemplate.name}" editada correctamente!`);
        setTimeout(() => setTemplateSuccessMsg(""), 5000);
        setEditTpl(null);
      } else {
        alert("No se pudo guardar la plantilla en el servidor.");
      }
    } catch (err) {
      console.error("Error saving template:", err);
      alert("Error de conexión al guardar los cambios.");
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

  const handleAddQuestionToActive = () => {
    const newQ: Question = {
      id: "q_" + Math.random().toString(36).substring(2, 11),
      title: "Nueva Pregunta",
      type: "text",
      required: true
    };
    setQuestions([...questions, newQ]);
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

  const handleClearAllResponsesClick = () => {
    setShowClearConfirm(true);
  };

  const handleConfirmClearAllResponses = async () => {
    const success = await onClearResponses();
    if (success) {
      setResponses([]);
    }
    setShowClearConfirm(false);
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
      <aside className="w-full md:w-64 bg-slate-900 text-emerald-700 p-6 flex flex-col justify-between border-r border-slate-800">
        <div>
          <div className="flex items-center gap-3 mb-8 border-b border-slate-800 pb-5">
            <div className="w-10 h-10 rounded-xl bg-indigo-800 flex items-center justify-center font-bold text-white shadow-[0_2px_10px_rgb(0,0,0,0.1)]">
              M
            </div>
            <div>
              <h2 className="font-bold text-white text-base leading-tight">Panel Editor</h2>
              <span className="text-xs text-slate-500 font-semibold tracking-wider uppercase">ADMINISTRACIÓN</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab("questions")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                activeTab === "questions"
                  ? "bg-indigo-800 text-white shadow-md shadow-purple-900/20"
                  : "text-slate-500 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Sliders className="w-4 h-4" />
              Editar Preguntas
            </button>

            <button
              onClick={() => setActiveTab("templates")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                activeTab === "templates"
                  ? "bg-indigo-800 text-white shadow-md shadow-purple-900/20"
                  : "text-slate-500 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Bookmark className="w-4 h-4" />
              Plantillas de Encuestas
              {templates.length > 0 && (
                <span className={`ml-auto px-2 py-0.5 rounded-full text-xs font-bold border transition-colors ${
                  activeTab === "templates"
                    ? "bg-slate-900/20 text-white border-white/30"
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
                  ? "bg-indigo-800 text-white shadow-md shadow-purple-900/20"
                  : "text-slate-500 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Database className="w-4 h-4" />
              Respuestas Recibidas
              {responses.length > 0 && (
                <span className={`ml-auto px-2 py-0.5 rounded-full text-xs font-bold border transition-colors ${
                  activeTab === "responses"
                    ? "bg-slate-900/20 text-white border-white/30"
                    : "bg-slate-800 text-slate-300 border-slate-700"
                }`}>
                  {responses.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("settings")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                activeTab === "settings"
                  ? "bg-indigo-800 text-white shadow-md shadow-purple-900/20"
                  : "text-slate-500 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Settings className="w-4 h-4" />
              Configurar Inicio (Título)
            </button>

          </nav>
        </div>

        {/* User Session Info / Exit */}
        <div className="pt-6 border-t border-slate-800 space-y-4">
          <div className="text-xs text-slate-500 font-medium">
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
            <span className="text-xs font-bold text-slate-500 tracking-wider uppercase">Plataforma Empresarial</span>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-1">
              {activeTab === "questions" && "Diseñador de Preguntas"}
              {activeTab === "responses" && "Visor de Respuestas"}
              {activeTab === "templates" && "Gestor de Plantillas de Encuestas"}
              {activeTab === "settings" && "Configuración de Inicio (Título)"}
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
              className="flex items-center gap-2 px-4 py-2 bg-indigo-800 hover:bg-indigo-900 text-white font-semibold rounded-xl text-sm shadow-[0_2px_10px_rgb(0,0,0,0.02)] hover:shadow-[0_4px_20px_rgb(0,0,0,0.04)] transition-all"
            >
              <Download className="w-4 h-4" />
              Descargar Excel (CSV)
            </button>
          </div>
        </header>

        {/* Active Survey Banner */}
        <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 bg-white rounded-3xl border border-slate-200 shadow-sm transition-all">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl border ${
              activeTemplate 
                ? "bg-emerald-50 border-emerald-100 text-emerald-700" 
                : "bg-amber-50 border-amber-100/80 text-amber-600"
            }`}>
              <Bookmark className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">Cuestionario Activo de {companyName}</p>
              <h3 className="font-extrabold text-slate-800 text-base mt-2 flex flex-wrap items-center gap-2">
                {activeTemplate ? activeTemplate.name : "Cuestionario Personalizado / Modificado Directamente"}
                {activeTemplate ? (
                  <span className="text-[9px] font-extrabold uppercase bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full border border-emerald-100 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-900 animate-pulse" />
                    Sincronizado
                  </span>
                ) : (
                  <span className="text-[9px] font-extrabold uppercase bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    Personalizado
                  </span>
                )}
              </h3>
              {activeTemplate && activeTemplate.description && (
                <p className="text-xs text-slate-500 mt-1 font-medium">{activeTemplate.description}</p>
              )}
            </div>
          </div>
          <div className="flex flex-col sm:items-end text-xs text-slate-500 font-medium">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Estructura Actual</span>
            <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1 rounded-xl border border-slate-200 font-bold text-slate-700">
              {questions.length} {questions.length === 1 ? "pregunta" : "preguntas"}
            </div>
          </div>
        </div>

        {/* Tab 1: Questions Editor */}
        {activeTab === "questions" && (
          <div className="space-y-6">

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h3 className="font-bold text-slate-800 text-base">Estructura del Cuestionario</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Modifique, ordene, agregue o elimine las preguntas que ven los participantes al iniciar.
                </p>
              </div>
              <div className="flex items-center gap-3 w-full md:w-auto">
                <button
                  onClick={handleAddQuestionToActive}
                  className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-800 hover:bg-indigo-900 text-white font-medium rounded-xl text-sm shadow transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Nueva Pregunta
                </button>

                <button
                  onClick={handleSaveQuestionsClick}
                  disabled={isSavingQuestions}
                  className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-800 hover:bg-indigo-900 text-white font-medium rounded-xl text-sm shadow transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSavingQuestions ? "Guardando..." : "Guardar Cambios"}
                  {saveStatus === "success" && <Check className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Save Status Notification */}
            {saveStatus === "success" && (
              <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl text-sm font-semibold flex items-center gap-2">
                <Check className="w-5 h-5 text-slate-200" />
                ¡Cuestionario guardado con éxito! Las preguntas ya se encuentran actualizadas para todos los participantes.
              </div>
            )}

            {/* Questions List */}
            <div className="space-y-4">
              {questions.map((q, idx) => {
                const isFirst = idx === 0;
                const isLast = idx === questions.length - 1;
                return (
                  <div
                    key={q.id}
                    className="bg-white border border-slate-200 rounded-2xl p-5 relative shadow-[0_2px_8px_rgba(0,0,0,0.01)] transition-all group hover:shadow-sm"
                  >
                    <div className="absolute left-4 top-5 flex items-center justify-center w-7 h-7 rounded-full bg-purple-100 text-purple-700 text-xs font-extrabold shadow-sm">
                      {idx + 1}
                    </div>

                    <div className="pl-10 space-y-4">
                      {/* Row 1: Title and Description */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="md:col-span-3 space-y-1">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase">
                            Título de la Pregunta <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={q.title}
                            onChange={(e) => {
                              const updated = [...questions];
                              updated[idx].title = e.target.value;
                              setQuestions(updated);
                            }}
                            className="w-full px-3 py-2.5 text-sm border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-slate-50 font-medium text-slate-800"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase">
                            Descripción (Opcional)
                          </label>
                          <input
                            type="text"
                            value={q.description || ""}
                            onChange={(e) => {
                              const updated = [...questions];
                              updated[idx].description = e.target.value || undefined;
                              setQuestions(updated);
                            }}
                            className="w-full px-3 py-2.5 text-sm border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-slate-50 text-slate-700"
                            placeholder="Instrucción corta..."
                          />
                        </div>
                      </div>

                      {/* Row 2: Type, Required & Sorting */}
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
                        <div className="flex flex-wrap items-center gap-4">
                          <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase">
                              Tipo de Respuesta
                            </label>
                            <select
                              value={q.type}
                              onChange={(e) => {
                                const type = e.target.value as "text" | "single" | "multiple" | "rating";
                                const updated = [...questions];
                                updated[idx].type = type;
                                if (["single", "multiple"].includes(type) && (!q.options || q.options.length === 0)) {
                                  updated[idx].options = ["Opción 1", "Opción 2"];
                                }
                                setQuestions(updated);
                              }}
                              className="px-3 py-2 text-xs border border-slate-700 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium text-slate-800"
                            >
                              <option value="text">Texto Libre</option>
                              <option value="single">Selección Única</option>
                              <option value="multiple">Selección Múltiple</option>
                              <option value="rating">Calificación (Estrellas)</option>
                            </select>
                          </div>

                          <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 self-end mt-auto transition-colors hover:bg-slate-950">
                            <input
                              type="checkbox"
                              id={`req_${q.id}`}
                              checked={q.required}
                              onChange={(e) => {
                                const updated = [...questions];
                                updated[idx].required = e.target.checked;
                                setQuestions(updated);
                              }}
                              className="rounded text-indigo-400 focus:ring-indigo-500 cursor-pointer"
                            />
                            <label htmlFor={`req_${q.id}`} className="text-xs font-semibold text-slate-700 cursor-pointer">
                              Obligatoria
                            </label>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 self-end md:self-center">
                          {/* Sort Arrows */}
                          <button
                            type="button"
                            disabled={isFirst}
                            onClick={() => moveQuestion(idx, "up")}
                            className="p-2 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-500 disabled:opacity-30 cursor-pointer transition-colors shadow-sm"
                            title="Subir"
                          >
                            <ArrowUp className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            disabled={isLast}
                            onClick={() => moveQuestion(idx, "down")}
                            className="p-2 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-500 disabled:opacity-30 cursor-pointer transition-colors shadow-sm"
                            title="Bajar"
                          >
                            <ArrowDown className="w-4 h-4" />
                          </button>

                          <span className="w-px h-6 bg-slate-700 mx-1" />

                          {/* Delete Q */}
                          <button
                            type="button"
                            onClick={() => deleteQuestion(q.id)}
                            className="p-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 cursor-pointer transition-colors shadow-sm"
                            title="Eliminar Pregunta"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Options (if single or multiple) */}
                      {["single", "multiple"].includes(q.type) && (
                        <div className="space-y-1.5 pt-3 border-t border-slate-800">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase">
                            Opciones de Respuesta (Una por línea) <span className="text-rose-500">*</span>
                          </label>
                          <textarea
                            rows={3}
                            required
                            value={q.options ? q.options.join("\n") : ""}
                            onChange={(e) => {
                              const options = e.target.value
                                .split("\n")
                                .map(o => o.trim())
                                .filter(o => o.length > 0);
                              const updated = [...questions];
                              updated[idx].options = options;
                              setQuestions(updated);
                            }}
                            placeholder="Escriba cada opción en una línea diferente."
                            className="w-full px-4 py-3 text-sm border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-slate-50 resize-none font-medium text-slate-700"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 2: Responses Viewer */}
        {activeTab === "responses" && (
          <div className="space-y-6">
            {/* Direct Excel and Deletion control panel */}
            <div className="bg-gradient-to-r from-indigo-950 to-blue-950 p-6 rounded-3xl border border-indigo-800 shadow-[0_4px_24px_rgba(139,92,246,0.03)] flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Database className="w-5 h-5 text-indigo-400" />
                  Control de Respuestas Recibidas
                </h3>
                <p className="text-xs text-indigo-300/80 mt-1 max-w-xl">
                  Descargue todas las encuestas completadas en formato Excel para su análisis o elimine de manera definitiva el historial para reiniciar la captación de datos de un nuevo lote.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto shrink-0">
                <button
                  onClick={downloadExcelCSV}
                  className="flex-grow md:flex-grow-0 flex items-center justify-center gap-2 px-5 py-3 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-2xl text-sm shadow-sm transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  Descargar Respuestas (Excel)
                </button>

                <button
                  onClick={handleClearAllResponsesClick}
                  className="flex-grow md:flex-grow-0 flex items-center justify-center gap-2 px-5 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-2xl text-sm shadow-sm transition-all cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  Eliminar Todas las Respuestas
                </button>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="relative w-full md:max-w-xs">
                <input
                  type="text"
                  placeholder="Buscar por participante..."
                  className="w-full pl-3 pr-3 py-2 border border-slate-700 rounded-xl text-sm focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                <span className="text-xs text-slate-500 font-medium">
                  Mostrando {filteredResponses.length} de {responses.length} respuestas
                </span>
              </div>
            </div>

            {filteredResponses.length === 0 ? (
              <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 shadow-sm">
                <Database className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h4 className="font-bold text-slate-200">No se encontraron respuestas</h4>
                <p className="text-slate-500 text-sm mt-1">
                  Tan pronto los participantes envíen sus encuestas, se registrarán en tiempo real en este panel.
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
                        <th className="p-4 w-48">Participante</th>
                        <th className="p-4 w-40">Fecha y Hora</th>
                        {questions.map((q) => (
                          <th key={q.id} className="p-4 min-w-[150px] font-sans">
                            {q.title}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                      {filteredResponses.map((res) => (
                        <tr key={res.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-4 font-bold text-slate-100">
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
                                        <span key={idx} className="bg-slate-800 text-slate-200 text-xs px-2 py-0.5 rounded font-medium">
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

        {/* Tab 5: Templates */}
        {activeTab === "templates" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Save current config card */}
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-slate-900 p-6 rounded-2xl border border-slate-700 shadow-sm">
                  <div className="flex items-center gap-2 text-white mb-4">
                    <Save className="w-5 h-5" />
                    <h3 className="font-bold text-slate-800 text-base">Crear Plantilla</h3>
                  </div>
                  
                  <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                    Guarde la combinación de preguntas configurada actualmente en el diseñador (<strong>{questions.length} preguntas</strong>) como una nueva plantilla para usarla o cambiarla en cualquier momento.
                  </p>

                  <form onSubmit={handleSaveCurrentAsTemplate} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                        Nombre de la Plantilla <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ej. Encuesta de Clima Laboral"
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 placeholder-zinc-400"
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
                        className="w-full px-3 py-2 text-sm border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 placeholder-zinc-400 resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSavingTemplate || questions.length === 0}
                      className="w-full py-2.5 bg-indigo-800 hover:bg-indigo-900 text-white font-bold rounded-xl text-xs shadow-[0_2px_10px_rgb(0,0,0,0.02)] hover:shadow-[0_4px_20px_rgb(0,0,0,0.04)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                    >
                      {isSavingTemplate ? "Guardando..." : "Crear Plantilla"}
                    </button>
                  </form>

                  {templateSuccessMsg && (
                    <div className="mt-4 p-3 bg-slate-950 border border-slate-700 text-emerald-200 text-xs font-medium rounded-xl text-center">
                      {templateSuccessMsg}
                    </div>
                  )}
                </div>

                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/60">
                  <h4 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-white" />
                    ¿Qué son las plantillas?
                  </h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Las plantillas le permiten almacenar listas predefinidas de preguntas. Esto le facilita alternar entre diferentes tipos de encuestas (por ejemplo, encuestas semanales, mensuales, específicas de clima u opinión) sin tener que rediseñar las preguntas de forma manual cada vez.
                  </p>
                </div>
              </div>

              {/* Saved templates list card */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-slate-900 p-6 rounded-2xl border border-slate-700 shadow-sm min-h-[400px]">
                  {templateSuccessMsg && (
                    <div className="mb-4 p-4 bg-emerald-950 border border-emerald-800 text-emerald-200 text-sm font-semibold rounded-2xl flex items-center gap-2 animate-bounce">
                      <span className="flex-shrink-0 w-2 h-2 rounded-full bg-emerald-900" />
                      {templateSuccessMsg}
                    </div>
                  )}
                  <h3 className="font-bold text-slate-800 text-base mb-1">Plantillas Guardadas Disponibles</h3>
                  <p className="text-xs text-slate-500 mb-6">
                    Haga clic en una plantilla para activarla y aplicarla al cuestionario actual.
                  </p>

                  {templates.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="w-16 h-16 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-center mb-4 text-slate-500">
                        <Bookmark className="w-6 h-6" />
                      </div>
                      <h4 className="font-bold text-slate-200 text-sm">No hay plantillas guardadas</h4>
                      <p className="text-xs text-slate-500 max-w-sm mt-1 leading-relaxed">
                        Aún no ha guardado ninguna combinación de preguntas. Rellene el formulario de la izquierda para registrar su primera plantilla de encuesta.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {templates.map((template) => {
                        const active = isActiveTemplate(template);
                        return (
                          <div
                            key={template.id}
                            className={`border rounded-2xl p-5 transition-all flex flex-col justify-between ${
                              active
                                ? "border-emerald-500 bg-emerald-950/15 shadow-[0_4px_16px_rgba(16,185,129,0.08)] ring-2 ring-emerald-500/30"
                                : "border-rose-200 bg-rose-50/25 hover:border-rose-300 hover:bg-rose-50/40 shadow-[0_2px_8px_rgba(244,63,94,0.02)]"
                            }`}
                          >
                            <div>
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex flex-wrap gap-1.5 items-center">
                                  <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md border ${
                                    active
                                      ? "bg-emerald-950 text-emerald-200 border-emerald-700"
                                      : "bg-rose-50 text-rose-850 border-rose-150"
                                  }`}>
                                    {template.questions.length} {template.questions.length === 1 ? "pregunta" : "preguntas"}
                                  </span>
                                  {active ? (
                                    <span className="text-[9px] font-extrabold uppercase bg-emerald-800 text-white px-2 py-0.5 rounded-md flex items-center gap-1 shadow-sm animate-pulse">
                                      <span className="w-1.5 h-1.5 rounded-full bg-slate-900" />
                                      ACTIVA
                                    </span>
                                  ) : (
                                    <span className="text-[9px] font-extrabold uppercase bg-rose-100 text-rose-800 px-2 py-0.5 rounded-md flex items-center gap-1 border border-rose-200">
                                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                      INACTIVA
                                    </span>
                                  )}
                                </div>
                                <span className={`text-[10px] font-medium ${active ? "text-emerald-400/70" : "text-rose-500/70"}`}>
                                  {formatDate(template.createdAt)}
                                </span>
                              </div>

                              <h4 className="font-bold text-slate-850 text-sm mt-3 line-clamp-1">
                                {template.name}
                              </h4>

                              {template.description && (
                                <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
                                  {template.description}
                                </p>
                              )}

                              {/* Questions quick preview */}
                              <div className={`mt-4 pt-3 border-t ${active ? "border-emerald-800/50" : "border-rose-100"}`}>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Vista previa de preguntas:</p>
                                <ul className="mt-1.5 space-y-1">
                                  {template.questions.slice(0, 3).map((q, idx) => (
                                    <li key={q.id || idx} className="text-[11px] text-slate-300 truncate flex items-center gap-1">
                                      <span className={`text-[9px] w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 font-bold ${
                                        active
                                          ? "bg-emerald-900 text-emerald-300"
                                          : "bg-rose-100 text-rose-700"
                                      }`}>{idx + 1}</span>
                                      <span className="truncate">{q.title}</span>
                                    </li>
                                  ))}
                                  {template.questions.length > 3 && (
                                    <li className="text-[10px] text-white font-medium pl-4">
                                      + {template.questions.length - 3} preguntas más...
                                    </li>
                                  )}
                                </ul>
                              </div>
                            </div>

                            <div className={`mt-6 pt-3 border-t flex items-center gap-2 ${active ? "border-emerald-800/50" : "border-rose-100"}`}>
                              {confirmDeleteId === template.id ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      executeDeleteTemplate(template.id);
                                      setConfirmDeleteId(null);
                                    }}
                                    className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-sm transition-all flex items-center justify-center gap-1 cursor-pointer animate-pulse"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    ¿Confirmar eliminar?
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteId(null)}
                                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs border border-slate-700 transition-all cursor-pointer"
                                  >
                                    Cancelar
                                  </button>
                                </>
                              ) : (
                                <>
                                  {active ? (
                                    <div className="flex-1 py-2 bg-emerald-900 text-emerald-300 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 border border-emerald-700">
                                      <Check className="w-3.5 h-3.5" />
                                      Activa Actualmente
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleApplyTemplate(template)}
                                      className="flex-1 py-2 bg-indigo-800 hover:bg-indigo-900 text-white font-bold rounded-xl text-xs shadow-sm transition-all flex items-center justify-center gap-1.5 hover:shadow-md cursor-pointer"
                                    >
                                      <Play className="w-3.5 h-3.5" />
                                      Reutilizar
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => handleEditTemplateClick(template)}
                                    className={`p-2 rounded-xl transition-all border cursor-pointer ${
                                      active
                                        ? "text-emerald-400 hover:text-indigo-400 hover:bg-purple-950 border-emerald-700 hover:border-indigo-700"
                                        : "text-indigo-400 hover:text-purple-400 hover:bg-purple-950 border-indigo-700 hover:border-purple-300"
                                    }`}
                                    title="Editar Plantilla"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteId(template.id)}
                                    className={`p-2 rounded-xl transition-all border cursor-pointer ${
                                      active
                                        ? "text-emerald-400 hover:text-rose-600 hover:bg-rose-50 border-emerald-700 hover:border-rose-200"
                                        : "text-rose-500 hover:text-rose-700 hover:bg-rose-100/50 border-rose-200 hover:border-rose-300"
                                    }`}
                                    title="Eliminar Plantilla"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Tab 4: General Settings */}
        {activeTab === "settings" && (
          <div className="space-y-6 animate-fade-in">
            {/* Global Access & Privacy Card */}
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
                    <Settings className="w-5 h-5 text-indigo-500" />
                    Título de la Encuesta e Inicio
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Configure el título principal (nombre de la empresa o grupo) que se despliega en grande en la pantalla de bienvenida, y controle la privacidad de acceso.
                  </p>
                </div>
                {showSettingsSuccess && (
                  <motion.span 
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-xs text-emerald-600 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Configuración guardada
                  </motion.span>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Nombre de la Empresa */}
                <div className="space-y-3 p-5 bg-slate-50 rounded-2xl border border-slate-200/60 flex flex-col justify-between">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-700">Título de Inicio (Nombre de Empresa)</span>
                    <span className="text-xs text-slate-500 mt-0.5">El título principal en negrita de la pantalla de bienvenida.</span>
                  </div>

                  {!isEditingName ? (
                    <div className="flex items-center justify-between bg-white px-4 py-3 rounded-xl border border-slate-200 mt-2">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Título Actual</span>
                        <span className="text-sm font-bold text-slate-800 tracking-tight">{companyName}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setTempCompanyName(companyName);
                          setIsEditingName(true);
                        }}
                        className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Activar Cambio
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2 mt-2">
                      <input
                        type="text"
                        value={tempCompanyName}
                        onChange={(e) => setTempCompanyName(e.target.value)}
                        placeholder="Ej. GROUP ULEP S.A.S"
                        className="w-full px-4 py-2.5 bg-white text-slate-800 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-semibold"
                        autoFocus
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditingName(false);
                          }}
                          className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                        >
                          <X className="w-3 h-3" />
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            const success = await handleSaveGeneralSettings(allowAnonymous, tempCompanyName);
                            if (success) {
                              setIsEditingName(false);
                            }
                          }}
                          disabled={isSavingSettings}
                          className="px-4 py-1.5 bg-indigo-800 hover:bg-indigo-900 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {isSavingSettings ? (
                            <RefreshCw className="w-3 animate-spin" />
                          ) : (
                            <Check className="w-3 h-3" />
                          )}
                          Guardar
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Permitir Encuestas Anónimas */}
                <div className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-200/60">
                  <div className="flex flex-col pr-4">
                    <span className="text-sm font-bold text-slate-700">Permitir Encuestas Anónimas</span>
                    <span className="text-xs text-slate-500 mt-0.5">Habilita opción "Anónimo" al ingresar o exige nombre.</span>
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => {
                      const newValue = !allowAnonymous;
                      setAllowAnonymous(newValue);
                      handleSaveGeneralSettings(newValue, companyName);
                    }}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      allowAnonymous ? "bg-indigo-800" : "bg-slate-600"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-1 ring-slate-200 transition duration-200 ease-in-out ${
                        allowAnonymous ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modal para Editar Plantilla */}
      {editTpl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-4xl rounded-3xl border border-slate-200 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <Pencil className="w-5 h-5 text-indigo-400" />
                  Editar Plantilla: {editTpl.name || "Sin nombre"}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Modifique las propiedades de la plantilla y administre sus preguntas asociadas.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditTpl(null)}
                className="p-2 text-slate-500 hover:text-slate-300 rounded-xl hover:bg-slate-800 transition-all cursor-pointer"
              >
                <span className="text-lg font-bold">×</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* General Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-purple-950/30 p-5 rounded-2xl border border-indigo-800/60">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase">
                    Nombre de la Plantilla <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editTpl.name}
                    onChange={(e) => handleUpdateTemplateField("name", e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50 text-slate-800"
                    placeholder="Ej. Evaluación Mensual"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase">
                    Descripción de la Plantilla
                  </label>
                  <textarea
                    rows={1}
                    value={editTpl.description || ""}
                    onChange={(e) => handleUpdateTemplateField("description", e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50 text-slate-800 resize-none"
                    placeholder="Ej. Dirigido al equipo comercial..."
                  />
                </div>
              </div>

              {/* Questions Management */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h4 className="text-sm font-bold text-slate-100">
                    Preguntas de la Plantilla ({editTpl.questions.length})
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddTplQuestion}
                    className="flex items-center gap-1 text-xs font-bold text-indigo-400 hover:text-indigo-300 cursor-pointer bg-purple-950 hover:bg-purple-900/80 px-3 py-1.5 rounded-lg transition-colors border border-indigo-800"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Añadir Pregunta
                  </button>
                </div>

                {editTpl.questions.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-slate-700 rounded-2xl">
                    <p className="text-sm text-slate-500 font-medium">No hay preguntas registradas en esta plantilla.</p>
                    <button
                      type="button"
                      onClick={handleAddTplQuestion}
                      className="mt-2 text-xs font-bold text-indigo-400 hover:underline cursor-pointer"
                    >
                      Haga clic aquí para agregar la primera pregunta
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {editTpl.questions.map((q, idx) => {
                      const isFirst = idx === 0;
                      const isLast = idx === editTpl.questions.length - 1;
                      return (
                        <div
                          key={q.id}
                          className="bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl p-4 md:p-5 relative transition-all group hover:shadow-sm"
                        >
                          <div className="absolute left-3 top-4 flex items-center justify-center w-6 h-6 rounded-full bg-slate-700 text-slate-200 text-xs font-extrabold shadow-sm">
                            {idx + 1}
                          </div>

                          <div className="pl-8 space-y-4">
                            {/* Row 1: Title */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                              <div className="md:col-span-3 space-y-1">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase">
                                  Título de la Pregunta <span className="text-rose-500">*</span>
                                </label>
                                <input
                                  type="text"
                                  required
                                  value={q.title}
                                  onChange={(e) => {
                                    const updated = { ...q, title: e.target.value };
                                    handleUpdateTplQuestion(idx, updated);
                                  }}
                                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-slate-50 text-slate-800"
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase">
                                  Descripción (Opcional)
                                </label>
                                <input
                                  type="text"
                                  value={q.description || ""}
                                  onChange={(e) => {
                                    const updated = { ...q, description: e.target.value || undefined };
                                    handleUpdateTplQuestion(idx, updated);
                                  }}
                                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-slate-50 text-slate-800"
                                  placeholder="Instrucción corta..."
                                />
                              </div>
                            </div>

                            {/* Row 2: Type, Required & Sorting */}
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
                              <div className="flex flex-wrap items-center gap-4">
                                <div className="space-y-1">
                                  <label className="block text-[10px] font-bold text-slate-500 uppercase">
                                    Tipo de Respuesta
                                  </label>
                                  <select
                                    value={q.type}
                                    onChange={(e) => {
                                      const type = e.target.value as "text" | "single" | "multiple" | "rating";
                                      const updated: Question = {
                                        ...q,
                                        type,
                                        options: ["single", "multiple"].includes(type) ? (q.options || ["Opción 1", "Opción 2"]) : undefined
                                      };
                                      handleUpdateTplQuestion(idx, updated);
                                    }}
                                    className="px-3 py-1.5 text-xs border border-slate-700 rounded-xl bg-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium text-slate-200"
                                  >
                                    <option value="text">Texto Libre</option>
                                    <option value="single">Selección Única</option>
                                    <option value="multiple">Selección Múltiple</option>
                                    <option value="rating">Calificación (Estrellas)</option>
                                  </select>
                                </div>

                                <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 self-end mt-auto">
                                  <input
                                    type="checkbox"
                                    id={`req_tpl_${q.id}`}
                                    checked={q.required}
                                    onChange={(e) => {
                                      const updated = { ...q, required: e.target.checked };
                                      handleUpdateTplQuestion(idx, updated);
                                    }}
                                    className="rounded text-indigo-400 focus:ring-indigo-500 cursor-pointer"
                                  />
                                  <label htmlFor={`req_tpl_${q.id}`} className="text-xs font-semibold text-slate-700 cursor-pointer">
                                    Obligatoria
                                  </label>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 self-end md:self-center">
                                {/* Sort Arrows */}
                                <button
                                  type="button"
                                  disabled={isFirst}
                                  onClick={() => handleMoveTplQuestion(idx, "up")}
                                  className="p-1.5 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-500 disabled:opacity-30 cursor-pointer transition-colors"
                                  title="Subir"
                                >
                                  <ArrowUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  disabled={isLast}
                                  onClick={() => handleMoveTplQuestion(idx, "down")}
                                  className="p-1.5 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-500 disabled:opacity-30 cursor-pointer transition-colors"
                                  title="Bajar"
                                >
                                  <ArrowDown className="w-3.5 h-3.5" />
                                </button>

                                <span className="w-px h-5 bg-slate-700 mx-1" />

                                {/* Delete Q */}
                                <button
                                  type="button"
                                  onClick={() => handleDeleteTplQuestion(idx)}
                                  className="p-1.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 cursor-pointer transition-colors"
                                  title="Eliminar Pregunta"
                                >
                                  <Trash className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Options (if single or multiple) */}
                            {["single", "multiple"].includes(q.type) && (
                              <div className="space-y-1.5 pt-2 border-t border-slate-150">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase">
                                  Opciones de Respuesta (Una por línea) <span className="text-rose-500">*</span>
                                </label>
                                <textarea
                                  rows={3}
                                  required
                                  value={q.options ? q.options.join("\n") : ""}
                                  onChange={(e) => {
                                    const options = e.target.value
                                      .split("\n")
                                      .map(o => o.trim())
                                      .filter(o => o.length > 0);
                                    const updated = { ...q, options };
                                    handleUpdateTplQuestion(idx, updated);
                                  }}
                                  placeholder="Escriba cada opción en una línea diferente."
                                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50 text-slate-800 resize-none"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setEditTpl(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveEditedTemplate}
                disabled={!editTpl.name.trim() || editTpl.questions.length === 0}
                className="px-5 py-2.5 bg-indigo-800 hover:bg-indigo-900 text-white font-bold rounded-xl text-xs shadow-sm transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Confirmar Eliminación de Respuestas */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-3xl border border-slate-200 shadow-2xl overflow-hidden text-center p-6 space-y-4">
            <div className="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center mx-auto text-rose-500 mb-2">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-100">¿Eliminar Todas las Respuestas?</h3>
            <p className="text-sm text-slate-500">
              Esta acción es irreversible y se perderán todos los datos recopilados hasta el momento. ¿Desea continuar?
            </p>
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmClearAllResponses}
                className="flex-1 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-sm transition-colors cursor-pointer"
              >
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
