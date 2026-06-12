'use client';

import React, { useState } from 'react';

export default function SearchBar({ services, onSearch, onCategoryChange, categoriesSource, onFiltersChange }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [locationTerm, setLocationTerm] = useState('');
  const [minRating, setMinRating] = useState('all');
  const [priceRange, setPriceRange] = useState('all');
  const [sortBy, setSortBy] = useState('recommended');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const categorySource = categoriesSource || services;

  // Extract unique categories from all services (not filtered results)
  const categories = React.useMemo(() => {
    const uniqueCategories = new Set();
    
    if (categorySource && categorySource.length > 0) {
      categorySource.forEach(service => {
        if (service.mainCategory) {
          uniqueCategories.add(service.mainCategory);
        } else if (service.category) {
          // Fallback untuk kompatibilitas
          uniqueCategories.add(service.category);
        }
      });
    }

    const categoryList = [
      { id: 'all', label: 'Semua Kategori', icon: '📦' }
    ];

    // Map kategori dengan icon yang sesuai
    const categoryIcons = {
      'Elektronik': '💻',
      'Alat Olahraga': '⚽',
      'Furniture': '🪑',
      'Peralatan Acara': '🎉',
      'Peralatan Rumah Tangga': '🏠',
      'Peralatan Konstruksi': '🏗️',
      'Kendaraan': '🚗',
      'Peralatan Dapur': '🍳',
      'Kostum & Fashion': '👗',
      'Peralatan Fotografi': '📷',
      'Peralatan Musik': '🎸',
      'Mainan & Anak': '🎨',
      'Jasa Profesional': '🛠️',
      'Peralatan Outdoor': '⛰️',
      'Lainnya': '✨'
    };

    Array.from(uniqueCategories).sort().forEach(category => {
      categoryList.push({
        id: category,
        label: category,
        icon: categoryIcons[category] || '📦'
      });
    });

    return categoryList;
  }, [categorySource]);

  const syncSearch = (nextSearchTerm = searchTerm, nextCategory = selectedCategory) => {
    if (onSearch) {
      onSearch(nextSearchTerm, nextCategory);
    }
  };

  const syncFilters = (nextFilters) => {
    if (onFiltersChange) {
      onFiltersChange(nextFilters);
    }
  };

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
            onChange={(e) => {
              const nextValue = e.target.value;
              setSearchTerm(nextValue);
              syncSearch(nextValue, selectedCategory);
            }}
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

      <div className="search-filter-row">
        <div className="filter-field">
          <label>Lokasi</label>
          <input
            type="text"
            placeholder="Kota, area, atau alamat"
            value={locationTerm}
            onChange={(e) => {
              const nextValue = e.target.value;
              setLocationTerm(nextValue);
              syncFilters({
                locationTerm: nextValue,
                minRating,
                priceRange,
                sortBy
              });
            }}
          />
        </div>
        <div className="filter-field">
          <label>Rating minimum</label>
          <select
            value={minRating}
            onChange={(e) => {
              const nextValue = e.target.value;
              setMinRating(nextValue);
              syncFilters({
                locationTerm,
                minRating: nextValue,
                priceRange,
                sortBy
              });
            }}
          >
            <option value="all">Semua</option>
            <option value="4.5">4.5+</option>
            <option value="4">4+</option>
            <option value="3">3+</option>
          </select>
        </div>
        <div className="filter-field">
          <label>Rentang harga</label>
          <select
            value={priceRange}
            onChange={(e) => {
              const nextValue = e.target.value;
              setPriceRange(nextValue);
              syncFilters({
                locationTerm,
                minRating,
                priceRange: nextValue,
                sortBy
              });
            }}
          >
            <option value="all">Semua</option>
            <option value="under_100k">Di bawah Rp100 ribu</option>
            <option value="100k_250k">Rp100 ribu - Rp250 ribu</option>
            <option value="250k_500k">Rp250 ribu - Rp500 ribu</option>
            <option value="above_500k">Di atas Rp500 ribu</option>
          </select>
        </div>
        <div className="filter-field">
          <label>Urutkan</label>
          <select
            value={sortBy}
            onChange={(e) => {
              const nextValue = e.target.value;
              setSortBy(nextValue);
              syncFilters({
                locationTerm,
                minRating,
                priceRange,
                sortBy: nextValue
              });
            }}
          >
            <option value="recommended">Rekomendasi</option>
            <option value="popular">Paling populer</option>
            <option value="rating">Rating tertinggi</option>
            <option value="price_low">Harga termurah</option>
            <option value="price_high">Harga termahal</option>
            <option value="newest">Terbaru</option>
          </select>
        </div>
      </div>

      {/* Results Counter */}
      {services && services.length > 0 && (
        <div className="search-results-info">
          {searchTerm && (
            <p>
              Ditemukan <strong>{services.length}</strong> hasil pencarian untuk &quot;<strong>{searchTerm}</strong>&quot;
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
          border-color: #B28A67;
          box-shadow: 0 0 0 3px rgba(178, 138, 103, 0.1);
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
          border-color: #B28A67;
          background: #f8f7ff;
        }

        .category-dropdown-btn:active {
          border-color: #B28A67;
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
          color: #B28A67;
        }

        .category-option.active {
          background: #f0edff;
          color: #B28A67;
          font-weight: 600;
        }

        .option-icon {
          font-size: 18px;
        }

        .option-label {
          flex: 1;
        }

        .checkmark {
          color: #B28A67;
          font-weight: bold;
        }

        .search-results-info {
          margin-top: 12px;
          padding: 8px 0;
          font-size: 13px;
          color: #666;
        }

        .search-filter-row {
          margin-top: 14px;
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
        }

        .filter-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .filter-field label {
          font-size: 12px;
          font-weight: 700;
          color: #475569;
        }

        .filter-field input,
        .filter-field select {
          border: 2px solid #ddd;
          border-radius: 12px;
          padding: 10px 12px;
          font-size: 14px;
          background: #fff;
          color: #111827;
          outline: none;
          font-family: inherit;
        }

        .filter-field input:focus,
        .filter-field select:focus {
          border-color: #B28A67;
          box-shadow: 0 0 0 3px rgba(178, 138, 103, 0.12);
        }

        @media (max-width: 768px) {
          .search-wrapper {
            gap: 10px;
          }

          .search-filter-row {
            grid-template-columns: repeat(2, minmax(0, 1fr));
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

          .search-filter-row {
            grid-template-columns: 1fr;
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
