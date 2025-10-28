'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useFormValidation } from '@/hooks/useFormValidation';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { validateEmail, validatePassword } from '@shared/utils/validation';

interface LoginFormProps {
  onSuccess?: () => void;
  redirectTo?: string;
}

interface FormData {
  email: string;
  password: string;
}

export default function LoginForm({ onSuccess, redirectTo = '/feed' }: LoginFormProps) {
  const { login } = useAuth();
  const { showSuccess } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [formState, formActions] = useFormValidation<FormData>(
    { email: '', password: '' },
    {
      fields: {
        email: {
          rules: [
            {
              validate: (value) => !value.trim() ? 'Email is required' : null,
            },
            {
              validate: (value) => !validateEmail(value) ? 'Please enter a valid email address' : null,
            },
          ],
          validateOnBlur: true,
        },
        password: {
          rules: [
            {
              validate: (value) => !value ? 'Password is required' : null,
            },
            {
              validate: (value) => !validatePassword(value) ? 'Password must be at least 6 characters long' : null,
            },
          ],
          validateOnBlur: true,
        },
      },
      validateOnSubmit: true,
    }
  );

  useEffect(() => {
    const message = searchParams.get('message');
    if (message) {
      showSuccess(message);
      // Clear the message from URL without triggering a navigation
      const url = new URL(window.location.href);
      url.searchParams.delete('message');
      window.history.replaceState({}, '', url.toString());
    }
  }, [searchParams, showSuccess]);

  const handleInputChange = (field: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    formActions.setValue(field, e.target.value);
  };

  const handleInputBlur = (field: keyof FormData) => () => {
    formActions.setTouched(field, true);
  };

  const handleSubmit = formActions.handleSubmit(
    async (data) => {
      await login(data.email, data.password);
      
      if (onSuccess) {
        onSuccess();
      } else {
        router.push(redirectTo);
      }
    },
    {
      showSuccessToast: false, // Don't show success toast for login
    }
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Input
        label="Email address"
        type="email"
        value={formState.data.email}
        onChange={handleInputChange('email')}
        onBlur={handleInputBlur('email')}
        error={formState.touched.email ? formState.errors.email : undefined}
        placeholder="Enter your email"
        required
        autoComplete="email"
        disabled={formState.isSubmitting}
      />

      <Input
        label="Password"
        type="password"
        value={formState.data.password}
        onChange={handleInputChange('password')}
        onBlur={handleInputBlur('password')}
        error={formState.touched.password ? formState.errors.password : undefined}
        placeholder="Enter your password"
        required
        autoComplete="current-password"
        disabled={formState.isSubmitting}
      />

      <Button
        type="submit"
        className="w-full"
        loading={formState.isSubmitting}
        disabled={formState.isSubmitting}
      >
        {formState.isSubmitting ? 'Signing in...' : 'Sign in'}
      </Button>
    </form>
  );
}