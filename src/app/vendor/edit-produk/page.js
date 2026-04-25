'use client';

import React, { useState, useEffect } from 'react';
import SharedNavbar from '../../components/SharedNavbar';
import { useRouter, useSearchParams } from 'next/navigation';
import VendorProductForm from '../VendorProductForm';
import {
  ALL_VENDOR_CATEGORY_TREE,
  getSubCategoryMap,
  getSuperSubOptions
} from '../category-tree';

export default function EditProdukPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const itemId = searchParams.get('id');
  
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  const [formData, setFormData] = useState({
    mainCategory: '',
    subCategory: '',
    superSubCategory: '',
    title: '',
    shortDescription: '',
    description: '',
    price: '',
    minimumDays: 1,
    quantity: '',
    rentalPolicy: '',
    location: '',
    images: [],
    specifications: {},
    descriptionTable: {},
    checklist: {},
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
    
    if (itemId) {
      fetchItemData(itemId, parsedUser.id);
    } else {
      setLoading(false);
    }
  }, [itemId]);

  const fetchItemData = async (id, vendorId) => {
    try {
      const response = await fetch(`/api/vendor/services?vendorId=${vendorId}`);
      const data = await response.json();
      
      if (data.success && Array.isArray(data.data)) {
        const item = data.data.find(i => i.id === id);
        if (item) {
          setFormData({
            mainCategory: item.mainCategory || item.category || '',
            subCategory: item.subCategory || '',
            superSubCategory: item.superSubCategory || '',
            title: item.title || '',
            shortDescription: item.shortDescription || '',
            description: item.description || item.detailDescription || '',
            price: item.price?.toString() || '',
            minimumDays: item.minimumDays || 1,
            quantity: item.quantity?.toString() || '',
            rentalPolicy: item.rentalPolicy || '',
            location: item.location || '',
            images: item.images || [],
            specifications: item.specifications || {},
            descriptionTable: item.descriptionTable || {},
            checklist: item.checklist || {},
            items: item.items || []
          });
        }
      }
    } catch (error) {
      console.error('Error fetching item:', error);
      setErrorMsg('Gagal memuat data item');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const missingFields = [];
    const subCategoryMap = getSubCategoryMap(ALL_VENDOR_CATEGORY_TREE, formData.mainCategory);
    const superSubOptions = getSuperSubOptions(ALL_VENDOR_CATEGORY_TREE, formData.mainCategory, formData.subCategory);

    if (!formData.mainCategory) missingFields.push('Kategori Utama');
    if (!formData.subCategory && Object.keys(subCategoryMap).length > 0) missingFields.push('Sub Kategori');
    if (!formData.superSubCategory && superSubOptions.length > 0) {
      missingFields.push('Super-Sub Kategori');
    }
    if (!formData.title) missingFields.push('Nama Item');
    if (!formData.shortDescription) missingFields.push('Deskripsi Singkat');
    if (!formData.price) missingFields.push('Harga per Hari');
    if (!formData.quantity) missingFields.push('Jumlah Item');
    if (!formData.location) missingFields.push('Lokasi Pickup');

    if (missingFields.length > 0) {
      setErrorMsg('Bidang yang belum diisi:\n• ' + missingFields.join('\n• '));
      return;
    }

    setIsSubmitting(true);

    try {
      const submitData = {
        id: itemId,
        vendorId: user.id,
        vendorName: user.name,
        mainCategory: formData.mainCategory,
        subCategory: formData.subCategory,
        superSubCategory: formData.superSubCategory,
        category: formData.mainCategory,
        title: formData.title,
        shortDescription: formData.shortDescription,
        detailDescription: formData.description,
        description: formData.description,
        price: parseInt(formData.price),
        minimumDays: parseInt(formData.minimumDays),
        quantity: parseInt(formData.quantity),
        rentalPolicy: formData.rentalPolicy,
        location: formData.location,
        specifications: formData.specifications || {},
        descriptionTable: formData.descriptionTable || {},
        checklist: formData.checklist || {},
        items: formData.items || [],
        images: formData.images.filter(img => typeof img === 'string' && (img.startsWith('data:') || img.startsWith('http'))),
        rating: 0,
        rentCount: 0
      };

      const response = await fetch('/api/vendor/services', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData)
      });

      const data = await response.json();

      if (data.success) {
        setSuccessMsg('✅ Item berhasil diperbarui!');
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

  if (loading) {
    return (
      <div>
        <SharedNavbar />
        <div style={{ padding: '40px', textAlign: 'center' }}>⏳ Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div>
      <SharedNavbar />

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 24px' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <button
            onClick={() => router.push('/vendor/produk')}
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
            ✏️ Edit Item Sewa
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
          categories={ALL_VENDOR_CATEGORY_TREE}
          isEditing={true}
        />
      </div>
    </div>
  );
}
