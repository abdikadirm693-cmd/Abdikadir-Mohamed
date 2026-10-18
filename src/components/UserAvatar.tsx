import React from 'react';
import { User as UserIcon } from 'lucide-react';

interface UserAvatarProps {
  name?: string;
  email?: string;
  profilePhotoUrl?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  onClick?: () => void;
  className?: string;
  interactive?: boolean;
}

const sizeClasses = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-xl',
  '2xl': 'w-24 h-24 text-3xl',
};

export const UserAvatar: React.FC<UserAvatarProps> = ({
  name = 'User',
  email = '',
  profilePhotoUrl,
  size = 'md',
  onClick,
  className = '',
  interactive = false,
}) => {
  const initial = (name || email || 'U').trim().charAt(0).toUpperCase();

  const baseStyles = `${sizeClasses[size]} rounded-full flex-shrink-0 flex items-center justify-center font-black select-none transition-all ${className} ${
    interactive ? 'cursor-pointer hover:opacity-90 hover:ring-2 hover:ring-red-500/50 active:scale-95' : ''
  }`;

  if (profilePhotoUrl && profilePhotoUrl.trim() !== '') {
    return (
      <div onClick={onClick} className={`${baseStyles} overflow-hidden bg-slate-800 border border-slate-200/50 shadow-xs`}>
        <img
          src={profilePhotoUrl}
          alt={name}
          className="w-full h-full object-cover rounded-full"
          onError={(e) => {
            // If image fails to load, fallback to initial
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
      </div>
    );
  }

  // Fallback initial avatar with clean branded background
  return (
    <div
      onClick={onClick}
      className={`${baseStyles} bg-gradient-to-br from-red-600 to-slate-900 text-white shadow-xs border border-white/20`}
      title={name}
    >
      <span>{initial}</span>
    </div>
  );
};
