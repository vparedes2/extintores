import React from 'react';
import { BrowserRouter, Routes, Route, Link, NavLink } from 'react-router-dom';
import { ShieldAlert, ScanLine, FilePlus, LogOut, CheckSquare, FileText, Truck } from 'lucide-react';
import './index.css';

import Dashboard from './pages/Dashboard';
import Scanner from './pages/Scanner';
import AltaForm from './pages/AltaForm';
import BajaForm from './pages/BajaForm';
import ChecklistForm from './pages/ChecklistForm';
import Reportes from './pages/Reportes';
import Panol from './pages/Panol';
import MantenimientoOut from './pages/MantenimientoOut';
import MantenimientoIn from './pages/MantenimientoIn';

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
          <Route path="/mto-out" element={<MantenimientoOut />} />
          <Route path="/mto-in" element={<MantenimientoIn />} />
        </Routes>
      </main>

      {/* Bottom Navigation for Mobile using NavLink for active states */}
      <nav className="mobile-nav">
        <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <ShieldAlert size={22} /> <span>Inicio</span>
        </NavLink>
        <NavLink to="/scan" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <ScanLine size={22} /> <span>Escanear</span>
        </NavLink>
        <NavLink to="/alta" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <FilePlus size={22} /> <span>Alta</span>
        </NavLink>
        <NavLink to="/baja" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <LogOut size={22} /> <span>Baja</span>
        </NavLink>
        <NavLink to="/checklist" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <CheckSquare size={22} /> <span>Check</span>
        </NavLink>
        <NavLink to="/reportes" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <FileText size={22} /> <span>PDF</span>
        </NavLink>
        <NavLink to="/panol" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Truck size={22} /> <span>Pañol</span>
        </NavLink>
      </nav>
    </BrowserRouter>
  );
}

export default App;
