import { useEffect } from 'react';
import { Menu, Bell, Search, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ThemeToggle } from '@/components/common/theme-toggle';
import { useSidebarStore } from '@/store/sidebar-store';
import { useAuthStore } from '@/store/auth-store';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';

export function DashboardHeader() {
  const { setOpen } = useSidebarStore();
  const { user, setUser } = useAuthStore();

  useEffect(() => {
    const initSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user && !user) {
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          full_name: session.user.user_metadata?.full_name || 'User',
          plan: 'free',
          credits_remaining: 10,
          created_at: session.user.created_at,
          updated_at: session.user.updated_at || session.user.created_at,
        });
      }
    };
    initSession();
  }, [user, setUser]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      window.location.href = '/login';
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const displayName = user?.full_name || 'User';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-background/80 backdrop-blur-xl px-4 lg:px-6">
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
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Cari dokumen, chat, tools..."
          className="pl-9 bg-secondary/50 border-transparent focus-visible:border-border"
        />
        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center gap-1 rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
          ⌘K
        </kbd>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-4 ml-auto">
        <ThemeToggle />

        <Button variant="ghost" size="icon-sm" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full gradient-bg text-[9px] font-bold text-white">
            3
          </span>
        </Button>

        <div className="flex items-center gap-4 ml-4 pl-4 border-l border-border">
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
              <Badge variant="default" className="mt-1 text-[10px]">
                {user?.plan === 'pro' ? 'Pro' : 'Free'}
              </Badge>
            </div>
          </div>
          
          <Button 
            variant="ghost" 
            size="icon-sm" 
            onClick={handleLogout}
            title="Keluar (Logout)"
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
