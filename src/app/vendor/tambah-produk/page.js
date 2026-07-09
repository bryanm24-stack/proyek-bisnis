'use client';

import React, { useState, useEffect } from 'react';
import SharedNavbar from '../../components/SharedNavbar';
import { useRouter } from 'next/navigation';
import VendorProductForm from '../VendorProductForm';
import {
  BARANG_CATEGORY_TREE,
  SERVICE_CATEGORY_TREE,
  getSuperSubOptions
} from '../category-tree';


import { readData, writeData } from '@/lib/storage';
export default function TambahProdukPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [selectedType, setSelectedType] = useState(null); // 'barang' | 'jasa'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [formData, setFormData] = useState({
    type: '',
    mainCategory: '',
    subCategory: '',
    superSubCategory: '',
    title: '',
    shortDescription: '',
    description: '',
    price: '',
    minimumDays: 1,
    availability: '',
    quantity: '',
    rentalPolicy: '',
    location: '',
    images: [],
    specifications: {},
    specificationOptions: {},
    descriptionTable: {},
    checklist: {},
    variations: {},
    items: []
  });

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    if (parsedUser.role !== 'vendor') {
      router.push('/');
      return;
    }

    setUser(parsedUser);
  }, [router]);

  useEffect(() => {
    if (!selectedType) return;

    setFormData(prev => ({
      ...prev,
      type: selectedType,
      mainCategory: '',
      subCategory: '',
      superSubCategory: '',
      category: '',
      availability: '',
      specifications: {},
      specificationOptions: {},
      descriptionTable: {},
      checklist: {},
      variations: {}
    }));
  }, [selectedType]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const missingFields = [];
    const activeCategories = selectedType === 'barang' ? BARANG_CATEGORY_TREE : SERVICE_CATEGORY_TREE;
    const currentSuperSubOptions = getSuperSubOptions(activeCategories, formData.mainCategory, formData.subCategory);

    if (!formData.mainCategory) missingFields.push('Kategori Utama');
    if (!formData.subCategory) missingFields.push('Sub Kategori');
    if (currentSuperSubOptions.length > 0 && !formData.superSubCategory) missingFields.push('Super-Sub Kategori');
    if (!formData.title) missingFields.push('Nama Item');
    if (!formData.location) missingFields.push('Lokasi Pickup');
    if (selectedType === 'jasa' && (!formData.availability || Number(formData.availability) < 1)) {
      missingFields.push('Availability Tim/Provider');
    }

    if (missingFields.length > 0) {
      setErrorMsg('Bidang yang belum diisi:\n• ' + missingFields.join('\n• '));
      return;
    }

    setIsSubmitting(true);

    try {
      const derivedQuantity = selectedType === 'barang'
        ? Math.max(
            1,
            (formData.items || []).reduce((sum, item) => sum + (parseInt(item.stok, 10) || 0), 0)
          )
        : Math.max(1, parseInt(formData.availability, 10) || 0);

      const submitData = {
        vendorId: user.id,
        vendorName: user.name,
        type: selectedType,
        mainCategory: formData.mainCategory,
        subCategory: formData.subCategory,
        superSubCategory: formData.superSubCategory,
        category: formData.mainCategory,
        title: formData.title,
        shortDescription: formData.shortDescription,
        detailDescription: formData.description,
        description: formData.description,
        price: formData.price ? parseInt(formData.price) : undefined,
        minimumDays: parseInt(formData.minimumDays),
        availability: selectedType === 'jasa' ? (parseInt(formData.availability, 10) || 0) : undefined,
        quantity: derivedQuantity,
        rentalPolicy: formData.rentalPolicy,
        location: formData.location,
        specifications: formData.specifications || {},
        specificationOptions: formData.specificationOptions || {},
        descriptionTable: formData.descriptionTable || {},
        checklist: formData.checklist || {},
        items: formData.items || [],
        variations: formData.variations || {},
        // ✅ FIXED: Accept all valid image formats (base64, http, https, blob)
        images: (formData.images || [])
          .filter(img => typeof img === 'string' && (img.startsWith('data:') || img.startsWith('http') || img.startsWith('blob:')))
          .slice(0, 5),
        rating: 0,
        rentCount: 0
      };

      const response = await fetch('/api/vendor/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData)
      });

      const data = await response.json();

      if (data.success) {
        setSuccessMsg('✅ Item berhasil ditambahkan!');
        setTimeout(() => {
          router.push('/vendor/produk');
        }, 1500);
      } else {
        setErrorMsg(data.message || 'Gagal menyimpan item');
      }
    } catch (error) {
      setErrorMsg('Terjadi kesalahan: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div>
        <SharedNavbar />
        <div style={{ padding: '40px', textAlign: 'center' }}>⏳ Loading...</div>
      </div>
    );
  }

  // Pilihan Tipe
  if (!selectedType) {
    return (
      <div>
        <SharedNavbar />

        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '60px 24px' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <h1 style={{ fontSize: '36px', fontWeight: '700', marginBottom: '12px' }}>
              ➕ Tambahkan Barang/Jasa
            </h1>
            <p style={{ color: '#666', fontSize: '16px' }}>
              Pilih tipe yang ingin Anda sewakan
            </p>
          </div>

          {/* Type Selection Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', maxWidth: '700px', margin: '0 auto' }}>
            {/* Barang Card */}
            <div
              onClick={() => setSelectedType('barang')}
              style={{
                padding: '40px 24px',
                border: '2px solid #e5e7eb',
                borderRadius: '12px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.3s',
                background: 'white'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#B28A67';
                e.currentTarget.style.boxShadow = '0 10px 25px rgba(178, 138, 103, 0.1)';
                e.currentTarget.style.transform = 'translateY(-4px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e5e7eb';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>📦</div>
              <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px', color: '#1f2937' }}>
                Sewa Barang
              </h2>
              <p style={{ color: '#666', fontSize: '14px', marginBottom: '24px' }}>
                Sewakan peralatan, elektronik, furniture, dan berbagai jenis barang fisik
              </p>
              <button style={{
                padding: '12px 24px',
                background: '#B28A67',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer'
              }}>
                Pilih →
              </button>
            </div>

            {/* Jasa Card */}
            <div
              onClick={() => setSelectedType('jasa')}
              style={{
                padding: '40px 24px',
                border: '2px solid #e5e7eb',
                borderRadius: '12px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.3s',
                background: 'white'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#B28A67';
                e.currentTarget.style.boxShadow = '0 10px 25px rgba(178, 138, 103, 0.1)';
                e.currentTarget.style.transform = 'translateY(-4px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e5e7eb';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>💼</div>
              <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px', color: '#1f2937' }}>
                Sewa Jasa
              </h2>
              <p style={{ color: '#666', fontSize: '14px', marginBottom: '24px' }}>
                Tawarkan jasa profesional dan transportasi seperti konsultasi, pelatihan, desain, fotografi, serta layanan kendaraan
              </p>
              <button style={{
                padding: '12px 24px',
                background: '#B28A67',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer'
              }}>
                Pilih →
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Form
  return (
    <div>
      <SharedNavbar />

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 24px' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <button
            onClick={() => setSelectedType(null)}
            style={{
              padding: '8px 16px',
              background: '#f3f4f6',
              color: '#374151',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer',
              marginBottom: '16px'
            }}
          >
            ← Kembali
          </button>
          <h1 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '8px' }}>
            {selectedType === 'barang' ? '📦 Tambah Sewa Barang' : '💼 Tambah Sewa Jasa'}
          </h1>
        </div>

        {/* Messages */}
        {successMsg && (
          <div style={{
            background: '#dcfce7',
            border: '2px solid #86efac',
            color: '#166534',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '24px'
          }}>
            {successMsg}
          </div>
        )}

        {errorMsg && (
          <div style={{
            background: '#fee2e2',
            border: '2px solid #fca5a5',
            color: '#991b1b',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '24px',
            whiteSpace: 'pre-wrap'
          }}>
            {errorMsg}
          </div>
        )}

        {/* Form */}
        <VendorProductForm
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          errorMsg=""
          successMsg=""
          categories={selectedType === 'barang' ? BARANG_CATEGORY_TREE : SERVICE_CATEGORY_TREE}
        />
      </div>
    </div>
  );
}
