import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import './index.css'
import { router } from '@/router'
import { SessaoProvider } from '@/auth/SessaoProvider'
import { PortaoAcesso } from '@/auth/PortaoAcesso'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SessaoProvider>
      <PortaoAcesso>
        <RouterProvider router={router} />
      </PortaoAcesso>
    </SessaoProvider>
  </StrictMode>,
)
