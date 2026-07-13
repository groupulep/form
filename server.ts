import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// Path for storing survey questions and responses
const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "survey_data.json");

interface Question {
  id: string;
  type: "text" | "single" | "multiple" | "rating";
  title: string;
  description?: string;
  options?: string[];
  required: boolean;
}

interface Response {
  id: string;
  userName: string;
  timestamp: string;
  answers: Record<string, any>;
}

interface SurveyTemplate {
  id: string;
  name: string;
  description?: string;
  questions: Question[];
  createdAt: string;
}

interface SurveyData {
  questions: Question[];
  responses: Response[];
  webhookUrl?: string;
  templates?: SurveyTemplate[];
  allowAnonymous?: boolean;
  companyName?: string;
}

// Default initial questions
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

// Ensure database directory and file exist
function loadData(): SurveyData {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    
    if (fs.existsSync(DATA_FILE)) {
      const fileContent = fs.readFileSync(DATA_FILE, "utf-8");
      const data = JSON.parse(fileContent);
      if (!data.templates) {
        data.templates = [];
      }
      if (data.allowAnonymous === undefined) {
        data.allowAnonymous = true;
      }
      if (!data.companyName) {
        data.companyName = "GROUP ULEP S.A.S";
      }
      return data;
    }
  } catch (error) {
    console.error("Error loading survey data, falling back to defaults:", error);
  }
  
  const initialData: SurveyData = {
    questions: DEFAULT_QUESTIONS,
    responses: [],
    webhookUrl: "",
    templates: [],
    allowAnonymous: true,
    companyName: "GROUP ULEP S.A.S"
  };
  saveData(initialData);
  return initialData;
}

function saveData(data: SurveyData) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (error) {
    console.error("Error saving survey data:", error);
  }
}

// API Routes

// Health check endpoint for connection status
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Settings GET/POST endpoints
app.get("/api/survey/settings", (req, res) => {
  const data = loadData();
  res.json({ 
    allowAnonymous: data.allowAnonymous !== false,
    companyName: data.companyName || "GROUP ULEP S.A.S"
  });
});

app.post("/api/survey/settings", (req, res) => {
  const { allowAnonymous, companyName } = req.body;
  if (typeof allowAnonymous !== "boolean") {
    return res.status(400).json({ error: "allowAnonymous debe ser un booleano" });
  }
  const data = loadData();
  data.allowAnonymous = allowAnonymous;
  if (companyName && typeof companyName === "string") {
    data.companyName = companyName.trim();
  }
  saveData(data);
  res.json({ 
    success: true, 
    allowAnonymous: data.allowAnonymous,
    companyName: data.companyName || "GROUP ULEP S.A.S"
  });
});

// 1. Get entire survey structure and questions
app.get("/api/survey", (req, res) => {
  const data = loadData();
  res.json({
    questions: data.questions,
    webhookUrl: data.webhookUrl || ""
  });
});

// 2. Submit response from a user
app.post("/api/survey/submit", async (req, res) => {
  try {
    const { userName, answers } = req.body;
    if (!userName || !answers) {
      return res.status(400).json({ error: "Faltan datos requeridos (userName o answers)" });
    }

    const data = loadData();
    const newResponse: Response = {
      id: "res_" + Math.random().toString(36).substring(2, 11),
      userName,
      timestamp: new Date().toISOString(),
      answers
    };

    data.responses.push(newResponse);
    saveData(data);

    // If webhook is configured, forward the response to integrate with Excel/Google Sheets
    if (data.webhookUrl) {
      try {
        // Prepare a flattened response for easy Excel/Sheets row injection
        const rowData: Record<string, any> = {
          id: newResponse.id,
          userName: newResponse.userName,
          timestamp: newResponse.timestamp,
        };

        // Add answers as direct keys with question titles as column headers
        data.questions.forEach((q) => {
          const answer = newResponse.answers[q.id];
          if (Array.isArray(answer)) {
            rowData[q.title] = answer.join(", ");
          } else {
            rowData[q.title] = answer !== undefined ? answer : "";
          }
        });

        // Fire background webhook post
        fetch(data.webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(rowData),
        }).catch((e) => console.error("Error calling webhook:", e));
      } catch (webhookError) {
        console.error("Failed to trigger webhook:", webhookError);
      }
    }

    res.json({ success: true, responseId: newResponse.id });
  } catch (err) {
    console.error("Error submitting response:", err);
    res.status(500).json({ error: "Error interno al guardar la respuesta" });
  }
});

