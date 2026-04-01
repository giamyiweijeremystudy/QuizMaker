import { Question } from "../types";
import { nanoid } from "nanoid";

export function parseQuizText(text: string): Question[] {
  const questions: Question[] = [];
  // Split by question numbers (e.g., "1.", "2.")
  const questionBlocks = text.split(/\n\s*\d+\.\s+/).filter(block => block.trim().length > 0);

  for (const block of questionBlocks) {
    const lines = block.split("\n").map(l => l.trim()).filter(l => l.length > 0);
    
    if (lines.length < 3) continue;

    const questionText = lines[0];
    const options: string[] = [];
    let answer = "";
    let explanation = "";

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      
      // Match options like A) or A.
      const optionMatch = line.match(/^([A-D])[\)\.]\s*(.*)$/i);
      if (optionMatch) {
        options.push(optionMatch[2]);
        continue;
      }

      // Match answer like "Answer: B"
      const answerMatch = line.match(/^Answer:\s*([A-D])$/i);
      if (answerMatch) {
        answer = answerMatch[1].toUpperCase();
        
        // Check if there's a next line for explanation
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1];
          // If the next line doesn't look like a new option or answer, it's an explanation
          if (!nextLine.match(/^([A-D])[\)\.]/i) && !nextLine.match(/^Answer:/i)) {
            explanation = nextLine;
            i++; // Skip the explanation line in the next iteration
          }
        }
        continue;
      }
    }

    if (questionText && options.length >= 2 && answer) {
      questions.push({
        id: nanoid(),
        text: questionText,
        options,
        answer,
        explanation: explanation || undefined
      });
    }
  }

  return questions;
}

export function generateGoogleFormsFormat(questions: Question[]): string {
  // Google Forms CSV format (Title, Question, Type, Option 1, Option 2, ...)
  // This is a common format for import tools.
  let csv = "Question,Type,Option 1,Option 2,Option 3,Option 4,Correct Answer\n";
  questions.forEach(q => {
    const row = [
      `"${q.text.replace(/"/g, '""')}"`,
      "Multiple Choice",
      ...q.options.map(o => `"${o.replace(/"/g, '""')}"`),
      // Fill empty options if less than 4
      ...Array(Math.max(0, 4 - q.options.length)).fill(""),
      q.answer
    ];
    csv += row.join(",") + "\n";
  });
  return csv;
}

export function generateGoogleAppsScript(title: string, questions: Question[]): string {
  const escapedTitle = title.replace(/'/g, "\\'");
  let script = `function createQuiz() {
  var form = FormApp.create('${escapedTitle}');
  form.setIsQuiz(true);
  form.setProgressBar(true);
  
  var item;
  var choices;
\n`;

  questions.forEach((q, idx) => {
    const escapedText = q.text.replace(/'/g, "\\'");
    script += `  // Question ${idx + 1}
  item = form.addMultipleChoiceItem();
  item.setTitle('${escapedText}');
  choices = [];
`;

    q.options.forEach((opt, i) => {
      const escapedOpt = opt.replace(/'/g, "\\'");
      const isCorrect = String.fromCharCode(65 + i) === q.answer;
      script += `  choices.push(item.createChoice('${escapedOpt}', ${isCorrect}));\n`;
    });

    script += `  item.setChoices(choices);
  item.setPoints(1);
  item.setRequired(true);
`;

    if (q.explanation) {
      const escapedExp = q.explanation.replace(/'/g, "\\'");
      script += `  var feedback = FormApp.createFeedback().setText('${escapedExp}').build();
  item.setFeedbackForCorrect(feedback);
  item.setFeedbackForIncorrect(feedback);
`;
    }

    script += "\n";
  });

  script += `  Logger.log('Quiz created! URL: ' + form.getEditUrl());
  Logger.log('Published URL: ' + form.getPublishedUrl());
}`;
  return script;
}
