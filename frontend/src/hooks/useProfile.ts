import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

interface ProfileUpdateData {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
}

interface PasswordChangeData {
  currentPassword: string;
  newPassword: string;
}

interface NotificationSettings {
  emailOrderUpdates: boolean;
  emailPromotions: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
}

interface Address {
  id?: string;
  type: 'shipping' | 'billing';
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  country: string;
  zipCode: string;
  isDefault: boolean;
}

export function useProfile() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileUpdateData) => {
      // For now, simulate API call
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(data);
        }, 1000);
      });
    },
    onSuccess: () => {
      toast({
        title: t('success') || 'Success',
        description: t('profileUpdated') || 'Profile updated successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
    onError: () => {
      toast({
        title: t('error') || 'Error',
        description: t('profileUpdateFailed') || 'Failed to update profile',
        variant: 'destructive',
      });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: PasswordChangeData) => {
      // For now, simulate API call
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(data);
        }, 1000);
      });
    },
    onSuccess: () => {
      toast({
        title: t('success') || 'Success',
        description: t('passwordChanged') || 'Password changed successfully',
      });
    },
    onError: () => {
      toast({
        title: t('error') || 'Error',
        description: t('passwordChangeFailed') || 'Failed to change password',
        variant: 'destructive',
      });
    },
  });

  const updateNotificationsMutation = useMutation({
    mutationFn: async (data: NotificationSettings) => {
      // For now, simulate API call
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(data);
        }, 1000);
      });
    },
    onSuccess: () => {
      toast({
        title: t('success') || 'Success',
        description: t('notificationsUpdated') || 'Notification preferences updated',
      });
    },
    onError: () => {
      toast({
        title: t('error') || 'Error',
        description: t('notificationsUpdateFailed') || 'Failed to update notifications',
        variant: 'destructive',
      });
    },
  });

  const saveAddressMutation = useMutation({
    mutationFn: async (address: Address) => {
      // For now, simulate API call
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({ ...address, id: address.id || Date.now().toString() });
        }, 1000);
      });
    },
    onSuccess: () => {
      toast({
        title: t('success') || 'Success',
        description: t('addressSaved') || 'Address saved successfully',
      });
    },
    onError: () => {
      toast({
        title: t('error') || 'Error',
        description: t('addressSaveFailed') || 'Failed to save address',
        variant: 'destructive',
      });
    },
  });

  const deleteAddressMutation = useMutation({
    mutationFn: async (addressId: string) => {
      // For now, simulate API call
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(addressId);
        }, 1000);
      });
    },
    onSuccess: () => {
      toast({
        title: t('success') || 'Success',
        description: t('addressDeleted') || 'Address deleted successfully',
      });
    },
    onError: () => {
      toast({
        title: t('error') || 'Error',
        description: t('addressDeleteFailed') || 'Failed to delete address',
        variant: 'destructive',
      });
    },
  });

  return {
    updateProfile: updateProfileMutation.mutate,
    changePassword: changePasswordMutation.mutate,
    updateNotifications: updateNotificationsMutation.mutate,
    saveAddress: saveAddressMutation.mutate,
    deleteAddress: deleteAddressMutation.mutate,
    isUpdatingProfile: updateProfileMutation.isPending,
    isChangingPassword: changePasswordMutation.isPending,
    isUpdatingNotifications: updateNotificationsMutation.isPending,
    isSavingAddress: saveAddressMutation.isPending,
    isDeletingAddress: deleteAddressMutation.isPending,
  };
}