'use client';

import { forwardRef, InputHTMLAttributes } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, leftIcon, rightIcon, className = '', type = 'text', ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    
    const togglePasswordVisibility = () => {
      setShowPassword(!showPassword);
    };
    
    // Determine if this is a password input that can toggle visibility
    const isPassword = type === 'password';
    const inputType = isPassword && showPassword ? 'text' : type;
    
    // Generate a unique ID for the input
    const id = props.id || `input-${Math.random().toString(36).substring(2, 9)}`;
    
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={id} className="block text-sm font-medium mb-1">
            {label}
          </label>
        )}
        
        <div className="relative">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-500">
              {leftIcon}
            </div>
          )}
          
          <input
            id={id}
            ref={ref}
            type={inputType}
            className={`
              w-full px-4 py-2 rounded-lg border 
              ${error ? 'border-error focus:ring-error' : 'border-gray-200 dark:border-gray-800 focus:ring-primary'} 
              focus:outline-none focus:ring-2 focus:border-transparent
              ${leftIcon ? 'pl-10' : ''}
              ${(rightIcon || isPassword) ? 'pr-10' : ''}
              ${className}
              dark:bg-gray-800
            `}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? `${id}-error` : helperText ? `${id}-helper` : undefined}
            {...props}
          />
          
          {isPassword ? (
            <button
              type="button"
              onClick={togglePasswordVisibility}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          ) : rightIcon ? (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-500">
              {rightIcon}
            </div>
          ) : null}
        </div>
        
        {error && (
          <p id={`${id}-error`} className="mt-1 text-sm text-error">
            {error}
          </p>
        )}
        
        {helperText && !error && (
          <p id={`${id}-helper`} className="mt-1 text-sm text-gray-500">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;