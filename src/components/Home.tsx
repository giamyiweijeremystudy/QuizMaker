import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { PlusCircle, PlayCircle, FileText, Trash2, Clock, Search, X, Bookmark, Edit, TrendingUp } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Quiz } from "../types";

export function Home() {
  const [savedQuizzes, setSavedQuizzes] = useState<Quiz[]>([]);
  const [showEnterKey, setShowEnterKey] = useState(false);
  const [quizKey, setQuizKey] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get("enterKey") === "true") {
      setShowEnterKey(true);
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("enterKey");
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const quizzes = JSON.parse(localStorage.getItem("quizzes") || "{}");
    // Sort by createdAt descending
    const sorted = Object.values(quizzes) as Quiz[];
    sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setSavedQuizzes(sorted);
  }, []);

  const toggleBookmark = (id: string) => {
    const quizzes = JSON.parse(localStorage.getItem("quizzes") || "{}");
    if (quizzes[id]) {
      quizzes[id].isBookmarked = !quizzes[id].isBookmarked;
      localStorage.setItem("quizzes", JSON.stringify(quizzes));
      const sorted = Object.values(quizzes) as Quiz[];
      sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setSavedQuizzes(sorted);
    }
  };

  const deleteQuiz = (id: string) => {
    const quizzes = JSON.parse(localStorage.getItem("quizzes") || "{}");
    delete quizzes[id];
    localStorage.setItem("quizzes", JSON.stringify(quizzes));
    setSavedQuizzes(Object.values(quizzes));
  };

  const handleEnterQuiz = () => {
    if (!quizKey.trim()) return;

    let data = quizKey.trim();
    
    // If it's a full URL, extract the data parameter
    try {
      if (data.includes("?data=")) {
        const url = new URL(data.startsWith("http") ? data : `https://dummy.com/${data}`);
        const params = new URLSearchParams(url.search);
        const extractedData = params.get("data");
        if (extractedData) data = extractedData;
      }
    } catch (e) {
      // Not a URL, treat as raw data
    }

    // Basic validation: should be a non-empty string
    if (data.length < 10) {
      alert("Invalid quiz key. Please check and try again.");
      return;
    }

    // Navigate within the app
    navigate(`/quiz/imported?data=${data}`);
    setShowEnterKey(false);
    setQuizKey("");
  };

  const filteredQuizzes = savedQuizzes.filter(q => {
    return q.title.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const bookmarkedQuizzes = filteredQuizzes.filter(q => q.isBookmarked);
  const recentHistory = filteredQuizzes.filter(q => !q.isBookmarked);

  return (
    <div className="flex flex-col items-center py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl text-center mb-12"
      >
        <h1 className="text-5xl font-extrabold tracking-tight mb-6 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          Create Interactive MCQ Quizzes in Seconds
        </h1>
        <p className="text-xl text-neutral-600 dark:text-neutral-400 mb-10 leading-relaxed">
          Paste your questions, share with your audience, and export to Google Forms. 
          Perfect for teachers, trainers, and knowledge seekers.
        </p>
        
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link 
            to="/create" 
            className="flex items-center justify-center gap-3 px-8 py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all group"
          >
            <PlusCircle className="w-6 h-6" />
            <span className="text-lg">Create a New Quiz</span>
          </Link>
          
          <button 
            onClick={() => setShowEnterKey(true)}
            className="flex items-center justify-center gap-3 px-8 py-4 bg-white dark:bg-neutral-900 border-2 border-blue-600 text-blue-600 font-bold rounded-2xl hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all"
          >
            <Search className="w-6 h-6" />
            <span className="text-lg">Enter Quiz Key</span>
          </button>
        </div>
      </motion.div>

      {/* Search */}
      <div className="w-full max-w-4xl mb-12 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <input
              type="text"
              placeholder="Search quizzes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showEnterKey && (
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
              <button 
                onClick={() => setShowEnterKey(false)}
                className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
              
              <h2 className="text-2xl font-bold mb-2">Enter Quiz Key</h2>
              <p className="text-neutral-500 text-sm mb-6">Paste the quiz URL or the unique data key provided by the creator.</p>
              
              <div className="space-y-4">
                <input 
                  type="text"
                  value={quizKey}
                  onChange={(e) => setQuizKey(e.target.value)}
                  placeholder="Paste key or URL here..."
                  className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  onKeyDown={(e) => e.key === 'Enter' && handleEnterQuiz()}
                />
                <button 
                  onClick={handleEnterQuiz}
                  className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-2"
                >
                  <Search className="w-5 h-5" />
                  Search & Open
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Saved Quizzes */}
      <div className="w-full max-w-4xl mb-12">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <Bookmark className="w-6 h-6 text-blue-600 fill-current" />
          Saved Quizzes
        </h2>
        {bookmarkedQuizzes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bookmarkedQuizzes.map((quiz) => (
              <motion.div
                key={quiz.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white dark:bg-neutral-900 p-6 rounded-2xl border-2 border-blue-100 dark:border-blue-900/30 shadow-sm hover:shadow-md transition-all flex items-center justify-between group"
              >
                <Link to={`/quiz/${quiz.id}`} className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {quiz.stats?.bestScore !== undefined && (
                      <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-[10px] font-bold rounded uppercase tracking-wider">
                        Best: {quiz.stats.bestScore}/{quiz.questions.length}
                      </span>
                    )}
                    {quiz.stats?.attempts !== undefined && (
                      <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-bold rounded uppercase tracking-wider flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        Attempts: {quiz.stats.attempts}
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-lg mb-1 group-hover:text-blue-600 transition-colors">{quiz.title}</h3>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">{quiz.questions.length} Questions • {new Date(quiz.createdAt).toLocaleDateString()}</p>
                </Link>
                <div className="flex items-center gap-1">
                  <Link
                    to={`/create?edit=${quiz.id}`}
                    className="p-2 text-neutral-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-all"
                    title="Edit Quiz"
                  >
                    <Edit className="w-5 h-5" />
                  </Link>
                  <button 
                    onClick={() => toggleBookmark(quiz.id)}
                    className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-all"
                    title="Remove Bookmark"
                  >
                    <Bookmark className="w-5 h-5 fill-current" />
                  </button>
                  <button 
                    onClick={() => deleteQuiz(quiz.id)}
                    className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all"
                    title="Delete Quiz"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="p-12 border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-3xl text-center bg-white/50 dark:bg-neutral-900/50">
            <Bookmark className="w-12 h-12 text-neutral-200 dark:text-neutral-800 mx-auto mb-4" />
            <p className="text-neutral-500 dark:text-neutral-400 font-medium">
              {searchQuery ? "No matching saved quizzes." : "No saved quizzes yet. Save your favorites for quick access!"}
            </p>
          </div>
        )}
      </div>

      {/* Quiz History */}
      <div className="w-full max-w-4xl mb-24">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <Clock className="w-6 h-6 text-neutral-400" />
          Quiz History
        </h2>
        {recentHistory.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recentHistory.map((quiz) => (
              <motion.div
                key={quiz.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white dark:bg-neutral-900 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm hover:shadow-md transition-all flex items-center justify-between group"
              >
                <Link to={`/quiz/${quiz.id}`} className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {quiz.stats?.bestScore !== undefined && (
                      <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-[10px] font-bold rounded uppercase tracking-wider">
                        Best: {quiz.stats.bestScore}/{quiz.questions.length}
                      </span>
                    )}
                    {quiz.stats?.attempts !== undefined && (
                      <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-bold rounded uppercase tracking-wider flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        Attempts: {quiz.stats.attempts}
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-lg mb-1 group-hover:text-blue-600 transition-colors">{quiz.title}</h3>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">{quiz.questions.length} Questions • {new Date(quiz.createdAt).toLocaleDateString()}</p>
                </Link>
                <div className="flex items-center gap-1">
                  <Link
                    to={`/create?edit=${quiz.id}`}
                    className="p-2 text-neutral-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-all"
                    title="Edit Quiz"
                  >
                    <Edit className="w-5 h-5" />
                  </Link>
                  <button 
                    onClick={() => toggleBookmark(quiz.id)}
                    className="p-2 text-neutral-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-all"
                    title="Bookmark Quiz"
                  >
                    <Bookmark className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => deleteQuiz(quiz.id)}
                    className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all"
                    title="Delete Quiz"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="p-12 border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-3xl text-center bg-white/50 dark:bg-neutral-900/50">
            <Clock className="w-12 h-12 text-neutral-200 dark:text-neutral-800 mx-auto mb-4" />
            <p className="text-neutral-500 dark:text-neutral-400 font-medium">
              {searchQuery ? "No matching quizzes in history." : "Your quiz history is empty. Start a quiz to see it here!"}
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left max-w-4xl">
        <div className="p-6 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-100 dark:border-neutral-800 shadow-sm">
          <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center mb-4">
            <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h3 className="font-bold mb-2">Smart Parsing</h3>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">Automatically detects questions, options, and answers from your text.</p>
        </div>
        <div className="p-6 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-100 dark:border-neutral-800 shadow-sm">
          <div className="w-10 h-10 bg-green-50 dark:bg-green-900/30 rounded-lg flex items-center justify-center mb-4">
            <PlayCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="font-bold mb-2">Live Scoring</h3>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">Instant feedback and scoring once all questions are answered.</p>
        </div>
        <div className="p-6 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-100 dark:border-neutral-800 shadow-sm">
          <div className="w-10 h-10 bg-orange-50 dark:bg-orange-900/30 rounded-lg flex items-center justify-center mb-4">
            <FileText className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          </div>
          <h3 className="font-bold mb-2">Export Ready</h3>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">Download your quiz in a format ready for Google Forms import.</p>
        </div>
      </div>
    </div>
  );
}
