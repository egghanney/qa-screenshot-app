import { NextResponse } from 'next/server';
import { getPgPool } from '@/lib/supabase/serverDb';

const PRIMARY_ADMIN_EMAIL = 'egghanney@gmail.com';

// GET: List all team users and their profile details
export async function GET(req: Request) {
  const pool = getPgPool();
  try {
    const query = `
      SELECT 
        p.id,
        p.email,
        p.full_name,
        p.role,
        p.status,
        p.created_at,
        p.updated_at,
        u.last_sign_in_at
      FROM public.qa_profiles p
      LEFT JOIN auth.users u ON p.id = u.id
      ORDER BY 
        CASE WHEN LOWER(p.email) = LOWER($1) THEN 0 ELSE 1 END,
        p.created_at DESC;
    `;
    const res = await pool.query(query, [PRIMARY_ADMIN_EMAIL]);

    return NextResponse.json({
      success: true,
      users: res.rows,
    });
  } catch (err: any) {
    console.error('Error fetching admin users list:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Admin creates a new team user
export async function POST(req: Request) {
  const pool = getPgPool();
  try {
    const { email, password, fullName, role = 'tester' } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required.' },
        { status: 400 }
      );
    }

    if (typeof password !== 'string' || password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const validRole = ['admin', 'tester', 'viewer'].includes(role) ? role : 'tester';
    const cleanName = fullName?.trim() || cleanEmail.split('@')[0];

    // Check if user already exists
    const existing = await pool.query(
      'SELECT id FROM auth.users WHERE LOWER(email) = $1',
      [cleanEmail]
    );
    if (existing.rows.length > 0) {
      return NextResponse.json(
        { error: `User with email "${cleanEmail}" already exists.` },
        { status: 409 }
      );
    }

    // 1. Create user via Supabase Auth
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          full_name: cleanName,
          role: validRole,
        },
      },
    });

    if (signUpError) {
      throw signUpError;
    }

    const newUserId = signUpData.user?.id;

    // Ensure role is explicitly set on qa_profiles if trigger didn't catch metadata
    if (newUserId) {
      await pool.query(
        'UPDATE public.qa_profiles SET role = $1, full_name = $2 WHERE id = $3',
        [validRole, cleanName, newUserId]
      );
    }

    return NextResponse.json({
      success: true,
      message: `User ${cleanEmail} created successfully.`,
      user: {
        id: newUserId,
        email: cleanEmail,
        full_name: cleanName,
        role: validRole,
      },
    });
  } catch (err: any) {
    console.error('Error creating user:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH: Update user role, active status, or reset password
export async function PATCH(req: Request) {
  const pool = getPgPool();
  try {
    const { id, role, status, newPassword } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'User ID is required.' }, { status: 400 });
    }

    // Check user
    const checkUser = await pool.query(
      'SELECT id, email FROM public.qa_profiles WHERE id = $1',
      [id]
    );
    if (checkUser.rows.length === 0) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    const userEmail = checkUser.rows[0].email;
    const isPrimaryAdmin = userEmail.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase();

    // 1. Update role if provided
    if (role && ['admin', 'tester', 'viewer'].includes(role)) {
      // Primary admin cannot be demoted
      const assignedRole = isPrimaryAdmin ? 'admin' : role;
      await pool.query(
        'UPDATE public.qa_profiles SET role = $1, updated_at = NOW() WHERE id = $2',
        [assignedRole, id]
      );
    }

    // 2. Update status if provided
    if (status && ['active', 'suspended'].includes(status)) {
      if (isPrimaryAdmin && status === 'suspended') {
        return NextResponse.json(
          { error: 'Primary admin account cannot be suspended.' },
          { status: 400 }
        );
      }
      await pool.query(
        'UPDATE public.qa_profiles SET status = $1, updated_at = NOW() WHERE id = $2',
        [status, id]
      );
    }

    // 3. Reset password if provided
    if (newPassword && typeof newPassword === 'string' && newPassword.length >= 6) {
      const updatePasswordQuery = `
        UPDATE auth.users 
        SET encrypted_password = crypt($2, gen_salt('bf', 10)), 
            updated_at = NOW() 
        WHERE id = $1;
      `;
      await pool.query(updatePasswordQuery, [id, newPassword]);
    }

    return NextResponse.json({
      success: true,
      message: 'User updated successfully.',
    });
  } catch (err: any) {
    console.error('Error updating user:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE: Remove a user from the workspace
export async function DELETE(req: Request) {
  const pool = getPgPool();
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'User ID is required.' }, { status: 400 });
    }

    const checkUser = await pool.query(
      'SELECT id, email FROM public.qa_profiles WHERE id = $1',
      [id]
    );
    if (checkUser.rows.length === 0) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    if (checkUser.rows[0].email.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase()) {
      return NextResponse.json(
        { error: 'Cannot delete the primary admin account.' },
        { status: 403 }
      );
    }

    // Deleting from auth.users cascades to auth.identities and public.qa_profiles
    await pool.query('DELETE FROM auth.users WHERE id = $1', [id]);

    return NextResponse.json({
      success: true,
      message: 'User removed from team successfully.',
    });
  } catch (err: any) {
    console.error('Error deleting user:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
