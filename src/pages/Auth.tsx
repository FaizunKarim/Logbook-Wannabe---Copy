import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Auth = () => {
  const navigate = useNavigate();
  const { user, loading, login, loginWithGoogle, register } = useAuth();
  const { toast } = useToast();
  const googleButtonRef = useRef<HTMLDivElement>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signUpName, setSignUpName] = useState("");

  useEffect(() => {
    if (user && !loading) {
      navigate(user.role === "admin" ? "/admin" : "/dashboard");
    }
  }, [user, loading, navigate]);

  // Fetch Google Client ID from backend, then load Google Sign-In
  const [googleClientId, setGoogleClientId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/config")
      .then((res) => res.json())
      .then((data) => {
        if (data.googleClientId) {
          setGoogleClientId(data.googleClientId);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!googleClientId) return;

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google && googleButtonRef.current) {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleGoogleResponse,
          cancel_on_tap_outside: false,
        });
        window.google.accounts.id.renderButton(
          googleButtonRef.current,
          { theme: "outline", size: "large", width: "100%", text: "signin_with", shape: "rectangular" }
        );
      }
    };
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, [googleClientId]);

  const handleGoogleResponse = async (response: any) => {
    setIsGoogleLoading(true);
    const { error } = await loginWithGoogle(response.credential);
    setIsGoogleLoading(false);

    if (error) {
      toast({
        title: "Login Google Gagal",
        description: error,
        variant: "destructive",
      });
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!loginEmail || !loginPassword) {
      toast({ title: "Validasi Gagal", description: "Email dan password harus diisi", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    const { error } = await login(loginEmail, loginPassword);
    setIsSubmitting(false);

    if (error) {
      toast({ title: "Login Gagal", description: error, variant: "destructive" });
    } else {
      toast({ title: "Login Berhasil", description: "Selamat datang kembali!" });
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!signUpName.trim()) {
      toast({ title: "Validasi Gagal", description: "Nama lengkap harus diisi", variant: "destructive" });
      return;
    }
    if (!signUpEmail) {
      toast({ title: "Validasi Gagal", description: "Email harus diisi", variant: "destructive" });
      return;
    }
    if (signUpPassword.length < 6) {
      toast({ title: "Validasi Gagal", description: "Password minimal 6 karakter", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    const { error } = await register(signUpEmail, signUpPassword, signUpName);
    setIsSubmitting(false);

    if (error) {
      toast({ title: "Pendaftaran Gagal", description: error, variant: "destructive" });
    } else {
      toast({
        title: "Pendaftaran Berhasil",
        description: "Akun Anda berhasil dibuat! Silakan login.",
      });
      setLoginEmail(signUpEmail);
      setLoginPassword(signUpPassword);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-accent">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-accent p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="flex items-center gap-2 text-primary">
              <img src="/apple-touch-icon.png" alt="Logo" className="h-10 w-10" />
              <span className="text-2xl font-bold">Logbook</span>
            </div>
          </div>
          <CardTitle className="text-xl">Selamat Datang</CardTitle>
          <CardDescription>
            Silakan masuk atau daftar untuk melanjutkan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Google Sign-In Button */}
          {googleClientId && (
            <div className="mb-6">
              <div ref={googleButtonRef} className="flex justify-center"></div>
              {isGoogleLoading && (
                <div className="flex justify-center mt-2">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              )}
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Atau</span>
                </div>
              </div>
            </div>
          )}

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Masuk</TabsTrigger>
              <TabsTrigger value="signup">Daftar</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="email@contoh.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="Masukkan password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Memproses...
                    </>
                  ) : (
                    "Masuk"
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Nama Lengkap</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="Nama lengkap Anda"
                    value={signUpName}
                    onChange={(e) => setSignUpName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="email@contoh.com"
                    value={signUpEmail}
                    onChange={(e) => setSignUpEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="Minimal 6 karakter"
                    value={signUpPassword}
                    onChange={(e) => setSignUpPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Memproses...
                    </>
                  ) : (
                    "Daftar"
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;

// Type declaration for Google's API
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          renderButton: (element: HTMLElement, options: any) => void;
        };
      };
    };
  }
}