import React, { useState } from 'react';
import {
  User as UserIcon,
  Coins,
  Shield,
  Briefcase,
  Gamepad2,
  Phone,
  Mail,
  Save,
  LogOut,
  Globe,
  Sparkles,
  CheckCircle,
  KeyRound,
  Lock,
  Camera,
  Trash2,
  Eye,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useLanguage } from '../context/LanguageContext.tsx';
import { UserAvatar } from './UserAvatar.tsx';
import { ProfilePhotoViewerModal } from './ProfilePhotoViewerModal.tsx';

interface AccountViewProps {
  onNavigateToAdmin?: () => void;
  onNavigateToEmployee?: () => void;
  onNavigateToOrders?: () => void;
  onOpenPepRedemption?: () => void;
}

export const AccountView: React.FC<AccountViewProps> = ({
  onNavigateToAdmin,
  onNavigateToEmployee,
  onNavigateToOrders,
  onOpenPepRedemption,
}) => {
  const {
    user,
    isAdmin,
    isEmployee,
    updateProfile,
    changePassword,
    uploadProfilePhoto,
    removeProfilePhoto,
    logout,
  } = useAuth();
  const { t, lang, setLang } = useLanguage();

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [savedPubgId, setSavedPubgId] = useState(user?.savedPubgId || '');
  const [savedPubgNickname, setSavedPubgNickname] = useState(user?.savedPubgNickname || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Photo Upload State
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoMessage, setPhotoMessage] = useState('');

  // WhatsApp-style Photo Preview
  const [previewPhoto, setPreviewPhoto] = useState<{ url: string; name: string } | null>(null);

  if (!user) {
    return null;
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMessage('');
    setSaveSuccess(false);

    const result = await updateProfile({
      name: name.trim(),
      phone: phone.trim(),
      savedPubgId: savedPubgId.trim(),
      savedPubgNickname: savedPubgNickname.trim(),
    });

    setIsSaving(false);
    if (result.success) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } else {
      setErrorMessage(result.error || 'Failed to update profile');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) return;

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError(t('passwordMismatch'));
      return;
    }

    setIsChangingPassword(true);
    setPasswordError('');
    setPasswordSuccess(false);

    const res = await changePassword(currentPassword, newPassword);
    setIsChangingPassword(false);

    if (res.success) {
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(false), 4000);
    } else {
      setPasswordError(res.error || 'Failed to update password');
    }
  };

  const handlePhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    setPhotoMessage('');

    const res = await uploadProfilePhoto(file);
    setIsUploadingPhoto(false);

    if (res.success) {
      setPhotoMessage(t('photoUpdatedSuccess'));
      setTimeout(() => setPhotoMessage(''), 3000);
    } else {
      setPhotoMessage(res.error || 'Failed to upload photo');
    }
  };

  const handleRemovePhoto = async () => {
    if (!window.confirm('Are you sure you want to remove your profile photo?')) return;
    setIsUploadingPhoto(true);
    const res = await removeProfilePhoto();
    setIsUploadingPhoto(false);
    if (res.success) {
      setPhotoMessage('Profile photo removed.');
      setTimeout(() => setPhotoMessage(''), 3000);
    }
  };

  return (
    <div className="space-y-5">
      {/* Account Header */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 tracking-tight font-display">
          {t('accountTitle')}
        </h2>
        <p className="text-xs text-slate-500">{t('accountSubtitle')}</p>
      </div>

      {/* User Hero & Profile Photo Card */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-sm relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="relative group">
              <UserAvatar
                profilePhotoUrl={user.profilePhotoUrl}
                name={user.name}
                email={user.email}
                size="xl"
                interactive
                onClick={() => {
                  if (user.profilePhotoUrl) {
                    setPreviewPhoto({ url: user.profilePhotoUrl, name: user.name });
                  }
                }}
              />
              {user.profilePhotoUrl && (
                <button
                  type="button"
                  onClick={() => setPreviewPhoto({ url: user.profilePhotoUrl || '', name: user.name })}
                  className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white"
                  title={t('viewPhotoFull')}
                >
                  <Eye className="w-4 h-4" />
                </button>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg">{user.name}</h3>
                {isAdmin && (
                  <span className="bg-red-500/20 text-red-400 text-[10px] font-extrabold px-2 py-0.5 rounded border border-red-500/40 uppercase">
                    Admin
                  </span>
                )}
                {isEmployee && (
                  <span className="bg-blue-500/20 text-blue-300 text-[10px] font-extrabold px-2 py-0.5 rounded border border-blue-500/40 uppercase">
                    Employee
                  </span>
                )}
                {!isAdmin && !isEmployee && (
                  <span className="bg-slate-800 text-slate-300 text-[10px] font-extrabold px-2 py-0.5 rounded uppercase">
                    Customer
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">{user.email}</p>

              {/* Photo Action Links */}
              <div className="mt-2 flex items-center gap-3 text-xs">
                <label className="text-red-400 hover:text-red-300 font-semibold cursor-pointer inline-flex items-center gap-1">
                  <Camera className="w-3.5 h-3.5" />
                  <span>{user.profilePhotoUrl ? t('replacePhotoBtn') : t('uploadPhotoBtn')}</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    onChange={handlePhotoFileChange}
                    disabled={isUploadingPhoto}
                    className="hidden"
                  />
                </label>

                {user.profilePhotoUrl && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    disabled={isUploadingPhoto}
                    className="text-slate-400 hover:text-red-300 font-semibold cursor-pointer inline-flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{t('removePhotoBtn')}</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={logout}
            className="self-start sm:self-auto p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title={t('logout')}
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>

        {photoMessage && (
          <div className="mt-3 p-2 bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-emerald-200 text-xs font-semibold">
            {photoMessage}
          </div>
        )}

        {/* PEP Rewards Section with Progress Indicator */}
        <div className="mt-5 pt-4 border-t border-slate-800 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5 text-xs text-amber-400 font-bold uppercase tracking-wider">
                <Coins className="w-4 h-4 text-amber-400" />
                <span>{t('pepBalanceCardTitle')}</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {user.role === 'customer'
                  ? 'Earn 10% of profit on every top-up. 100 PEP = $1.00 USD free game currency.'
                  : 'Staff & Admin accounts are restricted from earning or redeeming PEP points.'}
              </p>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-2xl font-black text-amber-400 font-display">
                {Math.min(1500, user.pepPoints || 0)}
              </span>
              <span className="text-xs text-slate-400 ml-1">/ 1,500 PEP</span>
            </div>
          </div>

          {user.role === 'customer' ? (
            <div className="space-y-2 pt-1">
              {/* Mobile-Friendly Progress Bar */}
              <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden p-0.5 border border-slate-700">
                <div
                  className="bg-gradient-to-r from-amber-500 to-yellow-400 h-full rounded-full transition-all duration-500 shadow-xs"
                  style={{ width: `${Math.min(100, ((user.pepPoints || 0) / 1500) * 100)}%` }}
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs pt-1">
                <span className="text-[11px] text-slate-400">
                  {Math.round(((user.pepPoints || 0) / 1500) * 100)}% of 1,500 PEP Cap (Max $15.00)
                </span>

                {onOpenPepRedemption && (
                  <button
                    type="button"
                    onClick={onOpenPepRedemption}
                    disabled={(user.pepPoints || 0) < 150}
                    className="px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-black text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer self-start sm:self-auto"
                    title={(user.pepPoints || 0) < 150 ? 'Need at least 150 PEP to redeem 60 UC' : 'Top up with PEP points'}
                  >
                    <Coins className="w-3.5 h-3.5" />
                    <span>Top Up with PEP</span>
                    {(user.pepPoints || 0) < 150 && (
                      <span className="text-[10px] bg-slate-900/30 text-slate-900 px-1.5 py-0.2 rounded font-normal">
                        (Min 150 PEP)
                      </span>
                    )}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-2.5 text-[11px] text-slate-400">
              Staff accounts cannot participate in PEP loyalty earning or reward redemptions.
            </div>
          )}
        </div>
      </div>

      {/* Admin Dashboard shortcut if admin */}
      {isAdmin && onNavigateToAdmin && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-red-600 text-white flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-xs text-slate-900">
                Somplay Admin Portal
              </h4>
              <p className="text-[11px] text-slate-600">
                Verify payments, edit packages, manage employees, and configure wallets.
              </p>
            </div>
          </div>

          <button
            onClick={onNavigateToAdmin}
            className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            Open Admin
          </button>
        </div>
      )}

      {/* Employee Dashboard shortcut if employee */}
      {isEmployee && onNavigateToEmployee && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-xs text-slate-900">
                Somplay Staff Portal
              </h4>
              <p className="text-[11px] text-slate-600">
                Access your staff workstation and order queue.
              </p>
            </div>
          </div>

          <button
            onClick={onNavigateToEmployee}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            Open Staff Portal
          </button>
        </div>
      )}

      {/* Profile Details Form */}
      <form onSubmit={handleSaveProfile} className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <UserIcon className="w-4 h-4 text-red-600" />
          <h4 className="font-bold text-slate-900 text-sm font-display">
            Personal Information & Profile
          </h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Display Name <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-red-600 focus:outline-none"
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-slate-700">
                Account Email Address
              </label>
              <span className="text-[10px] text-amber-700 font-bold flex items-center gap-1">
                <Lock className="w-3 h-3" /> Fixed & Protected
              </span>
            </div>
            <input
              type="email"
              value={user.email}
              disabled
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-600 font-mono text-xs cursor-not-allowed select-none"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Phone Number
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+252 61 ..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono focus:ring-2 focus:ring-red-600 focus:outline-none"
            />
          </div>

          {/* PUBG fields preserved for players/customers */}
          {!isAdmin && !isEmployee && (
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Saved PUBG Player ID (UID)
              </label>
              <input
                type="text"
                value={savedPubgId}
                onChange={(e) => setSavedPubgId(e.target.value.replace(/\D/g, ''))}
                placeholder="e.g. 5129482194"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono focus:ring-2 focus:ring-red-600 focus:outline-none"
              />
            </div>
          )}

          {!isAdmin && !isEmployee && (
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Saved PUBG Nickname
              </label>
              <input
                type="text"
                value={savedPubgNickname}
                onChange={(e) => setSavedPubgNickname(e.target.value)}
                placeholder="e.g. SomaliSniper"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-red-600 focus:outline-none"
              />
            </div>
          )}
        </div>

        {errorMessage && (
          <p className="text-xs font-bold text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">
            {errorMessage}
          </p>
        )}

        {saveSuccess && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200 font-semibold">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>{t('profileSavedSuccess')}</span>
          </div>
        )}

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={isSaving}
            className="w-full sm:w-auto px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? t('loading') : t('updateProfileBtn')}</span>
          </button>
        </div>
      </form>

      {/* Change Password Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <KeyRound className="w-4 h-4 text-red-600" />
          <h4 className="font-bold text-slate-900 text-sm font-display">
            {t('changePasswordTitle')}
          </h4>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              {t('currentPasswordLabel')} <span className="text-red-600">*</span>
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono focus:ring-2 focus:ring-red-600 focus:outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {t('newPasswordLabel')} <span className="text-red-600">*</span>
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono focus:ring-2 focus:ring-red-600 focus:outline-none"
                minLength={6}
                required
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {t('confirmNewPasswordLabel')} <span className="text-red-600">*</span>
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono focus:ring-2 focus:ring-red-600 focus:outline-none"
                minLength={6}
                required
              />
            </div>
          </div>

          {passwordError && (
            <div className="p-2.5 rounded-lg bg-red-50 text-red-700 text-xs font-semibold">
              {passwordError}
            </div>
          )}

          {passwordSuccess && (
            <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-semibold flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>{t('passwordChangedSuccess')}</span>
            </div>
          )}

          <div className="pt-1 flex justify-end">
            <button
              type="submit"
              disabled={isChangingPassword}
              className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              {isChangingPassword ? 'Updating...' : t('changePasswordTitle')}
            </button>
          </div>
        </form>
      </div>

      {/* Language Preference Section */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Globe className="w-5 h-5 text-slate-500" />
          <div>
            <h4 className="font-bold text-xs text-slate-900">Language / Luqadda</h4>
            <p className="text-[11px] text-slate-500">
              {lang === 'so' ? 'Af-Soomaali ayaa doortan' : 'English is selected'}
            </p>
          </div>
        </div>

        <div className="flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200 text-xs font-bold">
          <button
            onClick={() => setLang('so')}
            className={`px-3 py-1.5 rounded transition-colors ${
              lang === 'so' ? 'bg-red-600 text-white shadow-xs' : 'text-slate-600'
            }`}
          >
            Soomaali
          </button>
          <button
            onClick={() => setLang('en')}
            className={`px-3 py-1.5 rounded transition-colors ${
              lang === 'en' ? 'bg-red-600 text-white shadow-xs' : 'text-slate-600'
            }`}
          >
            English
          </button>
        </div>
      </div>

      {/* WhatsApp-Style Full Screen Photo Viewer Modal */}
      <ProfilePhotoViewerModal
        isOpen={Boolean(previewPhoto?.url)}
        photoUrl={previewPhoto?.url || null}
        name={previewPhoto?.name || 'Photo'}
        onClose={() => setPreviewPhoto(null)}
      />
    </div>
  );
};
