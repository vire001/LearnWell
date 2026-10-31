/**
 * Layout.jsx — Top-level page layout.
 *
 * Renders the Navbar, then the page content below it, then the Footer.
 * Keeps the Navbar fixed and offsets content with padding.
 */

import Navbar from './Navbar';
import Footer from './Footer';

export default function Layout({ children }) {
  return (
    <div className="layout">
      <Navbar />
      <main className="main-content">{children}</main>
      <Footer />
    </div>
  );
}
