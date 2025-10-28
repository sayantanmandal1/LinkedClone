import { useState, useCallback, useEffect } from 'react';
import { ErrorHandler } from '@/lib/errorHandler';

interface ValidationRule<T> {
  validate: (value: T, formData?: Record<string, any>) => string | null;
  message?: string;
}

interface FieldConfig<T = any> {
  rules?: ValidationRule<T>[];
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
}

interface FormConfig<T extends Record<string, any>> {
  fields: {
    [K in keyof T]: FieldConfig<T[K]>;
  };
  validateOnSubmit?: boolean;
}

interface FormState<T extends Record<string, any>> {
  data: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isValid: boolean;
  isSubmitting: boolean;
}

interface FormActions<T extends Record<string, any>> {
  setValue: <K extends keyof T>(field: K, value: T[K]) => void;
  setError: <K extends keyof T>(field: K, error: string | null) => void;
  setTouched: <K extends keyof T>(field: K, touched?: boolean) => void;
  validateField: <K extends keyof T>(field: K) => string | null;
  validateForm: () => boolean;
  clearErrors: () => void;
  clearForm: () => void;
  setSubmitting: (submitting: boolean) => void;
  handleSubmit: (
    onSubmit: (data: T) => Promise<void> | void,
    options?: { showSuccessToast?: boolean; successMessage?: string }
  ) => (e: React.FormEvent) => Promise<void>;
  handleApiError: (error: unknown) => void;
}

export function useFormValidation<T extends Record<string, any>>(
  initialData: T,
  config: FormConfig<T>
): [FormState<T>, FormActions<T>] {
  const [data, setData] = useState<T>(initialData);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouchedState] = useState<Partial<Record<keyof T, boolean>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate if form is valid
  const isValid = Object.keys(errors).length === 0;

  const validateField = useCallback(<K extends keyof T>(field: K): string | null => {
    const fieldConfig = config.fields[field];
    const value = data[field];

    if (!fieldConfig?.rules) {
      return null;
    }

    for (const rule of fieldConfig.rules) {
      const error = rule.validate(value, data);
      if (error) {
        return error;
      }
    }

    return null;
  }, [data, config.fields]);

  const validateForm = useCallback((): boolean => {
    const newErrors: Partial<Record<keyof T, string>> = {};
    let hasErrors = false;

    for (const field in config.fields) {
      const error = validateField(field);
      if (error) {
        newErrors[field] = error;
        hasErrors = true;
      }
    }

    setErrors(newErrors);
    return !hasErrors;
  }, [config.fields, validateField]);

  const setValue = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    setData(prev => ({ ...prev, [field]: value }));

    // Clear error for this field when value changes
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }

    // Validate on change if configured
    const fieldConfig = config.fields[field];
    if (fieldConfig?.validateOnChange && touched[field]) {
      setTimeout(() => {
        const error = validateField(field);
        setErrors(prev => ({
          ...prev,
          [field]: error || undefined,
        }));
      }, 0);
    }
  }, [errors, touched, config.fields, validateField]);

  const setError = useCallback(<K extends keyof T>(field: K, error: string | null) => {
    setErrors(prev => ({
      ...prev,
      [field]: error || undefined,
    }));
  }, []);

  const setTouched = useCallback(<K extends keyof T>(field: K, isTouched = true) => {
    setTouchedState(prev => ({ ...prev, [field]: isTouched }));

    // Validate on blur if configured
    if (isTouched) {
      const fieldConfig = config.fields[field];
      if (fieldConfig?.validateOnBlur) {
        const error = validateField(field);
        setErrors(prev => ({
          ...prev,
          [field]: error || undefined,
        }));
      }
    }
  }, [config.fields, validateField]);

  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  const clearForm = useCallback(() => {
    setData(initialData);
    setErrors({});
    setTouchedState({});
    setIsSubmitting(false);
  }, [initialData]);

  const setSubmitting = useCallback((submitting: boolean) => {
    setIsSubmitting(submitting);
  }, []);

  const handleApiError = useCallback((error: unknown) => {
    const { fieldErrors, generalError } = ErrorHandler.handleFormError(error, {
      showToast: true,
    });

    // Set field-specific errors
    const newErrors: Partial<Record<keyof T, string>> = {};
    for (const [field, message] of Object.entries(fieldErrors)) {
      if (field in data) {
        newErrors[field as keyof T] = message;
      }
    }

    setErrors(prev => ({ ...prev, ...newErrors }));

    // If there's a general error and no field errors, show it as a toast
    // (ErrorHandler already handles this, but we could also set a general error field if needed)
  }, [data]);

  const handleSubmit = useCallback((
    onSubmit: (data: T) => Promise<void> | void,
    options: { showSuccessToast?: boolean; successMessage?: string } = {}
  ) => {
    return async (e: React.FormEvent) => {
      e.preventDefault();

      const { showSuccessToast = false, successMessage = 'Operation completed successfully' } = options;

      // Mark all fields as touched
      const allTouched: Partial<Record<keyof T, boolean>> = {};
      for (const field in config.fields) {
        allTouched[field] = true;
      }
      setTouchedState(allTouched);

      // Validate form if configured
      if (config.validateOnSubmit !== false) {
        if (!validateForm()) {
          return;
        }
      }

      setIsSubmitting(true);

      try {
        await onSubmit(data);
        
        if (showSuccessToast) {
          ErrorHandler.handleSuccess(successMessage);
        }
      } catch (error) {
        handleApiError(error);
      } finally {
        setIsSubmitting(false);
      }
    };
  }, [data, config, validateForm, handleApiError]);

  return [
    { data, errors, touched, isValid, isSubmitting },
    {
      setValue,
      setError,
      setTouched,
      validateField,
      validateForm,
      clearErrors,
      clearForm,
      setSubmitting,
      handleSubmit,
      handleApiError,
    }
  ];
}