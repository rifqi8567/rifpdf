import { useEffect } from 'react';
import { Menu, Bell, Search, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ThemeToggle } from '@/components/common/theme-toggle';
import { LanguageToggle } from '@/components/common/language-toggle';
import { useSidebarStore } from '@/store/sidebar-store';
import { useAuthStore } from '@/store/auth-store';
import { supabase } from '@/lib/supabase';
import { getUserProfile } from '@/services/profile';
import { debugAction, debugError } from '@/lib/debug';
import { useTranslation } from '@/lib/i18n';

export function DashboardHeader() {
  const { setOpen } = useSidebarStore();
  const { user, setUser } = useAuthStore();
  const { t } = useTranslation();

  useEffect(() => {
    const initSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user && !user) {
        debugAction('auth', 'session hydrate start', { userId: session.user.id });
        const profile = await getUserProfile(session.user);
        setUser(profile);
        debugAction('auth', 'session hydrate success', {
          userId: profile.id,
          hasAvatar: Boolean(profile.avatar_url),
        });
      }
    };
    initSession();
  }, [user, setUser]);

  const handleLogout = async () => {
    try {
      debugAction('auth', 'logout clicked', { userId: user?.id });
      await supabase.auth.signOut();
      debugAction('auth', 'logout success', { userId: user?.id });
      window.location.href = '/login';
    } catch (error) {
      debugError('auth', 'logout failed', error, { userId: user?.id });
      console.error('Error logging out:', error);
    }
  };

  const displayName = user?.full_name || 'User';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-16 min-w-0 items-center gap-2 border-b border-border bg-background/80 px-3 backdrop-blur-xl sm:gap-3 sm:px-4 lg:px-6">
      {/* Mobile menu */}
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => setOpen(true)}
        className="lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Search */}
      <div className="relative hidden min-w-0 flex-1 max-w-md md:block">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t.header.search}
          className="pl-9 bg-secondary/50 border-transparent focus-visible:border-border"
        />
        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center gap-1 rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
          ⌘K
        </kbd>
      </div>

      {/* Right section */}
      <div className="ml-auto flex min-w-0 shrink-0 items-center gap-1.5 sm:gap-2">
        <LanguageToggle />
        <ThemeToggle />

        <Button variant="ghost" size="icon-sm" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full gradient-bg text-[9px] font-bold text-white">
            3
          </span>
        </Button>

        <div className="flex min-w-0 items-center gap-1.5 sm:gap-3 sm:ml-2 sm:pl-3 sm:border-l sm:border-border">
          <div className="hidden sm:flex items-center gap-3">
            <div className="h-9 w-9 rounded-full gradient-bg flex items-center justify-center text-white text-sm font-semibold shadow-sm overflow-hidden">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                initial
              )}
            </div>
            <div className="hidden md:block">
              <p className="text-sm font-medium leading-none">{displayName}</p>
              <p className="mt-1 text-[10px] text-muted-foreground">{t.header.plan}</p>
            </div>
          </div>
          
          <Button 
            variant="ghost" 
            size="icon-sm" 
            onClick={handleLogout}
            title={t.header.logout}
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
