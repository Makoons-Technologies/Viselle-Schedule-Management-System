import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/lib/api';
import { LoadingState } from '@/components/common/LoadingState';
import { PoweredByMakoons } from '@/components/common/PoweredByMakoons';
import { ViselleLogo } from '@/components/common/ViselleLogo';
import { PageSeo } from '@/components/seo/PageSeo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { marketingSeo } from '@/content/marketing-seo';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

type FormData = z.infer<typeof schema>;

export function LoginPage() {
  const { login, isAuthenticated, isLoading, user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  if (!isLoading && isAuthenticated && user) {
    if (user.role === 'platform_owner') return <Navigate to="/platform/dashboard" replace />;
    if (user.role === 'org_owner') return <Navigate to={`/orgs/${user.organizationId}/dashboard`} replace />;
    return <Navigate to={`/orgs/${user.organizationId}/calendar`} replace />;
  }

  if (isLoading) return <LoadingState />;

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const user = await login(data.email, data.password);
      if (user.role === 'platform_owner') navigate('/platform/dashboard');
      else if (user.role === 'org_owner') navigate(`/orgs/${user.organizationId}/dashboard`);
      else navigate(`/orgs/${user.organizationId}/calendar`);
      toast.success('Welcome back!');
    } catch (err) {
      if (err instanceof ApiError && err.code === 'PASSWORD_SETUP_REQUIRED') {
        toast.error('Check your email for an invite link, or use Forgot password to request a new one.');
      } else {
        toast.error(err instanceof Error ? err.message : 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gradient-to-br from-brand-50 to-stone-100 p-4 dark:from-stone-950 dark:to-stone-900">
      <PageSeo {...marketingSeo.login} />
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mb-3 flex justify-center">
            <ViselleLogo size={64} />
          </div>
          <CardTitle className="text-2xl text-brand-700">Viselle</CardTitle>
          <CardDescription>Schedule Management System</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register('email')} />
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <PasswordInput id="password" autoComplete="current-password" {...register('password')} />
              {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
            <p className="text-center text-sm text-stone-500">
              <Link to="/forgot-password" className="text-brand-700 hover:underline">
                Forgot password?
              </Link>
            </p>
            <p className="text-center text-sm text-stone-500">
              <Link to="/" className="text-brand-700 hover:underline">
                ← Back to home
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
      <PoweredByMakoons />
    </div>
  );
}
