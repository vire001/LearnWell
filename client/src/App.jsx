/**
 * App.jsx — Root component.
 *
 * Provides the theme context and renders the top-level layout
 * (Navbar + routed pages).
 */

import { Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/Layout';
import Home from './pages/Home';

export default function App() {
  return (
    <ThemeProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </Layout>
    </ThemeProvider>
  );
}
