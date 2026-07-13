export interface Question {
  id: string;
  type: "text" | "single" | "multiple" | "rating";
  title: string;
  description?: string;
  options?: string[];
  required: boolean;
}

export interface Response {
  id: string;
  userName: string;
  timestamp: string;
  answers: Record<string, any>;
}

export interface SurveyTemplate {
  id: string;
  name: string;
  description?: string;
  questions: Question[];
  createdAt: string;
}

export interface SurveyData {
  questions: Question[];
  responses: Response[];
  webhookUrl?: string;
  templates?: SurveyTemplate[];
  allowAnonymous?: boolean;
  companyName?: string;
}
