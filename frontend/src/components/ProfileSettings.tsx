import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  MapPin, 
  Bell, 
  Shield, 

  Smartphone,
  Mail,

  Save,
  Upload,
  Trash2,
  Plus,

  AlertCircle,
  Settings,

} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  avatar?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other';
}

interface DeliveryAddress {
  id: string;
  title: string;
  fullName: string;
  phone: string;
  country: string;
  city: string;
  address: string;
  postalCode: string;
  isDefault: boolean;
}

interface NotificationSettings {
  emailOrderUpdates: boolean;
  emailMarketing: boolean;
  smsOrderUpdates: boolean;
  smsMarketing: boolean;
  pushNotifications: boolean;
}

const mockAddresses: DeliveryAddress[] = [
  {
    id: '1',
    title: 'Дом',
    fullName: 'Иван Петров',
    phone: '+7 (999) 123-45-67',
    country: 'Россия',
    city: 'Москва',
    address: 'ул. Примерная, д. 10, кв. 5',
    postalCode: '123456',
    isDefault: true
  },
  {
    id: '2',
    title: 'Офис',
    fullName: 'Иван Петров',
    phone: '+7 (999) 123-45-67',
    country: 'Россия',
    city: 'Москва',
    address: 'Бизнес-центр "Пример", оф. 301',
    postalCode: '123457',
    isDefault: false
  }
];

