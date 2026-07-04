// JANGAN ADA 'use client' DI SINI!
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

/**
 * GET /api/admin/customer-verification
 * - Get list of all customer KTP verifications with their status
 * - Query params: status (optional: pending, approved, rejected, not_submitted)
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status');

    const users = await query(
      `SELECT id, name, email, phone, role, ktp_status, ktp_data, ktp_submitted_at, ktp_verified_by, ktp_verified_at, ktp_rejection_reason
       FROM users
       WHERE role = 'customer'`
    );

    let verifications = users.map(u => {
      const ktpStatus = u.ktp_status || u.ktpStatus || 'not_submitted';
      const ktpData = u.ktp_data || u.ktpData || {};
      const ktpSubmittedAt = u.ktp_submitted_at || u.ktpSubmittedAt;
      const ktpVerifiedBy = u.ktp_verified_by || u.ktpVerifiedBy;
      const ktpVerifiedAt = u.ktp_verified_at || u.ktpVerifiedAt;
      const ktpRejectionReason = u.ktp_rejection_reason || u.ktpRejectionReason;

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        ktp_status: ktpStatus,
        ktp_data: ktpData,
        ktp_submitted_at: ktpSubmittedAt,
        ktp_verified_by: ktpVerifiedBy,
        ktp_verified_at: ktpVerifiedAt,
        ktp_rejection_reason: ktpRejectionReason
      };
    });

    if (statusFilter && statusFilter !== 'all') {
      verifications = verifications.filter(v => v.ktp_status === statusFilter);
    }

    verifications.sort((a, b) => {
      const aDate = new Date(a.ktp_submitted_at || 0);
      const bDate = new Date(b.ktp_submitted_at || 0);
      return bDate - aDate;
    });

    return NextResponse.json({
      success: true,
      source: 'sql',
      verifications,
      totalCount: verifications.length,
      statusCounts: {
        pending: verifications.filter(v => v.ktp_status === 'pending').length,
        approved: verifications.filter(v => v.ktp_status === 'approved').length,
        rejected: verifications.filter(v => v.ktp_status === 'rejected').length,
        notSubmitted: verifications.filter(v => v.ktp_status === 'not_submitted').length
      }
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching customer verifications:', error);
    return NextResponse.json({
      success: false,
      message: 'Gagal mengambil data verifikasi: ' + error.message
    }, { status: 500 });
  }
}

/**
 * POST /api/admin/customer-verification
 * - Submit/update KTP verification (customer or admin)
 * - Body: { userId, action: 'submit' | 'approve' | 'reject', ktpData?, rejectionReason? }
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { userId, action, ktpData, rejectionReason, adminId } = body;

    if (!userId || !action) {
      return NextResponse.json({
        success: false,
        message: 'userId dan action harus diisi'
      }, { status: 400 });
    }

    const validActions = ['submit', 'approve', 'reject'];
    if (!validActions.includes(action)) {
      return NextResponse.json({
        success: false,
        message: `Action harus salah satu dari: ${validActions.join(', ')}`
      }, { status: 400 });
    }

    const now = new Date().toISOString();

    // Try DB first
    try {
      // Get current user data
      const userResult = await query(
        'SELECT id, name, email, ktp_status FROM users WHERE id = ? LIMIT 1',
        [userId]
      );

      if (!userResult || userResult.length === 0) {
        return NextResponse.json({
          success: false,
          message: 'User tidak ditemukan'
        }, { status: 404 });
      }

      const user = userResult[0];

      let updateQuery = '';
      let updateParams = [];

      if (action === 'submit') {
        // Customer submits KTP for verification
        updateQuery = `
          UPDATE users 
          SET ktp_status = 'pending', 
              ktp_data = ?,
              ktp_submitted_at = ?
          WHERE id = ?
        `;
        updateParams = [JSON.stringify(ktpData || {}), now, userId];
      } else if (action === 'approve') {
        // Admin approves KTP
        updateQuery = `
          UPDATE users 
          SET ktp_status = 'approved',
              ktp_verified_by = ?,
              ktp_verified_at = ?,
              ktp_rejection_reason = NULL
          WHERE id = ?
        `;
        updateParams = [adminId || 'admin', now, userId];
      } else if (action === 'reject') {
        // Admin rejects KTP
        updateQuery = `
          UPDATE users 
          SET ktp_status = 'rejected',
              ktp_verified_by = ?,
              ktp_verified_at = ?,
              ktp_rejection_reason = ?
          WHERE id = ?
        `;
        updateParams = [adminId || 'admin', now, rejectionReason || '', userId];
      }

      await query(updateQuery, updateParams);

      const [updatedUser] = await query(
        'SELECT id, name, email, ktp_status, ktp_data, ktp_submitted_at, ktp_verified_by, ktp_verified_at, ktp_rejection_reason FROM users WHERE id = ? LIMIT 1',
        [userId]
      );

      return NextResponse.json({
        success: true,
        message: `KTP ${action} berhasil!`,
        user: updatedUser,
        timestamp: now
      }, { status: 200 });
    } catch (dbError) {
      console.error('Database error processing customer verification:', dbError);
      return NextResponse.json({
        success: false,
        message: 'Gagal memproses verifikasi KTP: ' + dbError.message
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error processing customer verification:', error);
    return NextResponse.json({
      success: false,
      message: 'Terjadi kesalahan: ' + error.message
    }, { status: 500 });
  }
}
