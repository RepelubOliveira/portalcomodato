import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import { router } from '@/router'
import { SessaoProvider } from '@/auth/SessaoProvider'
import { PortaoAcesso } from '@/auth/PortaoAcesso'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Dados de cadastro mudam pouco; recarregar a cada foco de janela só
      // gera tráfego e piscar de tela num portal que fica aberto o dia todo.
      refetchOnWindowFocus: false,
      staleTime: 30_000,
      retry: 1,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <SessaoProvider>
        <PortaoAcesso>
          <RouterProvider router={router} />
        </PortaoAcesso>
      </SessaoProvider>
    </QueryClientProvider>
  </StrictMode>,
)
