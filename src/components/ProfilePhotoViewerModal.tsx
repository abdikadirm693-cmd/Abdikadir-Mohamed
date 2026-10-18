import React, { useEffect } from 'react';
import { X, ArrowLeft, Download } from 'lucide-react';

interface ProfilePhotoViewerModalProps {
  isOpen: boolean;
  photoUrl: string | null;
  name: string;
  onClose: () => void;
}

export const ProfilePhotoViewerModal: React.FC<ProfilePhotoViewerModalProps> = ({
  isOpen,
  photoUrl,
  name,
  onClose,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !photoUrl) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between p-3 sm:p-5 animate-in fade-in duration-200 select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {/* Top Bar - WhatsApp Style */}
      <div className="w-full max-w-3xl mx-auto flex items-center justify-between text-white py-2 px-1 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-white transition-colors cursor-pointer"
            title="Go back"
            aria-label="Close photo preview"
          >
            <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
          <div>
            <h3 className="font-extrabold text-sm sm:text-base tracking-tight text-white line-clamp-1">
              {name}
            </h3>
            <p className="text-[11px] text-slate-400 font-medium">Profile Photo</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer flex items-center gap-1.5 px-3"
          title="Close photo preview"
        >
          <X className="w-5 h-5" />
          <span className="text-xs font-bold hidden sm:inline">Close</span>
        </button>
      </div>

      {/* Main Centered Photo Viewport */}
      <div
        className="flex-1 flex items-center justify-center p-2 sm:p-4 cursor-pointer"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
        <div className="relative max-w-xl max-h-[75vh] sm:max-h-[82vh] w-full flex items-center justify-center cursor-default">
          <img
            src={photoUrl}
            alt={name}
            className="max-h-[75vh] sm:max-h-[82vh] max-w-full w-auto object-contain rounded-2xl shadow-2xl border border-white/10 ring-1 ring-white/10 transition-transform duration-200"
          />
        </div>
      </div>

      {/* Bottom Hint */}
      <div className="w-full max-w-md mx-auto text-center py-2 text-slate-400 text-[11px]">
        Tap anywhere outside or press ESC to return
      </div>
    </div>
  );
};
