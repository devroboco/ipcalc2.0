type FormFieldProps = {
  label: string;
  htmlFor?: string;
  disabled?: boolean;
  helperText?: string;
  children: React.ReactNode;
};

export default function FormField({
  label,
  htmlFor,
  disabled,
  helperText,
  children,
}: FormFieldProps) {
  return (
    <label
      htmlFor={htmlFor}
      className={`block ${disabled ? "opacity-60 pointer-events-none" : ""}`}
    >
      <span
        className={`mb-2 block font-roboto text-sm font-medium ${
          disabled ? "text-gray-500" : "text-[#1E1E1E]"
        }`}
      >
        {label}
      </span>
      {children}
      {helperText && (
        <span className='mt-1 block text-xs text-gray-500'>{helperText}</span>
      )}
    </label>
  );
}
