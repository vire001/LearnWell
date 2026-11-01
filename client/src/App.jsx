/**
 * App.jsx — Root component.
 *
 * Provides the theme context and renders the top-level layout
 * (Navbar + routed pages).
 */

import { Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import ScrollToTop from './components/ScrollToTop';
import Layout from './components/Layout';
import Home from './pages/Home';
import MathChapters from './pages/MathChapters';
import MathTopics from './pages/MathTopics';
import FormulaInput from './pages/FormulaInput';
import PracticeHome from './pages/PracticeHome';
import PracticeSession from './pages/PracticeSession';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <ThemeProvider>
      <ScrollToTop />
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/subjects/mathematics" element={<MathChapters />} />
          <Route path="/subjects/mathematics/:chapterId" element={<MathTopics />} />
          <Route path="/subjects/mathematics/:chapterId/:topicId" element={<FormulaInput />} />
          <Route path="/practice" element={<PracticeHome />} />
          <Route path="/practice/:sessionId" element={<PracticeSession />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Layout>
    </ThemeProvider>
  );
}
