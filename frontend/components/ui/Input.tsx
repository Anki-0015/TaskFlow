'use client';

import { InputHTMLAttributes, forwardRef, useState } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  showPasswordToggle?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', id, type, showPasswordToggle = false, ...props }, ref) => {
    const [passwordVisible, setPasswordVisible] = useState(false);
    const canTogglePassword = showPasswordToggle && type === 'password';

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={id} className="text-sm font-medium text-gray-700">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            id={id}
            type={canTogglePassword && passwordVisible ? 'text' : type}
            className={`
              w-full px-3.5 py-2.5 text-sm rounded-xl border bg-white text-gray-900
              placeholder:text-gray-400
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
              disabled:bg-gray-50 disabled:cursor-not-allowed
              transition-colors duration-150
              ${canTogglePassword ? 'pr-14' : ''}
              ${error ? 'border-red-400' : 'border-gray-300'}
              ${className}
            `}
            {...props}
          />
          {canTogglePassword && (
            <button
              type="button"
              className="absolute inset-y-0 right-3 text-xs font-medium text-gray-500 hover:text-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
              onClick={() => setPasswordVisible((visible) => !visible)}
              aria-label={`${passwordVisible ? 'Hide' : 'Show'} ${label || 'password'}`}
              aria-pressed={passwordVisible}
            >
              {passwordVisible ? 'Hide' : 'Show'}
            </button>
          )}
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;
