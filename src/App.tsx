import { HashRouter, Routes, Route, Link } from "react-router-dom";
import { QuizCreator } from "./components/QuizCreator";
import { QuizPlayer } from "./components/QuizPlayer";
import { Home } from "./components/Home";
import { Layout } from "./components/Layout";
import { ExportGuide } from "./components/ExportGuide";

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="create" element={<QuizCreator />} />
          <Route path="quiz/:id" element={<QuizPlayer />} />
          <Route path="export-guide" element={<ExportGuide />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
