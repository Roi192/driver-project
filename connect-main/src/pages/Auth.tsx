import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { Shield, Loader2 } from 'lucide-react';
import unitLogo from '@/assets/unit-logo.png';
import bgVehicles from '@/assets/bg-vehicles.png';

export default function Auth() {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [outpost, setOutpost] = useState('');
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({
        title: 'שגיאה',
        description: 'נא למלא אימייל וסיסמה',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    const { error } = await signIn(email, password);
    setIsLoading(false);

    if (error) {
      toast({
        title: 'שגיאה בהתחברות',
        description: error.message === 'Invalid login credentials' 
          ? 'אימייל או סיסמה שגויים' 
          : error.message,
        variant: 'destructive',
      });
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !fullName) {
      toast({
        title: 'שגיאה',
        description: 'נא למלא את כל השדות הנדרשים',
        variant: 'destructive',
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: 'שגיאה',
        description: 'הסיסמה חייבת להכיל לפחות 6 תווים',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    const { error } = await signUp(email, password, fullName, outpost);
    setIsLoading(false);

    if (error) {
      if (error.message.includes('already registered')) {
        toast({
          title: 'שגיאה',
          description: 'המשתמש כבר רשום במערכת',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'שגיאה בהרשמה',
          description: error.message,
          variant: 'destructive',
        });
      }
    } else {
      toast({
        title: 'נרשמת בהצלחה!',
        description: 'ברוך הבא למערכת',
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" dir="rtl">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-20"
        style={{ backgroundImage: `url(${bgVehicles})` }}
      />
      
      {/* Gradient Overlays */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background/95 to-primary/10" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--primary)/0.15),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,hsl(var(--accent)/0.1),transparent_50%)]" />
      
      {/* Decorative Elements */}
      <div className="absolute top-20 right-10 w-72 h-72 bg-gradient-to-br from-primary/20 to-accent/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 left-10 w-56 h-56 bg-gradient-to-br from-accent/15 to-primary/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      
      {/* Floating particles */}
      <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-primary/40 rounded-full animate-float" />
      <div className="absolute top-1/3 right-1/3 w-3 h-3 bg-accent/30 rounded-full animate-float" style={{ animationDelay: '0.5s' }} />
      <div className="absolute bottom-1/3 left-1/2 w-2 h-2 bg-primary/30 rounded-full animate-float" style={{ animationDelay: '1s' }} />

      <Card className="w-full max-w-md relative z-10 premium-card border-primary/30 backdrop-blur-xl bg-card/80 animate-scale-in overflow-hidden">
        {/* Card Glow Effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
        
        <CardHeader className="text-center space-y-4 pt-8 relative">
          {/* Unit Logo with Glow */}
          <div className="mx-auto elite-badge animate-fade-in">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary to-accent rounded-full blur-xl opacity-50 animate-pulse" />
              <img 
                src={unitLogo} 
                alt="סמל הפלוגה" 
                className="w-24 h-24 object-contain relative z-10 drop-shadow-2xl"
              />
            </div>
          </div>
          
          <div className="space-y-3 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <CardTitle className="text-3xl font-black bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
              מערכת נהגי בט"ש
            </CardTitle>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-primary/20 to-accent/20 border border-primary/30">
              <span className="text-primary font-black text-sm">נהג מוביל - פלוגה מנצחת</span>
            </div>
            <CardDescription className="text-muted-foreground text-base">
              התחבר או הירשם כדי להמשיך
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="pb-8 relative">
          <Tabs defaultValue="login" className="w-full animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <TabsList className="grid w-full grid-cols-2 mb-6 bg-secondary/50 p-1 rounded-xl">
              <TabsTrigger 
                value="login" 
                className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all duration-300"
              >
                התחברות
              </TabsTrigger>
              <TabsTrigger 
                value="signup" 
                className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all duration-300"
              >
                הרשמה
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="animate-fade-in">
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="login-email" className="text-slate-800 font-semibold">אימייל</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    dir="ltr"
                    className="text-right bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-primary focus:ring-primary/30 transition-all duration-300 h-12 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password" className="text-slate-800 font-semibold">סיסמה</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    dir="ltr"
                    className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-primary focus:ring-primary/30 transition-all duration-300 h-12 rounded-xl"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-12 cta-button text-base font-bold rounded-xl" 
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin ml-2" />
                      מתחבר...
                    </>
                  ) : (
                    'התחבר למערכת'
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="animate-fade-in">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name" className="text-slate-800 font-semibold">שם מלא *</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="ישראל ישראלי"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-primary focus:ring-primary/30 transition-all duration-300 h-12 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-slate-800 font-semibold">אימייל *</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    dir="ltr"
                    className="text-right bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-primary focus:ring-primary/30 transition-all duration-300 h-12 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-slate-800 font-semibold">סיסמה *</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="לפחות 6 תווים"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    dir="ltr"
                    className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-primary focus:ring-primary/30 transition-all duration-300 h-12 rounded-xl"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-12 cta-button text-base font-bold rounded-xl" 
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin ml-2" />
                      נרשם...
                    </>
                  ) : (
                    'הירשם למערכת'
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="flex items-center justify-center gap-3 pt-6 mt-6 border-t border-border/30 animate-slide-up" style={{ animationDelay: '0.4s' }}>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20">
              <Shield className="w-5 h-5 text-primary" />
              <span className="text-primary font-black">פלנ"ג בנימין</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}