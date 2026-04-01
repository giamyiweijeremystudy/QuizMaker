import { useState, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import { motion } from "motion/react";
import { ExternalLink, FileDown, MousePointer2, Settings, CheckCircle2, ArrowRight, Code, Copy, Terminal, ArrowLeft } from "lucide-react";
import { generateGoogleFormsFormat, generateGoogleAppsScript } from "../utils/parser";
import { Quiz } from "../types";

export function ExportGuide() {
  const location = useLocation();
  const [activeMethod, setActiveMethod] = useState<"csv" | "script">("script");
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (location.state?.quiz) {
      setQuiz(location.state.quiz);
    }
  }, [location.state]);

  const handleDownloadCSV = () => {
    if (!quiz) return;
    const csv = generateGoogleFormsFormat(quiz.questions);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${quiz.title.replace(/\s+/g, "_")}_GoogleForms.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyScript = () => {
    if (!quiz) return;
    const script = generateGoogleAppsScript(quiz.title, quiz.questions);
    navigator.clipboard.writeText(script);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const csvSteps = [
    {
      title: "Download CSV File",
      description: "Click the button below to download your quiz formatted for Google Forms.",
      icon: <FileDown className="w-6 h-6 text-blue-600" />,
      color: "bg-blue-50 border-blue-100",
      action: (
        <button 
          onClick={handleDownloadCSV}
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
        >
          <FileDown className="w-5 h-5" />
          Download CSV
        </button>
      )
    },
    {
      title: "Open Google Forms",
      description: "Go to Google Forms and create a new blank form or open an existing one.",
      icon: <ExternalLink className="w-6 h-6 text-purple-600" />,
      color: "bg-purple-50 border-purple-100",
      link: "https://forms.new"
    },
    {
      title: "Install 'Form Builder'",
      description: "Click the three dots (More) > Add-ons. Search for 'Form Builder' and install it.",
      icon: <Settings className="w-6 h-6 text-orange-600" />,
      color: "bg-orange-50 border-orange-100"
    },
    {
      title: "Import CSV",
      description: "Open the Form Builder add-on, select 'CSV' as the source, and upload your file.",
      icon: <MousePointer2 className="w-6 h-6 text-green-600" />,
      color: "bg-green-50 border-green-100"
    }
  ];

  const scriptSteps = [
    {
      title: "Copy the Script",
      description: "Copy the Google Apps Script below. This script will automatically build the form for you.",
      icon: <Copy className="w-6 h-6 text-blue-600" />,
      color: "bg-blue-50 border-blue-100",
      action: (
        <button 
          onClick={handleCopyScript}
          className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
        >
          {copied ? <CheckCircle2 className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
          {copied ? "Copied to Clipboard!" : "Copy Apps Script"}
        </button>
      )
    },
    {
      title: "Open Apps Script",
      description: "Go to Google Apps Script and create a new project.",
      icon: <Terminal className="w-6 h-6 text-purple-600" />,
      color: "bg-purple-50 border-purple-100",
      link: "https://script.google.com/home/projects/create"
    },
    {
      title: "Paste & Save",
      description: "Delete everything in the editor and paste the script you copied. Save the project (Ctrl+S).",
      icon: <Code className="w-6 h-6 text-orange-600" />,
      color: "bg-orange-50 border-orange-100"
    },
    {
      title: "Run the Script",
      description: "Click the 'Run' button at the top. You'll need to authorize the script to create forms in your account.",
      icon: <Play className="w-6 h-6 text-green-600" />,
      color: "bg-green-50 border-green-100"
    },
    {
      title: "Check Logs",
      description: "Once finished, look at the 'Execution log' at the bottom to find your new Quiz URL!",
      icon: <CheckCircle2 className="w-6 h-6 text-emerald-600" />,
      color: "bg-emerald-50 border-emerald-100"
    }
  ];

  const steps = activeMethod === "csv" ? csvSteps : scriptSteps;

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <div className="mb-8">
        <Link to={quiz ? `/quiz/${quiz.id}` : "/"} className="inline-flex items-center gap-2 text-sm font-medium text-neutral-500 hover:text-blue-600 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Quiz
        </Link>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <h1 className="text-4xl font-black mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Google Forms Export Guide
        </h1>
        <p className="text-neutral-500 text-lg max-w-2xl mx-auto mb-8">
          Choose your preferred method to turn your quiz into a Google Form.
        </p>

        <div className="flex justify-center gap-4 p-1 bg-neutral-100 rounded-2xl w-fit mx-auto">
          <button
            onClick={() => setActiveMethod("script")}
            className={`px-6 py-2 rounded-xl font-bold transition-all ${activeMethod === "script" ? "bg-white text-blue-600 shadow-sm" : "text-neutral-500 hover:text-neutral-700"}`}
          >
            Method 1: Apps Script (Fastest)
          </button>
          <button
            onClick={() => setActiveMethod("csv")}
            className={`px-6 py-2 rounded-xl font-bold transition-all ${activeMethod === "csv" ? "bg-white text-blue-600 shadow-sm" : "text-neutral-500 hover:text-neutral-700"}`}
          >
            Method 2: CSV Import
          </button>
        </div>
      </motion.div>

      <div className="relative">
        {/* Connection Line */}
        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-neutral-100 hidden md:block" />

        <div className="space-y-12">
          {steps.map((step, idx) => (
            <motion.div
              key={`${activeMethod}-${idx}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="relative flex flex-col md:flex-row gap-8 items-start"
            >
              <div className={`z-10 w-16 h-16 rounded-2xl flex items-center justify-center border-2 shrink-0 shadow-sm ${step.color}`}>
                {step.icon}
              </div>

              <div className="flex-1 pt-2">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xs font-black text-neutral-400 uppercase tracking-widest">Step {idx + 1}</span>
                  <h3 className="text-xl font-bold text-neutral-900">{step.title}</h3>
                </div>
                <p className="text-neutral-600 leading-relaxed mb-6">
                  {step.description}
                </p>
                {step.action && (
                  <div className="mb-4">
                    {step.action}
                  </div>
                )}
                {step.link && (
                  <a 
                    href={step.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white text-sm font-bold rounded-lg hover:bg-neutral-800 transition-all"
                  >
                    Open Link
                    <ArrowRight className="w-4 h-4" />
                  </a>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <motion.div 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="mt-20 p-8 bg-neutral-900 rounded-3xl text-white text-center"
      >
        <h3 className="text-2xl font-bold mb-4">Why use Apps Script?</h3>
        <p className="text-neutral-400 mb-6 max-w-xl mx-auto">
          The Google Apps Script method is the most reliable way to create a quiz without installing any 3rd party add-ons. It uses Google's own developer tools to build your form exactly how you want it.
        </p>
        <div className="flex justify-center gap-4">
          <Link 
            to={quiz ? `/quiz/${quiz.id}` : "/"}
            className="px-8 py-3 bg-white text-neutral-900 font-bold rounded-xl hover:bg-neutral-100 transition-all"
          >
            Return to Quiz
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

const Play = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);
