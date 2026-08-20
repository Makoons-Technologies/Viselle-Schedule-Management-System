import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';
import { useAuth } from '@/context/AuthContext';
import { getLoginErrorMessage } from '@/lib/api';
import { signedInHomePath } from '@/lib/auth-redirect';
import { withoutReactFormReset } from '@/lib/form-submit';
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
import { MARKETING_SHELL_CLASS } from '@/lib/marketing-theme';
import { cn } from '@/lib/utils';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

type FormData = z.infer<typeof schema>;

export function LoginPage() {
  const { login, isAuthenticated, isLoading, user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  if (!isLoading && isAuthenticated && user) {
    return <Navigate to={signedInHomePath(user)} replace />;
  }

  // Keep the form mounted while a submit is in flight so a 401 cannot remount and wipe fields.
  if (isLoading && !loading) return <LoadingState />;

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setAuthError(null);
    try {
      const nextUser = await login(data.email, data.password);
      toast.success('Welcome back!');
      navigate(signedInHomePath(nextUser));
    } catch (err) {
      const message = getLoginErrorMessage(err);
      setAuthError(message);
      toast.error(message);
      reset({ email: data.email, password: '' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn(MARKETING_SHELL_CLASS, 'flex flex-col items-center justify-center gap-4 p-4')}>
      <PageSeo {...marketingSeo.login} />
      <Card className="w-full max-w-md border-white/15 bg-white/95 shadow-2xl">
        <CardHeader className="text-center">
          <div className="mb-3 flex justify-center">
            <ViselleLogo size={64} />
          </div>
          <CardTitle className="text-2xl text-brand-700">Viselle</CardTitle>
          <CardDescription>Schedule Management System</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={withoutReactFormReset(handleSubmit(onSubmit))} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="username" {...register('email')} />
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <PasswordInput id="password" autoComplete="current-password" {...register('password')} />
              {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
            </div>
            {authError && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200" role="alert">
                {authError}
              </p>
            )}
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
      <PoweredByMakoons className="text-white/40" />
    </div>
  );
}
