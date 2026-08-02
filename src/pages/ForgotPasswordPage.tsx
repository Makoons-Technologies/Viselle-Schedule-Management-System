import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';
import { authApi } from '@/lib/api';
import { ViselleLogo } from '@/components/common/ViselleLogo';
import { PageSeo } from '@/components/seo/PageSeo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { marketingSeo } from '@/content/marketing-seo';
import { MARKETING_SHELL_CLASS } from '@/lib/marketing-theme';
import { cn } from '@/lib/utils';

const schema = z.object({
  email: z.string().email(),
});

type FormData = z.infer<typeof schema>;

export function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const result = await authApi.forgotPassword(data.email);
      setSubmitted(true);
      toast.success(result.message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn(MARKETING_SHELL_CLASS, 'flex items-center justify-center p-4')}>
      <PageSeo {...marketingSeo.forgotPassword} />
      <Card className="w-full max-w-md border-white/15 bg-white/95 shadow-2xl">
        <CardHeader className="text-center">
          <div className="mb-3 flex justify-center">
            <ViselleLogo size={56} />
          </div>
          <CardTitle className="text-2xl text-brand-700">Forgot password</CardTitle>
          <CardDescription>
            Enter your email and we will send a link to set a new password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {submitted ? (
            <div className="space-y-4 text-center text-sm text-stone-600 dark:text-stone-400">
              <p>
                If an account exists for that email, we sent a password reset link.
                Check your inbox and spam folder.
              </p>
              <Button asChild className="w-full">
                <Link to="/login">Back to sign in</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" autoComplete="email" {...register('email')} />
                {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Sending...' : 'Send reset link'}
              </Button>
              <p className="text-center text-sm text-stone-500">
                <Link to="/login" className="text-brand-700 hover:underline">
                  Back to sign in
                </Link>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
