import { useState, useEffect, useMemo } from "react";
import { useParams, Link, useLocation, useNavigate } from "react-router-dom";
import { Quiz, Question } from "../types";
import { generateGoogleFormsFormat, generateGoogleAppsScript } from "../utils/parser";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle2, AlertCircle, Trophy, FileDown, ArrowLeft, GraduationCap, Check, X, Timer, Shuffle, Settings2, Play, ArrowUp, Code, LayoutList, Bookmark, Copy, History, TrendingUp } from "lucide-react";
import { cn } from "../lib/utils";
import LZString from "lz-string";
import { nanoid } from "nanoid";
import confetti from "canvas-confetti";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const hashString = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
};

export function QuizPlayer() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [markedQuestions, setMarkedQuestions] = useState<Set<string>>(new Set());
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [showPrompt, setShowPrompt] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [quizKey, setQuizKey] = useState("");
  
  // New states for settings and game flow
  const [hasStarted, setHasStarted] = useState(false);
  const [settings, setSettings] = useState({
    timer: 0, // minutes, 0 = no timer
    randomize: false,
    verifyPerQuestion: false
  });
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [shuffledQuestions, setShuffledQuestions] = useState<Question[]>([]);

  useEffect(() => {
    const loadQuiz = () => {
      try {
        // 1. Try to get data from URL query params
        const searchParams = new URLSearchParams(location.search);
        const compressedData = searchParams.get("data");
        
        if (compressedData) {
          setQuizKey(compressedData);
          const decompressed = LZString.decompressFromEncodedURIComponent(compressedData);
          if (decompressed) {
            const raw = JSON.parse(decompressed);
            
            // Map the compact array format back to the Quiz type
            // Format: [title, [[text, options, answerIndex, explanation], ...]]
            const quizId = id && id !== "imported" ? id : `imp-${hashString(compressedData)}`;
            const data: Quiz = {
              id: quizId,
              title: raw[0],
              questions: raw[1].map((q: any, idx: number) => ({
                id: `q-${idx}`,
                text: q[0],
                options: q[1],
                answer: String.fromCharCode(65 + q[2]),
                explanation: q[3] || undefined
              })),
              createdAt: new Date().toISOString()
            };
            
            // Save to localStorage so it appears in recent quizzes
            const savedQuizzes = JSON.parse(localStorage.getItem("quizzes") || "{}");
            if (!savedQuizzes[data.id]) {
              savedQuizzes[data.id] = data;
              localStorage.setItem("quizzes", JSON.stringify(savedQuizzes));
            }
            
            setQuiz(data);
            setShuffledQuestions(data.questions);
            setIsLoading(false);
            return;
          }
        }

        // 2. Try to get from localStorage
        const savedQuizzes = JSON.parse(localStorage.getItem("quizzes") || "{}");
        if (id && savedQuizzes[id]) {
          const data = savedQuizzes[id];
          
          // Generate key for sharing if not already set
          const compactFormat = [
            data.title,
            data.questions.map((q: any) => [
              q.text,
              q.options,
              q.answer.charCodeAt(0) - 65,
              q.explanation
            ])
          ];
          const key = LZString.compressToEncodedURIComponent(JSON.stringify(compactFormat));
          setQuizKey(key);

          setQuiz(data);
          setShuffledQuestions(data.questions);
          setIsLoading(false);
          return;
        }

        throw new Error("Quiz not found");
      } catch (err) {
        setError("Quiz not found or error loading.");
        setIsLoading(false);
      }
    };
    loadQuiz();
  }, [id, location.search]);

  // Timer logic
  useEffect(() => {
    if (hasStarted && timeLeft !== null && timeLeft > 0 && !isSubmitted) {
      const timerId = setInterval(() => {
        setTimeLeft(prev => (prev !== null && prev > 0 ? prev - 1 : 0));
      }, 1000);
      return () => clearInterval(timerId);
    } else if (timeLeft === 0 && !isSubmitted) {
      handleSubmit();
    }
  }, [hasStarted, timeLeft, isSubmitted]);

  const handleStart = () => {
    if (!quiz) return;
    
    let questions = [...quiz.questions];
    if (settings.randomize) {
      questions = questions.sort(() => Math.random() - 0.5);
    }
    setShuffledQuestions(questions);
    
    if (settings.timer > 0) {
      setTimeLeft(settings.timer * 60);
    }
    
    setHasStarted(true);
  };

  const handleSelect = (questionId: string, option: string) => {
    if (isSubmitted) return;
    setAnswers(prev => ({ ...prev, [questionId]: option }));
  };

  const toggleMarked = (questionId: string) => {
    setMarkedQuestions(prev => {
      const next = new Set(prev);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
  };

  const handleSubmit = () => {
    if (!quiz) return;
    const allAnswered = quiz.questions.every(q => !!answers[q.id]);
    if (!allAnswered && timeLeft !== 0) {
      setShowPrompt(true);
      setTimeout(() => setShowPrompt(false), 3000);
      return;
    }
    
    const finalScore = calculateScore();
    const finalPercentage = Math.round((finalScore / quiz.questions.length) * 100);
    
    // Update Stats
    const quizzes = JSON.parse(localStorage.getItem("quizzes") || "{}");
    if (quizzes[quiz.id]) {
      const currentStats = quizzes[quiz.id].stats || { attempts: 0, bestScore: 0, history: [] };
      const newStats = {
        attempts: currentStats.attempts + 1,
        bestScore: Math.max(currentStats.bestScore, finalScore),
        history: [...currentStats.history, { date: new Date().toISOString(), score: finalScore }].slice(-10) // Keep last 10
      };
      quizzes[quiz.id].stats = newStats;
      localStorage.setItem("quizzes", JSON.stringify(quizzes));
      setQuiz({ ...quizzes[quiz.id] });
    }

    if (finalPercentage >= 80) {
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#2563eb', '#4f46e5', '#fbbf24']
      });
    }

    setIsSubmitted(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const calculateScore = () => {
    if (!quiz) return 0;
    let score = 0;
    quiz.questions.forEach(q => {
      if (answers[q.id] === q.answer) score++;
    });
    return score;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCopyKey = () => {
    if (!quizKey) return;
    navigator.clipboard.writeText(quizKey);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const toggleBookmark = () => {
    if (!quiz) return;
    const quizzes = JSON.parse(localStorage.getItem("quizzes") || "{}");
    if (quizzes[quiz.id]) {
      quizzes[quiz.id].isBookmarked = !quizzes[quiz.id].isBookmarked;
      localStorage.setItem("quizzes", JSON.stringify(quizzes));
      setQuiz({ ...quizzes[quiz.id] });
    }
  };

  const handleExport = () => {
    if (!quiz) return;
    // Navigate to the guide within the app
    navigate("/export-guide", { state: { quiz } });
  };

  if (isLoading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  if (error || !quiz) return <div className="text-center py-20 text-red-600 font-bold">{error || "Quiz not found"}</div>;

  if (!hasStarted) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <div className="mb-8 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-sm font-medium text-neutral-500 hover:text-blue-600 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-neutral-900 p-10 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-xl"
        >
          <div className="text-center mb-10">
            <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <GraduationCap className="w-10 h-10 text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="text-3xl font-extrabold mb-2">{quiz.title}</h1>
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-bold rounded uppercase tracking-wider">
                {quiz.category || "General"}
              </span>
              <p className="text-neutral-500 dark:text-neutral-400 font-medium text-sm">{quiz.questions.length} Questions</p>
            </div>
          </div>

          {/* Stats Section */}
          {quiz.stats && quiz.stats.attempts > 0 && (
            <div className="mb-10 grid grid-cols-2 gap-4">
              <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-2xl border border-neutral-100 dark:border-neutral-700">
                <p className="text-xs font-bold text-neutral-400 uppercase mb-1">Best Score</p>
                <p className="text-2xl font-black text-blue-600 dark:text-blue-400">
                  {quiz.stats.bestScore} <span className="text-sm font-normal text-neutral-400">/ {quiz.questions.length}</span>
                </p>
              </div>
              <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-2xl border border-neutral-100 dark:border-neutral-700">
                <p className="text-xs font-bold text-neutral-400 uppercase mb-1">Attempts</p>
                <p className="text-2xl font-black text-neutral-700 dark:text-neutral-200">{quiz.stats.attempts}</p>
              </div>
              
              {quiz.stats.history.length > 1 && (
                <div className="col-span-2 p-4 bg-neutral-50 dark:bg-neutral-800 rounded-2xl border border-neutral-100 dark:border-neutral-700">
                  <p className="text-xs font-bold text-neutral-400 uppercase mb-4 flex items-center gap-2">
                    <TrendingUp className="w-3 h-3" />
                    Score Progression
                  </p>
                  <div className="h-24 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={quiz.stats.history.map((h, i) => ({ name: i + 1, score: h.score }))}>
                        <Line 
                          type="monotone" 
                          dataKey="score" 
                          stroke="#2563eb" 
                          strokeWidth={3} 
                          dot={{ fill: '#2563eb', r: 4 }} 
                          activeDot={{ r: 6 }}
                        />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#171717', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '10px' }}
                          itemStyle={{ color: '#fff' }}
                          labelStyle={{ display: 'none' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="space-y-6 mb-10">
            <div className="flex gap-4">
              <button
                onClick={handleExport}
                className="flex-1 py-4 bg-white dark:bg-neutral-900 border-2 border-blue-600 text-blue-600 dark:text-blue-400 font-bold rounded-2xl hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all flex items-center justify-center gap-2"
              >
                <FileDown className="w-5 h-5" />
                Export
              </button>
              <button
                onClick={handleCopyKey}
                className="flex-1 py-4 bg-white dark:bg-neutral-900 border-2 border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 font-bold rounded-2xl hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all flex items-center justify-center gap-2"
              >
                {copySuccess ? (
                  <Check className="w-5 h-5 text-green-600" />
                ) : (
                  <Copy className="w-5 h-5" />
                )}
                {copySuccess ? "Copied!" : "Copy Key"}
              </button>
              <button
                onClick={toggleBookmark}
                className={cn(
                  "px-6 py-4 border-2 rounded-2xl transition-all flex items-center justify-center gap-2 font-bold",
                  quiz.isBookmarked 
                    ? "bg-blue-50 dark:bg-blue-900/30 border-blue-600 text-blue-600 dark:text-blue-400" 
                    : "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                )}
              >
                <Bookmark className={cn("w-5 h-5", quiz.isBookmarked && "fill-current")} />
              </button>
            </div>

            <div className="p-6 bg-neutral-50 dark:bg-neutral-800 rounded-2xl border border-neutral-100 dark:border-neutral-700">
              <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Settings2 className="w-4 h-4" />
                Quiz Settings
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white dark:bg-neutral-900 rounded-xl flex items-center justify-center border border-neutral-200 dark:border-neutral-700 shadow-sm">
                      <Timer className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="font-bold text-sm">Time Limit</p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">Set a countdown for the quiz</p>
                    </div>
                  </div>
                  <select 
                    value={settings.timer}
                    onChange={(e) => setSettings(prev => ({ ...prev, timer: Number(e.target.value) }))}
                    className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={0}>No Limit</option>
                    <option value={1}>1 Minute</option>
                    <option value={5}>5 Minutes</option>
                    <option value={10}>10 Minutes</option>
                    <option value={30}>30 Minutes</option>
                  </select>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white dark:bg-neutral-900 rounded-xl flex items-center justify-center border border-neutral-200 dark:border-neutral-700 shadow-sm">
                      <Shuffle className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="font-bold text-sm">Randomize Order</p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">Shuffle question sequence</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSettings(prev => ({ ...prev, randomize: !prev.randomize }))}
                    className={cn(
                      "w-12 h-6 rounded-full transition-colors relative",
                      settings.randomize ? "bg-blue-600" : "bg-neutral-300 dark:bg-neutral-700"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                      settings.randomize ? "left-7" : "left-1"
                    )} />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white dark:bg-neutral-900 rounded-xl flex items-center justify-center border border-neutral-200 dark:border-neutral-700 shadow-sm">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-bold text-sm">Instant Verification</p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">Check answers per question</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSettings(prev => ({ ...prev, verifyPerQuestion: !prev.verifyPerQuestion }))}
                    className={cn(
                      "w-12 h-6 rounded-full transition-colors relative",
                      settings.verifyPerQuestion ? "bg-blue-600" : "bg-neutral-300 dark:bg-neutral-700"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                      settings.verifyPerQuestion ? "left-7" : "left-1"
                    )} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleStart}
            className="w-full py-5 bg-blue-600 text-white font-extrabold text-lg rounded-2xl hover:bg-blue-700 active:scale-[0.98] transition-all shadow-xl shadow-blue-200 dark:shadow-none flex items-center justify-center gap-3"
          >
            <Play className="w-6 h-6 fill-current" />
            Start Quiz
          </button>
        </motion.div>
      </div>
    );
  }

  const score = calculateScore();
  const percentage = Math.round((score / quiz.questions.length) * 100);
  const progress = Math.round((Object.keys(answers).length / quiz.questions.length) * 100);

  return (
    <div className="max-w-6xl mx-auto pb-20 px-4">
      <div className="mb-8 flex items-center justify-between py-2">
        <button 
          onClick={() => {
            setHasStarted(false);
            setIsSubmitted(false);
            setAnswers({});
            setTimeLeft(null);
          }}
          className="flex items-center gap-2 text-sm font-medium text-neutral-500 dark:text-neutral-400 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Quit
        </button>
        
        {timeLeft !== null && !isSubmitted && (
          <div className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-full font-mono font-bold text-lg shadow-sm border",
            timeLeft < 30 
              ? "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 animate-pulse" 
              : "bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-800"
          )}>
            <Timer className="w-5 h-5" />
            {formatTime(timeLeft)}
          </div>
        )}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-neutral-900 p-8 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm mb-8"
      >
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{quiz.title}</h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">{quiz.questions.length} Questions</p>
          </div>
        </div>
      </motion.div>

      {isSubmitted && (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-2xl text-white shadow-xl mb-8 text-center relative overflow-hidden"
        >
          <Trophy className="w-16 h-16 mx-auto mb-4 text-yellow-400 relative z-10" />
          <h2 className="text-3xl font-bold mb-2 relative z-10">Quiz Completed!</h2>
          <p className="text-blue-100 mb-6 font-medium relative z-10">
            You scored {score} out of {quiz.questions.length}
            {quiz.stats && quiz.stats.attempts > 0 && (
              <span className="block text-xs mt-1 opacity-80">Attempt #{quiz.stats.attempts}</span>
            )}
          </p>
          <div className="w-full bg-blue-900/30 h-4 rounded-full overflow-hidden mb-2 relative z-10">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              className="h-full bg-yellow-400"
            />
          </div>
          <p className="text-sm font-bold relative z-10">{percentage}% Correct</p>
          
          {/* Decorative circles */}
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-blue-400/20 rounded-full blur-3xl" />
        </motion.div>
      )}

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Sidebar Navigation */}
        {hasStarted && (
          <aside className="w-full lg:w-64 lg:sticky lg:top-24 order-2 lg:order-1">
            <div className="bg-white dark:bg-neutral-900 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
                  <LayoutList className="w-4 h-4" />
                  Navigation
                </h3>
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-lg">
                  {Object.keys(answers).length}/{quiz.questions.length}
                </span>
              </div>

              {!isSubmitted && (
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-tight">Progress</span>
                    <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">{progress}%</span>
                  </div>
                  <div className="h-2 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      className="h-full bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.3)]"
                    />
                  </div>
                </div>
              )}
              <div className="grid grid-cols-5 lg:grid-cols-4 gap-2 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                {shuffledQuestions.map((q, idx) => {
                  const isAnswered = !!answers[q.id];
                  const isMarked = markedQuestions.has(q.id);
                  return (
                    <button
                      key={q.id}
                      onClick={() => {
                        const element = document.getElementById(`question-${q.id}`);
                        element?.scrollIntoView({ behavior: "smooth", block: "center" });
                      }}
                      className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold transition-all border-2",
                        isAnswered 
                          ? "bg-blue-600 border-blue-600 text-white" 
                          : "bg-white dark:bg-neutral-900 border-neutral-100 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400 hover:border-blue-200",
                        isMarked && !isAnswered && "border-orange-500 bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300",
                        isMarked && isAnswered && "ring-2 ring-orange-500 ring-offset-2 dark:ring-offset-neutral-900"
                      )}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
              <div className="mt-6 pt-6 border-t border-neutral-100 dark:border-neutral-800 space-y-3">
                <div className="flex items-center gap-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">
                  <div className="w-3 h-3 bg-blue-600 rounded-sm" />
                  Answered
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">
                  <div className="w-3 h-3 bg-orange-500 rounded-sm" />
                  Marked for Review
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">
                  <div className="w-3 h-3 bg-white dark:bg-neutral-900 border-2 border-neutral-100 dark:border-neutral-800 rounded-sm" />
                  Unanswered
                </div>
              </div>
            </div>
          </aside>
        )}

        <div className="flex-1 space-y-8 order-1 lg:order-2 w-full">
          {shuffledQuestions.map((q, idx) => {
            const isAnswered = !!answers[q.id];
            const isMarked = markedQuestions.has(q.id);
            const showVerification = (isSubmitted || (settings.verifyPerQuestion && isAnswered));
            
            return (
              <div 
                key={q.id} 
                id={`question-${q.id}`}
                className={cn(
                  "bg-white dark:bg-neutral-900 p-8 rounded-2xl border transition-all scroll-mt-24",
                  isMarked 
                    ? "border-orange-400 dark:border-orange-500 shadow-orange-100/50 dark:shadow-none shadow-xl ring-1 ring-orange-400/20" 
                    : "border-neutral-200 dark:border-neutral-800 shadow-sm"
                )}
              >
                <div className="flex items-start justify-between gap-4 mb-6">
                  <div className="flex items-start gap-4">
                    <span className="w-8 h-8 flex items-center justify-center bg-neutral-100 dark:bg-neutral-800 rounded-lg font-bold text-sm shrink-0">
                      {idx + 1}
                    </span>
                    <p className="text-lg font-semibold leading-relaxed">{q.text}</p>
                  </div>
                  {!isSubmitted && (
                    <button
                      onClick={() => toggleMarked(q.id)}
                      className={cn(
                        "p-2 rounded-lg transition-all",
                        isMarked 
                          ? "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400" 
                          : "text-neutral-400 dark:text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-600 dark:hover:text-neutral-300"
                      )}
                      title="Mark for review"
                    >
                      <Bookmark className={cn("w-5 h-5", isMarked && "fill-current")} />
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  {q.options.map((opt, i) => {
                    const optionLabel = String.fromCharCode(65 + i);
                    const isSelected = answers[q.id] === optionLabel;
                    const isCorrect = q.answer === optionLabel;
                    const showCorrect = showVerification && isCorrect;
                    const showWrong = showVerification && isSelected && !isCorrect;

                    return (
                      <button
                        key={i}
                        disabled={showVerification}
                        onClick={() => handleSelect(q.id, optionLabel)}
                        className={cn(
                          "w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left group",
                          isSelected 
                            ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20" 
                            : "border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 hover:border-neutral-300 dark:hover:border-neutral-700",
                          showCorrect && "border-green-600 bg-green-50 dark:bg-green-900/20",
                          showWrong && "border-red-600 bg-red-50 dark:bg-red-900/20",
                          showVerification && !isSelected && !isCorrect && "opacity-50"
                        )}
                      >
                        <span className={cn(
                          "w-8 h-8 flex items-center justify-center rounded-lg font-bold text-sm transition-colors",
                          isSelected ? "bg-blue-600 text-white" : "bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700",
                          showCorrect && "bg-green-600 text-white",
                          showWrong && "bg-red-600 text-white"
                        )}>
                          {optionLabel}
                        </span>
                        <span className="flex-1 font-medium">{opt}</span>
                        {showCorrect && <Check className="w-5 h-5 text-green-600" />}
                        {showWrong && <X className="w-5 h-5 text-red-600" />}
                      </button>
                    );
                  })}
                </div>
                
                {showVerification && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mt-6 space-y-3"
                  >
                    <div className={cn(
                      "p-4 rounded-xl text-sm font-bold flex items-center gap-2",
                      answers[q.id] === q.answer 
                        ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400" 
                        : "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400"
                    )}>
                      {answers[q.id] === q.answer ? (
                        <><CheckCircle2 className="w-4 h-4" /> Correct!</>
                      ) : (
                        <><AlertCircle className="w-4 h-4" /> Incorrect. The correct answer is {q.answer}.</>
                      )}
                    </div>
                    
                    {q.explanation && (
                      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl text-sm text-blue-800 dark:text-blue-300">
                        <p className="font-bold mb-1 flex items-center gap-2">
                          <GraduationCap className="w-4 h-4" />
                          Explanation
                        </p>
                        <p className="font-medium opacity-90">{q.explanation}</p>
                      </div>
                    )}
                  </motion.div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-8 flex justify-center">
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="flex items-center gap-2 px-6 py-3 bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-bold rounded-xl hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-all text-sm"
        >
          <ArrowUp className="w-4 h-4" />
          Back to Top
        </button>
      </div>

      {!isSubmitted && (
        <div className="mt-12 sticky bottom-8 flex justify-center">
          <div className="relative">
            <button
              onClick={handleSubmit}
              className="px-12 py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 active:scale-[0.98] transition-all shadow-xl shadow-blue-200 dark:shadow-none"
            >
              Submit Quiz
            </button>
            
            <AnimatePresence>
              {showPrompt && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: -10 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 w-64 p-4 bg-red-600 text-white text-sm font-bold rounded-xl shadow-xl text-center"
                >
                  <AlertCircle className="w-5 h-5 mx-auto mb-2" />
                  Please answer all questions before submitting!
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}

