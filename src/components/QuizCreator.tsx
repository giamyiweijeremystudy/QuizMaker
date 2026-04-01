import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { parseQuizText } from "../utils/parser";
import { nanoid } from "nanoid";
import { Quiz, Question } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { Save, Share2, Copy, CheckCircle2, AlertCircle, FileText, Plus, Trash2, LayoutList, Type, ArrowLeft, ArrowUp } from "lucide-react";
import { cn } from "../lib/utils";
import LZString from "lz-string";

export function QuizCreator() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"bulk" | "step">("bulk");
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [quizKey, setQuizKey] = useState("");
  const [copied, setCopied] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [isModified, setIsModified] = useState(false);
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");

  useEffect(() => {
    if (editId) {
      const savedQuizzes = JSON.parse(localStorage.getItem("quizzes") || "{}");
      const quizToEdit = savedQuizzes[editId];
      if (quizToEdit) {
        setTitle(quizToEdit.title);
        
        // If it's a simple quiz, we can try to populate bulk text or step questions
        // For simplicity, let's populate step questions
        setStepQuestions(quizToEdit.questions);
        setActiveTab("step");
        setQuiz(quizToEdit);
      }
    }
  }, [editId]);

  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const hasSaved = quizKey !== "";

  const handleReturn = () => {
    if (isModified && !hasSaved) {
      setShowExitConfirm(true);
    } else {
      navigate("/");
    }
  };
  
  // Step-by-step state
  const [stepQuestions, setStepQuestions] = useState<Partial<Question>[]>([
    { id: nanoid(), text: "", options: ["", "", "", ""], answer: "A", explanation: "" }
  ]);

  const handleParse = () => {
    let questions: Question[] = [];
    
    if (activeTab === "bulk") {
      if (!text.trim()) return;
      questions = parseQuizText(text);
    } else {
      // Validate step-by-step questions
      const validQuestions = stepQuestions.filter(q => 
        q.text?.trim() && 
        q.options?.every(opt => opt.trim()) && 
        q.answer
      ) as Question[];
      
      if (validQuestions.length === 0) {
        alert("Please fill in at least one complete question.");
        return;
      }
      questions = validQuestions;
    }

    if (questions.length === 0) {
      alert("Could not find any valid questions. Please check your input.");
      return;
    }
    
    const newQuiz: Quiz = {
      id: editId || nanoid(10),
      title: title || "Untitled Quiz",
      questions,
      createdAt: quiz?.createdAt || new Date().toISOString()
    };
    setQuiz(newQuiz);
  };

  const handleSave = async () => {
    if (!quiz) return;
    setIsSaving(true);
    try {
      // Ultra-compact format: [title, [[text, options, answerIndex, explanation?], ...]]
      // Explanation only included if non-empty to keep key as short as possible
      const compactData = [
        quiz.title,
        quiz.questions.map(q => {
          const entry: any[] = [
            q.text,
            q.options,
            q.options.indexOf(q.options.find((_, i) => String.fromCharCode(65 + i) === q.answer) || ""),
          ];
          if (q.explanation) entry.push(q.explanation);
          return entry;
        })
      ];

      const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(compactData));
      
      const savedQuizzes = JSON.parse(localStorage.getItem("quizzes") || "{}");
      savedQuizzes[quiz.id] = quiz;
      localStorage.setItem("quizzes", JSON.stringify(savedQuizzes));
      
      setQuizKey(compressed);
    } catch (error) {
      console.error(error);
      alert("Error saving quiz.");
    } finally {
      setIsSaving(false);
    }
  };

  const addStepQuestion = () => {
    setStepQuestions([...stepQuestions, { id: nanoid(), text: "", options: ["", "", "", ""], answer: "A", explanation: "" }]);
    setIsModified(true);
  };

  const removeStepQuestion = (id: string) => {
    if (stepQuestions.length > 1) {
      setStepQuestions(stepQuestions.filter(q => q.id !== id));
      setIsModified(true);
    }
  };

  const updateStepQuestion = (id: string, field: keyof Question, value: any) => {
    setStepQuestions(stepQuestions.map(q => q.id === id ? { ...q, [field]: value } : q));
    setIsModified(true);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(quizKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-3xl mx-auto pb-20">
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={handleReturn}
          className="flex items-center gap-2 text-sm font-medium text-neutral-500 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Return to Menu
        </button>
      </div>

      <AnimatePresence>
        {showExitConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-neutral-900 w-full max-w-md p-8 rounded-3xl shadow-2xl relative border border-neutral-200 dark:border-neutral-800"
            >
              <h2 className="text-2xl font-bold mb-2">Unsaved Changes</h2>
              <p className="text-neutral-500 dark:text-neutral-400 text-sm mb-6">
                You have unsaved changes. Are you sure you want to return to the menu? Your progress will be lost.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowExitConfirm(false)}
                  className="flex-1 py-3 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-bold rounded-xl hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all"
                >
                  Stay Here
                </button>
                <button
                  onClick={() => navigate("/")}
                  className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-100 dark:shadow-none"
                >
                  Discard & Exit
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="bg-white dark:bg-neutral-900 p-8 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm"
      >
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          Create Your Quiz
        </h2>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">Quiz Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setIsModified(true);
              }}
              placeholder="e.g., Bernoulli's Theorem Quiz"
              className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all dark:text-neutral-100"
            />
          </div>

          <div className="flex p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl">
            <button
              onClick={() => setActiveTab("bulk")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === "bulk" ? "bg-white dark:bg-neutral-700 shadow-sm text-blue-600 dark:text-blue-400" : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"}`}
            >
              <Type className="w-4 h-4" />
              Bulk Paste
            </button>
            <button
              onClick={() => setActiveTab("step")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === "step" ? "bg-white dark:bg-neutral-700 shadow-sm text-blue-600 dark:text-blue-400" : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"}`}
            >
              <LayoutList className="w-4 h-4" />
              Step-by-Step
            </button>
          </div>

          <AnimatePresence mode="wait">
            {activeTab === "bulk" ? (
              <motion.div
                key="bulk"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                  Paste Questions
                  <span className="text-xs font-normal text-neutral-500 dark:text-neutral-400 ml-2">(Format: 1. Question... A) Option... Answer: X)</span>
                </label>
                <textarea
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value);
                    setIsModified(true);
                  }}
                  placeholder="1. Question text here...&#10;   A) Option 1&#10;   B) Option 2&#10;   Answer: A&#10;   Optional explanation here..."
                  className="w-full h-64 px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-mono text-sm dark:text-neutral-100"
                />
              </motion.div>
            ) : (
              <motion.div
                key="step"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {stepQuestions.map((q, idx) => (
                  <div key={q.id} className="p-6 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border border-neutral-200 dark:border-neutral-700 relative group">
                    <button
                      onClick={() => removeStepQuestion(q.id!)}
                      className="absolute -top-2 -right-2 p-1.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-full text-neutral-400 hover:text-red-600 shadow-sm opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase mb-1">Question {idx + 1}</label>
                        <input
                          type="text"
                          value={q.text}
                          onChange={(e) => updateStepQuestion(q.id!, "text", e.target.value)}
                          placeholder="What is the capital of France?"
                          className="w-full px-4 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 dark:text-neutral-100"
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {q.options?.map((opt, i) => {
                          const letter = String.fromCharCode(65 + i);
                          const isCorrect = q.answer === letter;
                          return (
                            <div key={i} className="flex items-center gap-2">
                              <button
                                onClick={() => updateStepQuestion(q.id!, "answer", letter)}
                                className={cn(
                                  "w-8 h-8 flex items-center justify-center rounded-lg font-bold text-xs transition-all",
                                  isCorrect 
                                    ? "bg-green-600 text-white border-green-600 shadow-sm" 
                                    : "bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400 hover:border-blue-400 hover:text-blue-600"
                                )}
                                title="Set as correct answer"
                              >
                                {letter}
                              </button>
                              <input
                                type="text"
                                value={opt}
                                onChange={(e) => {
                                  const newOpts = [...q.options!];
                                  newOpts[i] = e.target.value;
                                  updateStepQuestion(q.id!, "options", newOpts);
                                }}
                                placeholder={`Option ${letter}`}
                                className="flex-1 px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm dark:text-neutral-100"
                              />
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="flex-1">
                          <label className="block text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase mb-1">Correct Answer</label>
                          <select
                            value={q.answer}
                            onChange={(e) => updateStepQuestion(q.id!, "answer", e.target.value)}
                            className="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm dark:text-neutral-100"
                          >
                            {["A", "B", "C", "D"].map(letter => (
                              <option key={letter} value={letter}>Option {letter}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex-[2]">
                          <label className="block text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase mb-1">Explanation (Optional)</label>
                          <input
                            type="text"
                            value={q.explanation}
                            onChange={(e) => updateStepQuestion(q.id!, "explanation", e.target.value)}
                            placeholder="Why is this the correct answer?"
                            className="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm dark:text-neutral-100"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                <button
                  onClick={addStepQuestion}
                  className="w-full py-3 border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl text-neutral-500 dark:text-neutral-400 font-bold hover:border-blue-300 dark:hover:border-blue-700 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Add Another Question
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={handleParse}
            className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 active:scale-[0.98] transition-all shadow-lg shadow-blue-200"
          >
            Generate Quiz Preview
          </button>
        </div>
      </motion.div>

      {quiz && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 bg-white dark:bg-neutral-900 p-8 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold">Preview: {quiz.questions.length} Questions Found</h3>
            {!quizKey && (
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-all"
              >
                <Save className="w-4 h-4" />
                {isSaving ? "Saving..." : "Save & Get Key"}
              </button>
            )}
          </div>

          {quizKey && (
            <div className="mb-8 p-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl">
              <p className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-3 flex items-center gap-2">
                <Share2 className="w-4 h-4" />
                Your quiz is ready! Share this Quiz Key:
              </p>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={quizKey}
                  className="flex-1 px-4 py-2 bg-white dark:bg-neutral-800 border border-blue-200 dark:border-blue-700 rounded-lg text-sm text-blue-900 dark:text-blue-100 outline-none font-mono"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(quizKey);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all flex items-center gap-2"
                >
                  {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Copied" : "Copy Key"}
                </button>
              </div>
              <p className="mt-4 text-xs text-blue-600 dark:text-blue-400 italic">
                Users can paste this key into the "Enter Quiz" box on the home page.
              </p>
            </div>
          )}

          <div className="space-y-6">
            {quiz.questions.map((q, idx) => (
              <div key={q.id} className="p-6 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border border-neutral-100 dark:border-neutral-800">
                <p className="font-bold mb-4">{idx + 1}. {q.text}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {q.options.map((opt, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      <span className="w-6 h-6 flex items-center justify-center bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-full font-bold text-xs">
                        {String.fromCharCode(65 + i)}
                      </span>
                      <span className="text-neutral-700 dark:text-neutral-300">{opt}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-sm font-bold text-green-600 dark:text-green-400">Correct Answer: {q.answer}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="fixed bottom-8 right-8 p-4 bg-blue-600 text-white rounded-full shadow-2xl hover:bg-blue-700 transition-all z-50 group"
            title="Scroll to Top"
          >
            <ArrowUp className="w-6 h-6 group-hover:-translate-y-1 transition-transform" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
