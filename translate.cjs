const fs = require('fs');

function translateLogin() {
  const path = 'src/components/LoginScreen.tsx';
  let content = fs.readFileSync(path, 'utf8');
  content = content.replace('Please provide a name to continue.', 'Por favor, ingrese su nombre para continuar.');
  content = content.replace('Corporate feedback platform', 'Plataforma corporativa de encuestas');
  content = content.replace('Participant', 'Participante');
  content = content.replace('Enter your name', 'Ingrese su nombre');
  content = content.replace('Start Survey', 'Comenzar Encuesta');
  fs.writeFileSync(path, content);
}

function translateSurvey() {
  const path = 'src/components/SurveyScreen.tsx';
  let content = fs.readFileSync(path, 'utf8');
  content = content.replace('No questions available', 'No hay preguntas disponibles');
  content = content.replace('Please contact the administrator to add questions to the survey.', 'Por favor, contacte al administrador para añadir preguntas.');
  content = content.replace('Return to start', 'Volver al inicio');
  content = content.replace('This question is required. Please provide an answer to continue.', 'Esta pregunta es obligatoria. Por favor, proporcione una respuesta para continuar.');
  content = content.replace('An error occurred while submitting. Please try again.', 'Ocurrió un error al enviar. Por favor, inténtelo de nuevo.');
  content = content.replace('Server connection error.', 'Error de conexión al servidor.');
  content = content.replace('Corporate Survey', 'Encuesta Corporativa');
  content = content.replace('Participant:', 'Participante:');
  content = content.replace('Question {currentIndex + 1} of {questions.length}', 'Pregunta {currentIndex + 1} de {questions.length}');
  content = content.replace('Required', 'Obligatoria');
  content = content.replace('Type your answer here...', 'Escriba su respuesta aquí...');
  content = content.replace('Back', 'Anterior');
  content = content.replace('"Submitting..."', '"Enviando..."');
  content = content.replace('Submit', 'Enviar');
  content = content.replace('Next', 'Siguiente');
  content = content.replace('All done!', '¡Encuesta Completada!');
  content = content.replace('Thank you for your time, <strong className="text-slate-900">{userName}</strong>. Your feedback has been securely recorded and is vital for our continuous improvement.', 'Gracias por su tiempo, <strong className="text-slate-900">{userName}</strong>. Sus respuestas han sido guardadas de forma segura y son vitales para nuestra mejora continua.');
  content = content.replace('Return Home', 'Volver al Inicio');
  content = content.replace('Confidential Corporate Survey Platform', 'Plataforma Confidencial de Encuestas Corporativas');
  fs.writeFileSync(path, content);
}

function translateStatus() {
  const path = 'src/components/StatusIndicator.tsx';
  let content = fs.readFileSync(path, 'utf8');
  content = content.replace('Checking connection...', 'Verificando conexión...');
  content = content.replace('Server Connected: Live database sync active', 'Servidor Conectado: Sincronización activa');
  content = content.replace('Local Mode (GitHub Pages): Saving responses locally in browser securely', 'Modo Local: Guardando respuestas en el navegador de forma segura');
  fs.writeFileSync(path, content);
}

translateLogin();
translateSurvey();
translateStatus();
console.log('Translations applied.');
