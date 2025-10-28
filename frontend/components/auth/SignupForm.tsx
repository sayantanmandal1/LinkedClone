'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useFormValidation } from '@/hooks/useFormValidation';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { validateUserRegistration } from '@/lib/validation';

interface SignupFormProps {
  onSuccess?: () => void;
  redirectTo?: string;
}

interface FormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export default function SignupForm({ onSuccess, redirectTo = '/login' }: SignupFormProps) {
  const { register } = useAuth();
  const router = useRouter();

  const [formState, formActions] = useFormValidation<FormData>(
    { name: '', email: '', password: '', confirmPassword: '' },
    {
      fields: {
        name: {
          rules: [
            {
              validate: (value) => {
                const result = validateUserRegistration({ name: value, email: '', password: '' });
                const nameError = result.errors.find(error => error.includes('Name'));
                return nameError || null;
              },
            },
          ],
          validateOnBlur: true,
        },
        email: {
          rules: [
            {
              validate: (value) => {
                const result = validateUserRegistration({ name: '', email: value, password: '' });
                const emailError = result.errors.find(error => error.includes('email'));
                return emailError || null;
              },
            },
          ],
          validateOnBlur: true,
        },
        password: {
          rules: [
            {
              validate: (value) => {
                const result = validateUserRegistration({ name: '', email: '', password: value });
                const passwordError = result.errors.find(error => error.includes('Password'));
                return passwordError || null;
              },
            },
          ],
          validateOnBlur: true,
        },
        confirmPassword: {
          rules: [
            {
              validate: (value) => !value ? 'Please confirm your password' : null,
            },
            {
              validate: (value, formData) => 
                formData?.password !== value ? 'Passwords do not match' : null,
            },
          ],
          validateOnChange: true,
          validateOnBlur: true,
        },
      },
      validateOnSubmit: true,
    }
  );

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
      await register(data.name, data.email, data.password);
      
      // Show success message and redirect to login
      if (onSuccess) {
        onSuccess();
      } else {
        // Add a success message before redirecting
        router.push(`${redirectTo}?message=Registration successful! Please log in.`);
      }
    },
    {
      showSuccessToast: false, // We'll show success via URL message
    }
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Input
        label="Full name"
        type="text"
        value={formState.data.name}
        onChange={handleInputChange('name')}
        onBlur={handleInputBlur('name')}
        error={formState.touched.name ? formState.errors.name : undefined}
        placeholder="Enter your full name"
        required
        autoComplete="name"
        disabled={formState.isSubmitting}
      />

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
        placeholder="Create a password (min. 6 characters)"
        required
        autoComplete="new-password"
        disabled={formState.isSubmitting}
      />

      <Input
        label="Confirm password"
        type="password"
        value={formState.data.confirmPassword}
        onChange={handleInputChange('confirmPassword')}
        onBlur={handleInputBlur('confirmPassword')}
        error={formState.touched.confirmPassword ? formState.errors.confirmPassword : undefined}
        placeholder="Confirm your password"
        required
        autoComplete="new-password"
        disabled={formState.isSubmitting}
      />

      <Button
        type="submit"
        className="w-full"
        loading={formState.isSubmitting}
        disabled={formState.isSubmitting}
      >
        {formState.isSubmitting ? 'Creating account...' : 'Create account'}
      </Button>
    </form>
  );
}