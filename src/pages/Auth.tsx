import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

const emailSchema = z.string().email("Format email tidak valid");
const passwordSchema = z.string().min(6, "Password minimal 6 karakter");

const Auth = () => {
  const navigate = useNavigate();
  const { user, loading, signIn, signUp } = useAuth();
  const { toast } = useToast();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signUpName, setSignUpName] = useState("");
  const [isCheckingRole, setIsCheckingRole] = useState(false);

  useEffect(() => {
    const checkRoleAndRedirect = async () => {
      if (user && !loading && !isCheckingRole) {
        setIsCheckingRole(true);
        try {
          // Cek role admin dari app metadata user
          const isAdmin = (user as any)?.app_metadata?.role === 'admin';
          
          if (isAdmin) {
            navigate("/admin");
          } else {
            navigate("/dashboard");
          }
        } catch {
          navigate("/dashboard");
        } finally {
          setIsCheckingRole(false);
        }
      }
    };

    checkRoleAndRedirect();
  }, [user, loading, navigate, isCheckingRole]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      emailSchema.parse(loginEmail);
      passwordSchema.parse(loginPassword);
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast({
          title: "Validasi Gagal",
          description: err.errors[0].message,
          variant: "destructive",
        });
        return;
      }
    }

    setIsSubmitting(true);
    const { error } = await signIn(loginEmail, loginPassword);
    setIsSubmitting(false);

    if (error) {
      let message = "Terjadi kesalahan saat login";
      if (error.message.includes("Invalid login credentials")) {
        message = "Email atau password salah";
      } else if (error.message.includes("Email not confirmed")) {
        message = "Email belum dikonfirmasi";
      }
      toast({
        title: "Login Gagal",
        description: message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Login Berhasil",
        description: "Selamat datang kembali!",
      });
      // Redirect will be handled by useEffect after user state updates
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      emailSchema.parse(signUpEmail);
      passwordSchema.parse(signUpPassword);
      if (!signUpName.trim()) {
        throw new Error("Nama lengkap harus diisi");
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast({
          title: "Validasi Gagal",
          description: err.errors[0].message,
          variant: "destructive",
        });
        return;
      }
      if (err instanceof Error) {
        toast({
          title: "Validasi Gagal",
          description: err.message,
          variant: "destructive",
        });
        return;
      }
    }

    setIsSubmitting(true);
    const { error } = await signUp(signUpEmail, signUpPassword, signUpName);
    setIsSubmitting(false);

    if (error) {
      let message = "Terjadi kesalahan saat mendaftar";
      if (error.message.includes("User already registered")) {
        message = "Email sudah terdaftar. Silakan login.";
      }
      toast({
        title: "Pendaftaran Gagal",
        description: message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Pendaftaran Berhasil",
        description: "Akun Anda berhasil dibuat!",
      });
      // Redirect will be handled by useEffect after user state updates
    }
  };

  if (loading || isCheckingRole) {
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
