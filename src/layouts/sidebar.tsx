import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  MessageSquare,
  FileText,
  Merge,
  Scissors,
  Minimize2,
  PenTool,
  RefreshCw,
  ScanLine,
  ImageIcon,
  Shield,
  RotateCw,
  FileImage,
  Settings,
  HelpCircle,
  ChevronLeft,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/common/logo';
import { Button } from '@/components/ui/button';
import { useSidebarStore } from '@/store/sidebar-store';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/lib/i18n';

interface NavItem {
  labelKey:
    | 'dashboard'
    | 'chat'
    | 'documents'
    | 'merge'
    | 'split'
    | 'compress'
    | 'rotate'
    | 'protect'
    | 'pdfToJpg'
    | 'sign'
    | 'convert'
    | 'ocr'
    | 'imageToPdf'
    | 'settings'
    | 'help';
  href: string;
  icon: React.ElementType;
  badge?: string;
  isNew?: boolean;
}

const mainNavItems: NavItem[] = [
  { labelKey: 'dashboard', href: '/dashboard', icon: LayoutDashboard },
  { labelKey: 'chat', href: '/dashboard/chat', icon: MessageSquare, isNew: true },
  { labelKey: 'documents', href: '/dashboard/documents', icon: FileText },
];

const toolsNavItems: NavItem[] = [
  { labelKey: 'merge', href: '/dashboard/tools/merge', icon: Merge },
  { labelKey: 'split', href: '/dashboard/tools/split', icon: Scissors },
  { labelKey: 'compress', href: '/dashboard/tools/compress', icon: Minimize2 },
  { labelKey: 'rotate', href: '/dashboard/tools/rotate', icon: RotateCw },
  { labelKey: 'protect', href: '/dashboard/tools/protect', icon: Shield },
  { labelKey: 'pdfToJpg', href: '/dashboard/tools/pdf-to-jpg', icon: FileImage },
  { labelKey: 'sign', href: '/dashboard/tools/sign', icon: PenTool },
  { labelKey: 'convert', href: '/dashboard/tools/convert', icon: RefreshCw },
  { labelKey: 'ocr', href: '/dashboard/tools/ocr', icon: ScanLine, badge: 'AI' },
  { labelKey: 'imageToPdf', href: '/dashboard/tools/image-to-pdf', icon: ImageIcon },
];

const settingsNavItems: NavItem[] = [
  { labelKey: 'settings', href: '/dashboard/settings', icon: Settings },
  { labelKey: 'help', href: '/dashboard/help', icon: HelpCircle },
];

function NavSection({
  title,
  items,
  collapsed,
}: {
  title: string;
  items: NavItem[];
  collapsed: boolean;
}) {
  const location = useLocation();
  const { t } = useTranslation();

  return (
    <div className="space-y-1">
      {!collapsed && (
        <p className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
          {title}
        </p>
      )}
      {items.map((item) => {
        const isActive = location.pathname === item.href;
        return (
          <NavLink
            key={item.href}
            to={item.href}
            className={cn(
              'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
              isActive
                ? 'bg-primary/10 text-primary'
                : 'text-sidebar-foreground hover:bg-white/5 hover:text-foreground'
            )}
          >
            <item.icon
              className={cn(
                'h-[18px] w-[18px] shrink-0 transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
              )}
            />
            {!collapsed && (
              <>
                <span className="flex-1 truncate">{t.nav[item.labelKey]}</span>
                {item.isNew && <Badge variant="gradient" className="text-[10px] px-1.5 py-0">NEW</Badge>}
                {item.badge && <Badge variant="default" className="text-[10px] px-1.5 py-0">{item.badge}</Badge>}
              </>
            )}
            {isActive && (
              <motion.div
                layoutId="sidebar-active"
                className="absolute left-0 h-8 w-[3px] rounded-r-full bg-primary"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
          </NavLink>
        );
      })}
    </div>
  );
}

export function Sidebar() {
  const { isOpen, isCollapsed, setOpen, setCollapsed } = useSidebarStore();
  const { t } = useTranslation();
  const sidebarWidth = isCollapsed ? 68 : 260;

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        className={cn(
          'fixed top-0 left-0 z-50 flex h-full flex-col border-r border-sidebar-border bg-sidebar',
          'lg:relative lg:z-auto',
          isCollapsed ? 'w-[260px] lg:w-[68px]' : 'w-[260px]',
        )}
        initial={false}
        animate={{
          x: isOpen ? 0 : typeof window !== 'undefined' && window.innerWidth < 1024 ? -260 : 0,
          width: typeof window !== 'undefined' && window.innerWidth < 1024 ? 260 : sidebarWidth,
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border">
          <Logo size={isCollapsed ? 'sm' : 'md'} showText={!isCollapsed} />
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setCollapsed(!isCollapsed)}
              className="hidden lg:flex"
            >
              <ChevronLeft className={cn('h-4 w-4 transition-transform', isCollapsed && 'rotate-180')} />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setOpen(false)}
              className="lg:hidden"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          <NavSection title={t.nav.menu} items={mainNavItems} collapsed={isCollapsed} />
          <NavSection title={t.nav.tools} items={toolsNavItems} collapsed={isCollapsed} />
          <NavSection title={t.nav.other} items={settingsNavItems} collapsed={isCollapsed} />
        </nav>

        {!isCollapsed && (
          <div className="border-t border-sidebar-border p-4">
            <div className="rounded-xl bg-gradient-to-r from-primary/10 to-accent/10 p-3">
              <p className="text-xs font-semibold text-foreground">{t.nav.freeTitle}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{t.nav.freeDescription}</p>
            </div>
          </div>
        )}
      </motion.aside>
    </>
  );
}
