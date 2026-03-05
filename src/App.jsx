import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { ShieldAlert, ScanLine, FilePlus, LogOut, CheckSquare, FileText, Truck } from 'lucide-react';
import './index.css';

import Dashboard from './pages/Dashboard';
import Scanner from './pages/Scanner';
import AltaForm from './pages/AltaForm';
import BajaForm from './pages/BajaForm';
import ChecklistForm from './pages/ChecklistForm';
import Reportes from './pages/Reportes';
import Panol from './pages/Panol';

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
          <Route path="/reportes" element={<Reportes />} />
          <Route path="/panol" element={<Panol />} />
        </Routes>
      </main>

      {/* Bottom Navigation for Mobile */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, width: '100%',
        background: 'rgba(15, 23, 42, 0.95)', borderTop: '1px solid var(--glass-border)',
        display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0.5rem',
        backdropFilter: 'blur(10px)', overflowX: 'auto', whiteSpace: 'nowrap'
      }}>
        <Link to="/" style={{ color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 0.5rem' }}>
          <ShieldAlert size={22} /> <span style={{ fontSize: '0.7rem', marginTop: '4px' }}>Inicio</span>
        </Link>
        <Link to="/scan" style={{ color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 0.5rem' }}>
          <ScanLine size={22} /> <span style={{ fontSize: '0.7rem', marginTop: '4px' }}>Escanear</span>
        </Link>
        <Link to="/alta" style={{ color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 0.5rem' }}>
          <FilePlus size={22} /> <span style={{ fontSize: '0.7rem', marginTop: '4px' }}>Alta</span>
        </Link>
        <Link to="/baja" style={{ color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 0.5rem' }}>
          <LogOut size={22} /> <span style={{ fontSize: '0.7rem', marginTop: '4px' }}>Baja</span>
        </Link>
        <Link to="/checklist" style={{ color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 0.5rem' }}>
          <CheckSquare size={22} /> <span style={{ fontSize: '0.7rem', marginTop: '4px' }}>Check</span>
        </Link>
        <Link to="/reportes" style={{ color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 0.5rem' }}>
          <FileText size={22} /> <span style={{ fontSize: '0.7rem', marginTop: '4px' }}>PDF</span>
        </Link>
        <Link to="/panol" style={{ color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 0.5rem' }}>
          <Truck size={22} /> <span style={{ fontSize: '0.7rem', marginTop: '4px' }}>Pañol</span>
        </Link>
      </nav>
    </BrowserRouter>
  );
}

export default App;
