import { useState, useRef, useEffect, forwardRef } from 'react';

const SearchSelect = forwardRef(({
  label,
  options = [],
  placeholder = 'Buscar...',
  value,
  onChange,
  error,
  className = '',
  ...props
}, ref) => {
  const [searchText, setSearchText] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Find the selected option's label to display
  const selectedOption = options.find(opt => String(opt.value) === String(value));

  // Filter options based on search text
  const filteredOptions = searchText
    ? options.filter(opt =>
        opt.label.toLowerCase().includes(searchText.toLowerCase())
      )
    : options;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setSearchText('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (option) => {
    onChange(option.value);
    setSearchText('');
    setIsOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('');
    setSearchText('');
    setIsOpen(false);
  };

  const handleInputChange = (e) => {
    setSearchText(e.target.value);
    if (!isOpen) setIsOpen(true);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  return (
    <div className={`w-full ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}

      <div className="relative">
        {/* Input / Selected display */}
        {selectedOption && !isOpen ? (
          <div
            className="input w-full flex items-center justify-between cursor-pointer"
            onClick={() => { setIsOpen(true); }}
          >
            <span className="truncate">{selectedOption.label}</span>
            <button
              type="button"
              onClick={handleClear}
              className="ml-2 text-gray-400 hover:text-gray-600 flex-shrink-0"
            >
              ✕
            </button>
          </div>
        ) : (
          <input
            ref={ref}
            type="text"
            value={searchText}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            placeholder={selectedOption ? selectedOption.label : placeholder}
            className={`input w-full ${error ? 'border-danger focus:ring-danger' : ''}`}
            autoComplete="off"
            {...props}
          />
        )}

        {/* Dropdown */}
        {isOpen && (
          <ul className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <li
                  key={option.value}
                  onClick={() => handleSelect(option)}
                  className={`px-3 py-2 cursor-pointer text-sm hover:bg-blue-50 hover:text-blue-700 ${
                    String(option.value) === String(value) ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                  }`}
                >
                  {option.label}
                </li>
              ))
            ) : (
              <li className="px-3 py-2 text-sm text-gray-400">
                Sin coincidencias
              </li>
            )}
          </ul>
        )}
      </div>

      {error && (
        <p className="mt-1 text-sm text-danger">{error}</p>
      )}
    </div>
  );
});

SearchSelect.displayName = 'SearchSelect';

export default SearchSelect;
