import { NextResponse } from 'next/server';

import { query } from '@/lib/db';

const makeId = (prefix) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

function buildTree(rows) {
  const tree = {};

  for (const row of rows) {
    const parentName = row.parent_name;
    const subName = row.sub_name;
    const superSubName = row.super_sub_name;

    if (!parentName) continue;
    if (!tree[parentName]) tree[parentName] = {};

    if (subName) {
      if (!tree[parentName][subName]) tree[parentName][subName] = [];
      if (superSubName && !tree[parentName][subName].includes(superSubName)) {
        tree[parentName][subName].push(superSubName);
      }
    }
  }

  return tree;
}

async function ensureParent(parentName) {
  const existing = await query('SELECT id, name FROM category_parents WHERE name = ? LIMIT 1', [parentName]);
  if (existing.length > 0) return existing[0];

  const id = makeId('CAT-P');
  await query('INSERT INTO category_parents (id, name, created_at) VALUES (?, ?, ?)', [id, parentName, new Date().toISOString()]);
  return { id, name: parentName };
}

async function ensureSub(parentId, subName) {
  const existing = await query(
    'SELECT id, name FROM category_sub_categories WHERE parent_id = ? AND name = ? LIMIT 1',
    [parentId, subName]
  );
  if (existing.length > 0) return existing[0];

  const id = makeId('CAT-S');
  await query(
    'INSERT INTO category_sub_categories (id, parent_id, name, created_at) VALUES (?, ?, ?, ?)',
    [id, parentId, subName, new Date().toISOString()]
  );
  return { id, name: subName };
}

async function ensureSuperSub(subCategoryId, superSubName) {
  const existing = await query(
    'SELECT id, name FROM category_super_sub_categories WHERE sub_category_id = ? AND name = ? LIMIT 1',
    [subCategoryId, superSubName]
  );
  if (existing.length > 0) return existing[0];

  const id = makeId('CAT-SS');
  await query(
    'INSERT INTO category_super_sub_categories (id, sub_category_id, name, created_at) VALUES (?, ?, ?, ?)',
    [id, subCategoryId, superSubName, new Date().toISOString()]
  );
  return { id, name: superSubName };
}

export async function GET() {
  try {
    const rows = await query(
      `SELECT
         p.id AS parent_id,
         p.name AS parent_name,
         s.id AS sub_id,
         s.name AS sub_name,
         ss.id AS super_sub_id,
         ss.name AS super_sub_name
       FROM category_parents p
       LEFT JOIN category_sub_categories s ON s.parent_id = p.id
       LEFT JOIN category_super_sub_categories ss ON ss.sub_category_id = s.id
       ORDER BY p.name, s.name, ss.name`
    );

    return NextResponse.json({ success: true, data: buildTree(rows) }, { status: 200 });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json({ success: false, message: 'Gagal mengambil kategori dari SQL' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const mode = String(body.mode || '').toLowerCase();
    const parentName = String(body.parentName || '').trim();
    const subName = String(body.subName || '').trim();
    const superSubName = String(body.superSubName || '').trim();

    if (!parentName) {
      return NextResponse.json({ success: false, message: 'parentName wajib diisi' }, { status: 400 });
    }

    const parent = await ensureParent(parentName);

    if (mode === 'parent') {
      return NextResponse.json({ success: true, data: { parent } }, { status: 201 });
    }

    if (!subName) {
      return NextResponse.json({ success: false, message: 'subName wajib diisi untuk mode sub/super' }, { status: 400 });
    }

    const sub = await ensureSub(parent.id, subName);

    if (mode === 'sub') {
      return NextResponse.json({ success: true, data: { parent, sub } }, { status: 201 });
    }

    if (!superSubName) {
      return NextResponse.json({ success: false, message: 'superSubName wajib diisi untuk mode super' }, { status: 400 });
    }

    const superSub = await ensureSuperSub(sub.id, superSubName);

    return NextResponse.json({ success: true, data: { parent, sub, superSub } }, { status: 201 });
  } catch (error) {
    console.error('Error saving categories:', error);
    return NextResponse.json({ success: false, message: 'Gagal menyimpan kategori ke SQL' }, { status: 500 });
  }
}
