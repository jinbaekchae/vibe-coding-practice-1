'use client'

interface FormInputProps {
  label: string
  name: string
  type?: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  required?: boolean
  placeholder?: string
}

export default function FormInput({
  label,
  name,
  type = 'text',
  value,
  onChange,
  required = false,
  placeholder,
}: FormInputProps) {
  return (
    <div className="mb-4">
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-2">
        {label} {required && <span className="text-orange-500">*</span>}
      </label>
      <input
        type={type}
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all outline-none text-gray-800"
      />
    </div>
  )
}
