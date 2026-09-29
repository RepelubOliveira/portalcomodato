import logo from '@/assets/risel-logo.png';
import { cn } from '@/components/ui/primitivos';

/**
 * Logotipo Risel Combustíveis. O arquivo é quadrado com respiro interno,
 * então recebe altura fixa e largura automática para não distorcer.
 */
export function MarcaRisel({
  className,
  tamanho = 40,
}: {
  className?: string;
  tamanho?: number;
}) {
  return (
    <img
      src={logo}
      alt="Risel Combustíveis"
      width={tamanho}
      height={tamanho}
      className={cn('shrink-0 object-contain', className)}
      style={{ height: tamanho, width: tamanho }}
    />
  );
}
