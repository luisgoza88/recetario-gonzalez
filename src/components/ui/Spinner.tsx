'use client';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'green' | 'blue' | 'white' | 'gray' | 'indigo' | 'purple' | 'teal' | 'emerald';
  className?: string;
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12',
};

const colorClasses = {
  green: 'border-green-600',
  blue: 'border-blue-600',
  white: 'border-white',
  gray: 'border-gray-600',
  indigo: 'border-indigo-600',
  purple: 'border-purple-600',
  teal: 'border-teal-600',
  emerald: 'border-emerald-600',
};

/**
 * Componente de spinner reutilizable
 * Reemplaza el patrón repetido de animate-spin en toda la app
 */
export default function Spinner({
  size = 'md',
  color = 'green',
  className = ''
}: SpinnerProps) {
  const classes = [
    'animate-spin rounded-full border-b-2',
    sizeClasses[size],
    colorClasses[color],
    className
  ].filter(Boolean).join(' ');

  return (
    <div
      className={classes}
      role="status"
      aria-label="Cargando"
    />
  );
}

/**
 * Spinner con texto de carga
 */
export function SpinnerWithText({
  text = 'Cargando...',
  size = 'lg',
  color = 'green'
}: SpinnerProps & { text?: string }) {
  return (
    <div className="text-center">
      <Spinner size={size} color={color} className="mx-auto mb-4" />
      <p className="text-gray-600">{text}</p>
    </div>
  );
}

/**
 * Pantalla completa de carga
 */
export function LoadingScreen({ text = 'Cargando...' }: { text?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <SpinnerWithText text={text} size="xl" />
    </div>
  );
}
