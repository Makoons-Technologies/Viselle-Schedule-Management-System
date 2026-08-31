import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';
import { useAuth } from '@/context/AuthContext';
import { getApiErrorMessage } from '@/lib/api';
import { signedInHomePath } from '@/lib/auth-redirect';
import { withoutReactFormReset } from '@/lib/form-submit';
import { confirmPasswordAfterPasswordChange } from '@/lib/password-autofill';
import { LoadingState } from '@/components/common/LoadingState';
import { ViselleLogo } from '@/components/common/ViselleLogo';
import { PageSeo } from '@/components/seo/PageSeo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { marketingSeo } from '@/content/marketing-seo';

const schema = z
  .object({
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(6),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type FormData = z.infer<typeof schema>;

export function SetPasswordPage() {
  const { completePasswordSetup, isAuthenticated, isLoading, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, setValue, getValues, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });
  const passwordField = register('password');
  const confirmPasswordField = register('confirmPassword');

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invalid link</CardTitle>
            <CardDescription>This password setup link is missing or invalid.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link to="/login">Go to sign in</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isLoading && isAuthenticated && user) {
    return <Navigate to={signedInHomePath(user)} replace />;
  }

  if (isLoading && !submitting) return <LoadingState />;

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    try {
      const nextUser = await completePasswordSetup(token, data.password);
      toast.success('Password set. Welcome!');
      navigate(signedInHomePath(nextUser));
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not set password'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-marketing p-4 text-white">
      <PageSeo {...marketingSeo.setPassword} />
      <Card className="w-full max-w-md border-white/15 bg-white/95 shadow-2xl">
        <CardHeader className="text-center">
          <div className="mb-3 flex justify-center">
            <ViselleLogo size={56} />
          </div>
          <CardTitle className="text-2xl text-brand-700">Set your password</CardTitle>
          <CardDescription>Choose a password for your Viselle account.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={withoutReactFormReset(handleSubmit(onSubmit))} className="space-y-4">
            <div>
              <Label htmlFor="password">Password</Label>
              <PasswordInput
                id="password"
                autoComplete="new-password"
                {...passwordField}
                onChange={(event) => {
                  const nextPassword = event.target.value;
                  const previousPassword = getValues('password') ?? '';
                  const confirmState = getValues('confirmPassword') ?? '';
                  const confirmDomValue =
                    (event.currentTarget.form?.elements.namedItem('confirmPassword') as HTMLInputElement | null)
                      ?.value ?? '';
                  void passwordField.onChange(event);
                  const nextConfirm = confirmPasswordAfterPasswordChange({
                    nextPassword,
                    previousPassword,
                    confirmState,
                    confirmDomValue,
                  });
                  if (nextConfirm != null) {
                    setValue('confirmPassword', nextConfirm, {
                      shouldDirty: true,
                      shouldValidate: true,
                    });
                  }
                }}
              />
              {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <PasswordInput
                id="confirmPassword"
                autoComplete="new-password"
                {...confirmPasswordField}
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-xs text-red-600">{errors.confirmPassword.message}</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Saving...' : 'Set password and sign in'}
            </Button>
            <p className="text-center text-sm text-stone-500">
              <Link to="/login" className="text-brand-700 hover:underline">
                Already have a password? Sign in
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
