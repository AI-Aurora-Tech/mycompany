import { useState } from 'react'
import { repo } from '../data/store'
import { Confirm } from './Confirm'
import { useToast } from './toast'
import { NavLink, Outlet } from 'react-router-dom'
import { BarChart3, Boxes, FileText, Menu, ShoppingCart, Sparkles, Trophy, Wallet } from 'lucide-react'

const LINKS = [
  { to: '/', label: 'Dashboard', icon: BarChart3, end: true },
  { to: '/estoque', label: 'Estoque', icon: Boxes },
  { to: '/vendedores', label: 'Vendedores', icon: Trophy },
  { to: '/financeiro', label: 'Financeiro', icon: Wallet },
  { to: '/relatorio', label: 'Relatório de vendas', icon: FileText },
]

export function Layout() {
  const [open, setOpen] = useState(false)
  const [reset, setReset] = useState<'demo' | 'clear' | null>(null)
  const { run } = useToast()

  return (
    <div className="app">
      <header className="topbar">
        <button className="btn ghost icon" onClick={() => setOpen(true)} aria-label="Abrir menu">
          <Menu size={20} />
        </button>
        <strong>Essência</strong>
      </header>
      {open && <div className="scrim" onClick={() => setOpen(false)} />}
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-mark"><Sparkles size={18} /></div>
          <div>
            <div className="brand-name">Essência</div>
            <div className="brand-sub">Gestão de perfumaria</div>
          </div>
        </div>
        <NavLink to="/venda" className="nav-link cta" onClick={() => setOpen(false)}>
          <ShoppingCart size={18} /> Nova venda
        </NavLink>
        {LINKS.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <Icon size={18} /> {label}
          </NavLink>
        ))}
        <div className="sidebar-foot">
          <p style={{ margin: '0 0 8px' }}>Dados salvos neste navegador (modo demonstração).</p>
          <div className="btn-row" style={{ gap: 4 }}>
            <button className="btn sm ghost" onClick={() => setReset('demo')}>Dados de exemplo</button>
            <button className="btn sm ghost danger" onClick={() => setReset('clear')}>Apagar tudo</button>
          </div>
        </div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
      {reset && (
        <Confirm
          danger
          title={reset === 'demo' ? 'Restaurar dados de exemplo' : 'Apagar todos os dados'}
          confirmLabel={reset === 'demo' ? 'Restaurar' : 'Apagar tudo'}
          message={
            reset === 'demo'
              ? 'Todos os dados atuais serão substituídos pelos dados de demonstração.'
              : 'Produtos, vendas, vendedores e lançamentos serão apagados para começar do zero. Esta ação não pode ser desfeita.'
          }
          onClose={() => setReset(null)}
          onConfirm={() =>
            run(() => (reset === 'demo' ? repo.resetWithDemoData() : repo.clearAll()), 'Pronto.').then(() => setReset(null))
          }
        />
      )}
    </div>
  )
}
