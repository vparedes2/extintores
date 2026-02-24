import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { ShieldAlert, ScanLine, FilePlus, LogOut, CheckSquare } from 'lucide-react';
import './index.css';

import Dashboard from './pages/Dashboard';
import Scanner from './pages/Scanner';
import AltaForm from './pages/AltaForm';
import BajaForm from './pages/BajaForm';
import ChecklistForm from './pages/ChecklistForm';

function App() {
  return (
    <BrowserRouter>
      <header className="nav-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ShieldAlert color="var(--primary)" size={28} />
          <h1 style={{ margin: 0, fontSize: '1.25rem' }}>FireManager (By ParedesVictor)</h1>
        </div>
      </header>

      <main className="container">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/scan" element={<Scanner />} />
          <Route path="/alta" element={<AltaForm />} />
          <Route path="/baja" element={<BajaForm />} />
          <Route path="/checklist" element={<ChecklistForm />} />
        </Routes>
      </main>

      {/* Bottom Navigation for Mobile */}
      <nav style={{
        position: 'fixed', bottom: 0, width: '100%',
        background: 'rgba(15, 23, 42, 0.95)', borderTop: '1px solid var(--glass-border)',
        display: 'flex', justifyContent: 'space-around', padding: '0.75rem',
        backdropFilter: 'blur(10px)'
      }}>
        <Link to="/" style={{ color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <ShieldAlert size={24} /> <span style={{ fontSize: '0.75rem', marginTop: '4px' }}>Inicio</span>
        </Link>
        <Link to="/scan" style={{ color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <ScanLine size={24} /> <span style={{ fontSize: '0.75rem', marginTop: '4px' }}>Escanear</span>
        </Link>
        <Link to="/alta" style={{ color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <FilePlus size={24} /> <span style={{ fontSize: '0.75rem', marginTop: '4px' }}>Alta</span>
        </Link>
        <Link to="/baja" style={{ color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <LogOut size={24} /> <span style={{ fontSize: '0.75rem', marginTop: '4px' }}>Baja</span>
        </Link>
        <Link to="/checklist" style={{ color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <CheckSquare size={24} /> <span style={{ fontSize: '0.75rem', marginTop: '4px' }}>Check</span>
        </Link>
      </nav>
    </BrowserRouter>
  );
}

export default App;
