import { HashRouter, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ToastProvider } from './components/toast'
import Dashboard from './pages/Dashboard'
import Estoque from './pages/Estoque'
import Vendedores from './pages/Vendedores'
import Financeiro from './pages/Financeiro'
import NovaVenda from './pages/NovaVenda'
import RelatorioVendas from './pages/RelatorioVendas'

export default function App() {
  return (
    <ToastProvider>
      <HashRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="estoque" element={<Estoque />} />
            <Route path="vendedores" element={<Vendedores />} />
            <Route path="financeiro" element={<Financeiro />} />
            <Route path="venda" element={<NovaVenda />} />
            <Route path="relatorio" element={<RelatorioVendas />} />
          </Route>
        </Routes>
      </HashRouter>
    </ToastProvider>
  )
}
