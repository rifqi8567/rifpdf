import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export function Logo({ className, size = 'md', showText = true }: LogoProps) {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-10 w-10',
  };

  const textSizes = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-xl',
  };

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div className={cn('relative', sizeClasses[size])}>
        <div className="absolute inset-0 rounded-lg gradient-bg opacity-20 blur-sm" />
        <div className="relative flex items-center justify-center h-full w-full rounded-lg gradient-bg">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="h-[60%] w-[60%]"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <circle cx="12" cy="15" r="3" opacity="0.7" />
          </svg>
        </div>
      </div>
      {showText && (
        <span className={cn('font-bold tracking-tight', textSizes[size])}>
          <span className="gradient-text">Docu</span>
          <span className="text-foreground">Mind</span>
        </span>
      )}
    </div>
  );
}
