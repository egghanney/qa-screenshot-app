import { NextResponse } from 'next/server';
import { getPgPool } from '@/lib/supabase/serverDb';
import { supabase } from '@/lib/supabase/client';

const PRIMARY_ADMIN_EMAIL = 'egghanney@gmail.com';

// GET: Check if the primary admin account has been initialized
export async function GET() {
  const pool = getPgPool();
  try {
    const res = await pool.query(
      'SELECT id, email, created_at, last_sign_in_at FROM auth.users WHERE LOWER(email) = LOWER($1)',
      [PRIMARY_ADMIN_EMAIL]
    );

    const exists = res.rows.length > 0;
    const hasSignedIn = exists && !!res.rows[0].last_sign_in_at;

    return NextResponse.json({
      success: true,
      initialized: exists,
      hasSignedIn,
      adminEmail: PRIMARY_ADMIN_EMAIL,
    });
  } catch (err: any) {
    console.error('Error checking primary admin setup:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Initialize or set password for primary admin (egghanney@gmail.com)
export async function POST(req: Request) {
  const pool = getPgPool();
  try {
    const { password } = await req.json();

    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    const checkRes = await pool.query(
      'SELECT id, email, last_sign_in_at FROM auth.users WHERE LOWER(email) = LOWER($1)',
      [PRIMARY_ADMIN_EMAIL]
    );

    if (checkRes.rows.length === 0) {
      // 1. Create primary admin user via Supabase Auth
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: PRIMARY_ADMIN_EMAIL,
        password,
        options: {
          data: {
            full_name: 'Emmanuel Gyang Hanney',
            role: 'admin',
          },
        },
      });

      if (signUpError) {
        throw signUpError;
      }

      return NextResponse.json({
        success: true,
        message: 'Primary admin account created successfully. You can now log in.',
      });
    } else {
      // If admin already exists, reset their password
      const userId = checkRes.rows[0].id;
      const updateQuery = `
        UPDATE auth.users 
        SET encrypted_password = crypt($2, gen_salt('bf', 10)), 
            email_confirmed_at = NOW(),
            updated_at = NOW() 
        WHERE id = $1;
      `;
      await pool.query(updateQuery, [userId, password]);

      return NextResponse.json({
        success: true,
        message: 'Primary admin password updated successfully. You can now log in.',
      });
    }
  } catch (err: any) {
    console.error('Error setting up admin account:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