export function ProfileSettings() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { toast } = useToast();
  const { 
    updateProfile, 
    changePassword,
    isUpdatingProfile,
    isChangingPassword
  } = useProfile();
  
  const [profile, setProfile] = useState<UserProfile>({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: '+7 (999) 123-45-67',
    dateOfBirth: '1990-01-15',
    gender: 'male'
  });

  const [addresses, setAddresses] = useState<DeliveryAddress[]>(mockAddresses);
  const [notifications, setNotifications] = useState<NotificationSettings>({
    emailOrderUpdates: true,
    emailMarketing: false,
    smsOrderUpdates: true,
    smsMarketing: false,
    pushNotifications: true
  });

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const handleProfileUpdate = () => {
    updateProfile({
      firstName: profile.firstName,
      lastName: profile.lastName,
      email: profile.email,
      phone: profile.phone,
      dateOfBirth: profile.dateOfBirth
    });
  };

  const handleAddressAdd = () => {
    const newAddress: DeliveryAddress = {
      id: Date.now().toString(),
      title: 'Новый адрес',
      fullName: profile.firstName + ' ' + profile.lastName,
      phone: profile.phone,
      country: 'Россия',
      city: '',
      address: '',
      postalCode: '',
      isDefault: false
    };
    setAddresses([...addresses, newAddress]);
  };

  const handleAddressDelete = (id: string) => {
    setAddresses(addresses.filter(addr => addr.id !== id));
    toast({
      title: "Адрес удален",
      description: "Адрес успешно удален из списка",
    });
  };

  const handlePasswordChange = () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: t('error'),
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    changePassword({
      currentPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword
    });
    setShowPasswordForm(false);
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">{t('settingsTab')}</h2>
        <Button onClick={handleProfileUpdate} disabled={isUpdatingProfile}>
          <Save className="h-4 w-4 mr-2" />
          {isUpdatingProfile ? t('saving') : t('save')}
        </Button>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Профиль
          </TabsTrigger>
          <TabsTrigger value="addresses" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Адреса
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Уведомления
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Безопасность
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Личная информация</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar */}
              <div className="flex items-center gap-6">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={profile.avatar} />
                  <AvatarFallback className="text-xl">
                    {profile.firstName[0]}{profile.lastName[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <Button variant="outline" size="sm">
                    <Upload className="h-4 w-4 mr-2" />
                    Загрузить фото
                  </Button>
                  <Button variant="ghost" size="sm" className="text-red-600">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Удалить фото
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Имя *</Label>
                  <Input
                    id="firstName"
                    value={profile.firstName}
                    onChange={(e) => setProfile(prev => ({ ...prev, firstName: e.target.value }))}
                    placeholder="Введите ваше имя"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Фамилия *</Label>
                  <Input
                    id="lastName"
                    value={profile.lastName}
                    onChange={(e) => setProfile(prev => ({ ...prev, lastName: e.target.value }))}
                    placeholder="Введите вашу фамилию"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="email@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Телефон</Label>
                  <Input
                    id="phone"
                    value={profile.phone}
                    onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+7 (999) 123-45-67"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Дата рождения</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={profile.dateOfBirth}
                    onChange={(e) => setProfile(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">Пол</Label>
                  <Select value={profile.gender} onValueChange={(value: any) => setProfile(prev => ({ ...prev, gender: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите пол" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Мужской</SelectItem>
                      <SelectItem value="female">Женский</SelectItem>
                      <SelectItem value="other">Другой</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Addresses Tab */}
        <TabsContent value="addresses" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Адреса доставки</h3>
            <Button onClick={handleAddressAdd}>
              <Plus className="h-4 w-4 mr-2" />
              Добавить адрес
            </Button>
          </div>

          <div className="grid gap-4">
            {addresses.map((address) => (
              <Card key={address.id}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{address.title}</h4>
                      {address.isDefault && (
                        <Badge variant="secondary">По умолчанию</Badge>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm">
                        <Settings className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-red-600"
                        onClick={() => handleAddressDelete(address.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-medium">{address.fullName}</p>
                      <p className="text-gray-600">{address.phone}</p>
                    </div>
                    <div>
                      <p>{address.address}</p>
                      <p className="text-gray-600">{address.city}, {address.postalCode}</p>
                      <p className="text-gray-600">{address.country}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Настройки уведомлений</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-4 flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email уведомления
                  </h4>
                  <div className="space-y-4 ml-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Статус заказов</p>
                        <p className="text-sm text-gray-600">Уведомления о изменении статуса заказа</p>
                      </div>
                      <Switch
                        checked={notifications.emailOrderUpdates}
                        onCheckedChange={(checked) => 
                          setNotifications(prev => ({ ...prev, emailOrderUpdates: checked }))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Маркетинговые сообщения</p>
                        <p className="text-sm text-gray-600">Акции, скидки и новости</p>
                      </div>
                      <Switch
                        checked={notifications.emailMarketing}
                        onCheckedChange={(checked) => 
                          setNotifications(prev => ({ ...prev, emailMarketing: checked }))
                        }
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium mb-4 flex items-center gap-2">
                    <Smartphone className="h-4 w-4" />
                    SMS уведомления
                  </h4>
                  <div className="space-y-4 ml-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Статус заказов</p>
                        <p className="text-sm text-gray-600">SMS о готовности заказа</p>
                      </div>
                      <Switch
                        checked={notifications.smsOrderUpdates}
                        onCheckedChange={(checked) => 
                          setNotifications(prev => ({ ...prev, smsOrderUpdates: checked }))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Маркетинговые сообщения</p>
                        <p className="text-sm text-gray-600">SMS с акциями и предложениями</p>
                      </div>
                      <Switch
                        checked={notifications.smsMarketing}
                        onCheckedChange={(checked) => 
                          setNotifications(prev => ({ ...prev, smsMarketing: checked }))
                        }
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium flex items-center gap-2">
                      <Bell className="h-4 w-4" />
                      Push-уведомления
                    </p>
                    <p className="text-sm text-gray-600">Уведомления в браузере</p>
                  </div>
                  <Switch
                    checked={notifications.pushNotifications}
                    onCheckedChange={(checked) => 
                      setNotifications(prev => ({ ...prev, pushNotifications: checked }))
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Безопасность аккаунта</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Пароль</h4>
                    <p className="text-sm text-gray-600">Последнее изменение: 15 дней назад</p>
                  </div>
                  <Button 
                    variant="outline"
                    onClick={() => setShowPasswordForm(!showPasswordForm)}
                  >
                    Изменить пароль
                  </Button>
                </div>

                {showPasswordForm && (
                  <Card>
                    <CardContent className="p-4 space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="currentPassword">Текущий пароль</Label>
                        <Input
                          id="currentPassword"
                          type="password"
                          value={passwordData.currentPassword}
                          onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="newPassword">Новый пароль</Label>
                        <Input
                          id="newPassword"
                          type="password"
                          value={passwordData.newPassword}
                          onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Подтвердите пароль</Label>
                        <Input
                          id="confirmPassword"
                          type="password"
                          value={passwordData.confirmPassword}
                          onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={handlePasswordChange} disabled={isChangingPassword}>
                          {isChangingPassword ? t('saving') : t('changePassword')}
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => setShowPasswordForm(false)}
                        >
                          Отмена
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Двухфакторная аутентификация</h4>
                    <p className="text-sm text-gray-600">Дополнительная защита аккаунта</p>
                  </div>
                  <Badge variant="outline" className="text-red-600">
                    Не настроена
                  </Badge>
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Рекомендуем настроить двухфакторную аутентификацию для повышения безопасности вашего аккаунта.
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-red-600">Опасная зона</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 border border-red-200 rounded-lg bg-red-50">
                  <h4 className="font-medium text-red-800 mb-2">Удаление аккаунта</h4>
                  <p className="text-sm text-red-600 mb-4">
                    После удаления аккаунта все ваши данные будут безвозвратно утеряны.
                  </p>
                  <Button variant="destructive" size="sm">
                    Удалить аккаунт
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}