// 3. Get all responses (Admin Only - typically authenticated or accessed in edit mode)
app.get("/api/survey/responses", (req, res) => {
  const data = loadData();
  res.json(data.responses);
});

// 4. Update survey questions (Admin Only)
app.post("/api/survey/questions", (req, res) => {
  const { questions } = req.body;
  if (!Array.isArray(questions)) {
    return res.status(400).json({ error: "Las preguntas deben ser un arreglo" });
  }

  const data = loadData();
  data.questions = questions;
  saveData(data);
  res.json({ success: true, questions: data.questions });
});

// 5. Save Webhook configuration for Excel sync
app.post("/api/survey/webhook", (req, res) => {
  const { webhookUrl } = req.body;
  const data = loadData();
  data.webhookUrl = webhookUrl || "";
  saveData(data);
  res.json({ success: true, webhookUrl: data.webhookUrl });
});

// 6. Test Webhook configuration
app.post("/api/survey/webhook/test", async (req, res) => {
  const { webhookUrl } = req.body;
  if (!webhookUrl) {
    return res.status(400).json({ error: "No webhook URL provided" });
  }
  
  try {
    const testData = {
      id: "test_123",
      userName: "Usuario Prueba Excel",
      timestamp: new Date().toISOString(),
      "Satisfacción General": "5",
      "Área de Mayor Interés": "Soluciones de Inteligencia Artificial",
      "Aspectos a Mejorar": "Tiempo de respuesta en soporte, Proactividad en sugerir mejoras",
      "Comentarios y Sugerencias Adicionales": "Esta es una fila de prueba enviada automáticamente para comprobar la integración con Excel/Google Sheets."
    };

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testData),
    });

    if (response.ok) {
      res.json({ success: true, message: "¡Webhook probado con éxito! Se envió una fila de prueba." });
    } else {
      res.status(400).json({ error: `El webhook respondió con código: ${response.status}` });
    }
  } catch (err: any) {
    res.status(500).json({ error: `Error de conexión: ${err.message}` });
  }
});

// 7. Clear all responses (Admin Only)
app.post("/api/survey/responses/clear", (req, res) => {
  const data = loadData();
  data.responses = [];
  saveData(data);
  res.json({ success: true, responses: [] });
});

// 8. Get all survey templates
app.get("/api/survey/templates", (req, res) => {
  const data = loadData();
  res.json(data.templates || []);
});

// 9. Save a new survey template
app.post("/api/survey/templates", (req, res) => {
  const { name, description, questions } = req.body;
  if (!name || !Array.isArray(questions)) {
    return res.status(400).json({ error: "Faltan datos requeridos (name o questions)" });
  }

  const data = loadData();
  if (!data.templates) {
    data.templates = [];
  }

  const newTemplate: SurveyTemplate = {
    id: "temp_" + Math.random().toString(36).substring(2, 11),
    name,
    description: description || "",
    questions,
    createdAt: new Date().toISOString()
  };

  data.templates.push(newTemplate);
  saveData(data);
  res.json({ success: true, template: newTemplate });
});

// 10. Delete a survey template
app.delete("/api/survey/templates/:id", (req, res) => {
  const { id } = req.params;
  const data = loadData();
  if (!data.templates) {
    data.templates = [];
  }

  data.templates = data.templates.filter((t) => t.id !== id);
  saveData(data);
  res.json({ success: true });
});

// 11. Update an existing survey template
app.put("/api/survey/templates/:id", (req, res) => {
  const { id } = req.params;
  const { name, description, questions } = req.body;
  if (!name || !Array.isArray(questions)) {
    return res.status(400).json({ error: "Faltan datos requeridos (name o questions)" });
  }

  const data = loadData();
  if (!data.templates) {
    data.templates = [];
  }

  const idx = data.templates.findIndex((t) => t.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: "Plantilla no encontrada" });
  }

  data.templates[idx] = {
    ...data.templates[idx],
    name,
    description: description || "",
    questions
  };

  saveData(data);
  res.json({ success: true, template: data.templates[idx] });
});


// Setup Vite middleware or static serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
