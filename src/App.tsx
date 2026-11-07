import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ToastProvider } from './components/toast'

// Cada tela é carregada sob demanda, deixando o primeiro carregamento mais leve.
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Estoque = lazy(() => import('./pages/Estoque'))
const Vendedores = lazy(() => import('./pages/Vendedores'))
const Financeiro = lazy(() => import('./pages/Financeiro'))
const NovaVenda = lazy(() => import('./pages/NovaVenda'))
const RelatorioVendas = lazy(() => import('./pages/RelatorioVendas'))

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Suspense fallback={<div className="empty">Carregando…</div>}>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="estoque" element={<Estoque />} />
              <Route path="vendedores" element={<Vendedores />} />
              <Route path="financeiro" element={<Financeiro />} />
              <Route path="venda" element={<NovaVenda />} />
              <Route path="relatorio" element={<RelatorioVendas />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ToastProvider>
  )
}
