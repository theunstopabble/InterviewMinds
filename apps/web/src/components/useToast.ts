import { toast } from 'sonner';

interface ToastOptions {
  duration?: number;
  dismissible?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const useToast = () => {
  const success = (message: string, options?: ToastOptions) => {
    toast.success(message, {
      duration: options?.duration || 4000,
      dismissible: options?.dismissible ?? true,
      action: options?.action,
    });
  };

  const error = (message: string, options?: ToastOptions) => {
    toast.error(message, {
      duration: options?.duration || 6000,
      dismissible: options?.dismissible ?? true,
      action: options?.action,
    });
  };

  const warning = (message: string, options?: ToastOptions) => {
    toast.warning(message, {
      duration: options?.duration || 5000,
      dismissible: options?.dismissible ?? true,
      action: options?.action,
    });
  };

  const info = (message: string, options?: ToastOptions) => {
    toast.info(message, {
      duration: options?.duration || 4000,
      dismissible: options?.dismissible ?? true,
      action: options?.action,
    });
  };

  const loading = (message: string) => {
    return toast.loading(message, {
      duration: Infinity,
    });
  };

  const dismiss = (id?: string) => {
    if (id) {
      toast.dismiss(id);
    } else {
      toast.dismiss();
    }
  };

  const promise = <T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string;
      error: string;
    }
  ) => {
    return toast.promise(promise, {
      loading: messages.loading,
      success: messages.success,
      error: messages.error,
    });
  };

  return {
    success,
    error,
    warning,
    info,
    loading,
    dismiss,
    promise,
  };
};

// Pre-defined toast messages for common scenarios
export const toastMessages = {
  // Auth
  auth: {
    loginSuccess: 'Successfully signed in!',
    logoutSuccess: 'Signed out successfully',
    sessionExpired: 'Your session has expired. Please sign in again.',
  },

  // Resume
  resume: {
    uploadSuccess: 'Resume uploaded successfully!',
    uploadError: 'Failed to upload resume. Please try again.',
    deleteSuccess: 'Resume deleted successfully',
    parseError: 'Failed to parse resume. Please check the format.',
  },

  // Interview
  interview: {
    startSuccess: 'Interview started!',
    endSuccess: 'Interview completed!',
    saveError: 'Failed to save interview progress.',
    connectionLost: 'Connection lost. Reconnecting...',
  },

  // Enterprise Features
  enterprise: {
    settingsSaved: 'Settings saved successfully!',
    settingsError: 'Failed to save settings.',
    keyGenerated: 'Encryption keys generated!',
    keyRotated: 'Keys rotated successfully!',
    biometricEnrolled: 'Biometric enrolled successfully!',
    biometricFailed: 'Biometric enrollment failed.',
    ssoConnected: 'SSO provider connected!',
    webhookRegistered: 'Webhook registered!',
  },

  // Admin
  admin: {
    exportSuccess: 'Data exported successfully!',
    exportError: 'Failed to export data.',
    tenantCreated: 'Tenant created successfully!',
    compliancePass: 'Compliance check passed!',
  },
};

export default useToast;