import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import { TRPCProvider } from "@/providers/trpc"
import App from './App.tsx'

// v87: a raiz do site abre o JOGO em tela cheia (o login e as coisas da conta ficam nos botões do jogo). O servidor já
// redireciona; isto cobre o modo de desenvolvimento e quem volta pelo histórico. Dentro do painel do jogo (iframe), não.
if (window.location.pathname === '/' && window.self === window.top) {
  window.location.replace('/game/racha.html' + window.location.search + window.location.hash)
} else {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <BrowserRouter>
        <TRPCProvider>
          <App />
        </TRPCProvider>
      </BrowserRouter>
    </StrictMode>,
  )
}
