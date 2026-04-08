'use client';

import React, { useState, useEffect } from 'react';

export default function SearchBar({ services, onSearch, onCategoryChange }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  const categories = [
    { id: 'all', label: 'Semua Kategori', icon: '📦' },
    { id: 'barang', label: 'Vendor Penyedia Barang', icon: '📦' },
    { id: 'jasa', label: 'Vendor Layanan Jasa', icon: '🛠️' }
  ];

  useEffect(() => {
    if (onSearch) {
      onSearch(searchTerm, selectedCategory);
    }
  }, [searchTerm, selectedCategory, onSearch]);

  const handleCategorySelect = (categoryId) => {
    setSelectedCategory(categoryId);
    setShowCategoryDropdown(false);
    if (onCategoryChange) {
      onCategoryChange(categoryId);
    }
  };

  const selectedCategoryLabel = categories.find(c => c.id === selectedCategory)?.label || 'Semua Kategori';
  const selectedCategoryIcon = categories.find(c => c.id === selectedCategory)?.icon || '📦';

  return (
    <div className="search-container">
      <div className="search-wrapper">
        {/* Search Input */}
        <div className="search-input-wrapper">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Cari vendor, layanan sewa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        {/* Category Dropdown */}
        <div className="category-dropdown-wrapper">
          <button
            className="category-dropdown-btn"
            onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
            title="Pilih Kategori Vendor"
          >
            <span className="category-icon">{selectedCategoryIcon}</span>
            <span className="category-label">{selectedCategoryLabel}</span>
            <span className={`dropdown-arrow ${showCategoryDropdown ? 'open' : ''}`}>▼</span>
          </button>

          {showCategoryDropdown && (
            <div className="category-dropdown-menu">
              {categories.map((category) => (
                <button
                  key={category.id}
                  className={`category-option ${selectedCategory === category.id ? 'active' : ''}`}
                  onClick={() => handleCategorySelect(category.id)}
                >
                  <span className="option-icon">{category.icon}</span>
                  <span className="option-label">{category.label}</span>
                  {selectedCategory === category.id && <span className="checkmark">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Results Counter */}
      {services && services.length > 0 && (
        <div className="search-results-info">
          {searchTerm && (
            <p>
              Ditemukan <strong>{services.length}</strong> hasil pencarian untuk "<strong>{searchTerm}</strong>"
              {selectedCategory !== 'all' && ` pada kategori ${selectedCategoryLabel.toLowerCase()}`}
            </p>
          )}
        </div>
      )}

      <style jsx>{`
        .search-container {
          margin-bottom: 30px;
        }

        .search-wrapper {
          display: flex;
          gap: 12px;
          align-items: center;
          flex-wrap: wrap;
        }

        .search-input-wrapper {
          flex: 1;
          min-width: 250px;
          position: relative;
          display: flex;
          align-items: center;
          background: white;
          border: 2px solid #ddd;
          border-radius: 12px;
          padding: 0 15px;
          transition: all 0.3s ease;
        }

        .search-input-wrapper:focus-within {
          border-color: #5a45d1;
          box-shadow: 0 0 0 3px rgba(90, 69, 209, 0.1);
        }

        .search-icon {
          font-size: 18px;
          margin-right: 10px;
          color: #999;
        }

        .search-input {
          flex: 1;
          border: none;
          outline: none;
          padding: 12px 0;
          font-size: 14px;
          background: transparent;
          font-family: inherit;
        }

        .search-input::placeholder {
          color: #999;
        }

        .category-dropdown-wrapper {
          position: relative;
        }

        .category-dropdown-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          background: white;
          border: 2px solid #ddd;
          border-radius: 12px;
          padding: 12px 16px;
          font-size: 14px;
          font-weight: 500;
          color: #333;
          cursor: pointer;
          transition: all 0.3s ease;
          white-space: nowrap;
          min-width: 220px;
        }

        .category-dropdown-btn:hover {
          border-color: #5a45d1;
          background: #f8f7ff;
        }

        .category-dropdown-btn:active {
          border-color: #5a45d1;
          background: #f0edff;
        }

        .category-icon {
          font-size: 18px;
        }

        .category-label {
          flex: 1;
          text-align: left;
        }

        .dropdown-arrow {
          font-size: 12px;
          color: #999;
          transition: transform 0.3s ease;
        }

        .dropdown-arrow.open {
          transform: rotate(180deg);
        }

        .category-dropdown-menu {
          position: absolute;
          top: calc(100% + 8px);
          left: 0;
          right: 0;
          background: white;
          border: 2px solid #ddd;
          border-radius: 12px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
          z-index: 100;
          overflow: hidden;
          min-width: 220px;
        }

        .category-option {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 14px 16px;
          border: none;
          background: white;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 14px;
          text-align: left;
          color: #555;
          border-bottom: 1px solid #eee;
        }

        .category-option:last-child {
          border-bottom: none;
        }

        .category-option:hover {
          background: #f8f7ff;
          color: #5a45d1;
        }

        .category-option.active {
          background: #f0edff;
          color: #5a45d1;
          font-weight: 600;
        }

        .option-icon {
          font-size: 18px;
        }

        .option-label {
          flex: 1;
        }

        .checkmark {
          color: #5a45d1;
          font-weight: bold;
        }

        .search-results-info {
          margin-top: 12px;
          padding: 8px 0;
          font-size: 13px;
          color: #666;
        }

        @media (max-width: 768px) {
          .search-wrapper {
            gap: 10px;
          }

          .search-input-wrapper {
            min-width: 100%;
            flex: 1;
          }

          .category-dropdown-btn {
            min-width: 150px;
            padding: 10px 12px;
            font-size: 13px;
          }

          .category-label {
            display: none;
          }

          .category-dropdown-btn::before {
            content: attr(data-label);
          }
        }

        @media (max-width: 480px) {
          .search-wrapper {
            flex-direction: column;
          }

          .search-input-wrapper,
          .category-dropdown-btn {
            width: 100%;
            min-width: unset;
          }

          .category-dropdown-menu {
            position: fixed;
            top: auto;
            bottom: 0;
            left: 0;
            right: 0;
            border-radius: 16px 16px 0 0;
            max-height: 60vh;
            overflow-y: auto;
          }
        }
      `}</style>
    </div>
  );
}
