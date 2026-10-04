import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: cors,
  });

const alias = (name: string) =>
  `u${btoa(
    unescape(
      encodeURIComponent(name.trim().toLowerCase())
    )
  )
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '')}@campuspay.invalid`;

Deno.serve(async (req) => {
  // ==============================
  // CORS
  // ==============================

  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: cors,
    });
  }

  if (req.method !== 'POST') {
    return json(
      {
        error: 'POST required',
      },
      405
    );
  }

  // ==============================
  // SUPABASE CONFIG
  // ==============================

  const url = Deno.env.get('SUPABASE_URL')!;
  const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
  const secret = Deno.env.get(
    'SUPABASE_SERVICE_ROLE_KEY'
  )!;

  // ==============================
  // GET AUTH TOKEN
  // ==============================

  const token = req.headers
    .get('Authorization')
    ?.replace(/^Bearer\s+/i, '');

  if (!token) {
    return json(
      {
        error: 'Sign in required.',
      },
      401
    );
  }

  // ==============================
  // CHECK CURRENT USER
  // ==============================

  const caller = createClient(url, anon, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  const {
    data: { user },
    error: authError,
  } = await caller.auth.getUser(token);

  if (authError || !user) {
    return json(
      {
        error: 'Invalid session.',
      },
      401
    );
  }

  // ==============================
  // SERVICE ROLE CLIENT
  // ==============================

  const root = createClient(url, secret, {
    auth: {
      persistSession: false,
    },
  });

  // ==============================
  // CHECK ADMIN PROFILE
  // ==============================

  const {
    data: profile,
    error: profileError,
  } = await root
    .from('profiles')
    .select('role, student_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (profileError) {
    return json(
      {
        error: `Profile lookup failed: ${profileError.message}`,
        user_id: user.id,
      },
      403
    );
  }

  if (!profile || profile.role !== 'admin') {
    return json(
      {
        error: 'Administrator access required.',
        user_id: user.id,
        role: profile?.role ?? null,
      },
      403
    );
  }

  try {
    // ==============================
    // REQUEST BODY
    // ==============================

    const {
      action,
      student,
      studentId,
      password,
    } = await req.json();

    // ==============================
    // CREATE STUDENT
    // ==============================

    if (action === 'create') {
      if (!student) {
        throw new Error(
          'Student information is required.'
        );
      }

      const username = String(
        student.username ?? ''
      ).trim();

      const fullName = String(
        student.fullName ?? ''
      ).trim();

      const studentIdValue = String(
        student.id ?? ''
      ).trim();

      const studentPassword = String(
        student.password ?? ''
      );

      if (!studentIdValue) {
        throw new Error(
          'Student ID is required.'
        );
      }

      if (!username) {
        throw new Error(
          'Username is required.'
        );
      }

      if (!fullName) {
        throw new Error(
          'Full name is required.'
        );
      }

      if (studentPassword.length < 6) {
        throw new Error(
          'Password must contain at least 6 characters.'
        );
      }

      const email = alias(username);

      // ------------------------------
      // CREATE AUTH ACCOUNT
      // ------------------------------

      const {
        data: created,
        error: authCreateError,
      } = await root.auth.admin.createUser({
        email,
        password: studentPassword,
        email_confirm: true,
        user_metadata: {
          campuspay_role: 'student',
          full_name: fullName,
        },
      });

      if (authCreateError) {
        throw authCreateError;
      }

      if (!created?.user?.id) {
        throw new Error(
          'Student authentication account was not created.'
        );
      }

      // ------------------------------
      // CREATE STUDENT RECORD
      // ------------------------------

      const {
        error: dbError,
      } = await root
.from('students')
.insert({
    id: studentIdValue,
    username,
    full_name: fullName,
    email: student.email || null,
    phone: student.phone || null,
    course: student.course || null,
    class_name: student.className || null,
});

      if (dbError) {
        await root.auth.admin.deleteUser(
          created.user.id
        );

        throw dbError;
      }

      // ------------------------------
      // CREATE PROFILE
      // ------------------------------

      const {
        error: profileInsertError,
      } = await root
        .from('profiles')
        .insert({
          user_id: created.user.id,
          role: 'student',
          student_id: studentIdValue,
        });

      if (profileInsertError) {
        await root
          .from('students')
          .delete()
          .eq('id', studentIdValue);

        await root.auth.admin.deleteUser(
          created.user.id
        );

        throw profileInsertError;
      }

      return json({
        ok: true,
        message:
          'Student account created successfully.',
      });
    }

    // ==============================
    // UPDATE STUDENT
    // ==============================

    if (action === 'update') {
      if (!student) {
        throw new Error(
          'Student information is required.'
        );
      }

      const {
        data: old,
        error: oldError,
      } = await root
        .from('students')
        .select('username')
        .eq('id', studentId)
        .single();

      if (oldError) {
        throw oldError;
      }

      if (!old) {
        throw new Error(
          'Student not found.'
        );
      }

      const {
        data: profileRow,
        error: profileRowError,
      } = await root
        .from('profiles')
        .select('user_id')
        .eq('student_id', studentId)
        .single();

      if (profileRowError) {
        throw profileRowError;
      }

      if (!profileRow) {
        throw new Error(
          'Student authentication account not found.'
        );
      }

      const newId = String(
        student.id ?? studentId
      ).trim();

      const {
        error: authUpdateError,
      } = await root.auth.admin.updateUserById(
        profileRow.user_id,
        {
          email: alias(student.username),
          ...(student.password
            ? {
                password: student.password,
              }
            : {}),
        }
      );

      if (authUpdateError) {
        throw authUpdateError;
      }

      const {
        error: updateError,
      } = await root
        .from('students')
        .update({
          id: newId,
          username: student.username.trim(),
          full_name: student.fullName.trim(),
          email: student.email || null,
          phone: student.phone || null,
          course: student.course || null,
          class_name: student.className || null,
          updated_at:
            new Date().toISOString(),
        })
        .eq('id', studentId);

      if (updateError) {
        throw updateError;
      }

      // Keep profile linked to new Student ID
      if (newId !== String(studentId)) {
        const {
          error: profileUpdateError,
        } = await root
          .from('profiles')
          .update({
            student_id: newId,
          })
          .eq(
            'student_id',
            studentId
          );

        if (profileUpdateError) {
          throw profileUpdateError;
        }
      }

      return json({
        ok: true,
        message:
          'Student updated successfully.',
      });
    }

    // ==============================
    // RESET STUDENT PASSWORD
    // ==============================

    if (action === 'reset-password') {
      if (!password) {
        throw new Error(
          'New password is required.'
        );
      }

      if (String(password).length < 6) {
        throw new Error(
          'Password must contain at least 6 characters.'
        );
      }

      const {
        data: row,
        error: rowError,
      } = await root
        .from('profiles')
        .select('user_id')
        .eq('student_id', studentId)
        .single();

      if (rowError) {
        throw rowError;
      }

      if (!row) {
        throw new Error(
          'Student authentication account not found.'
        );
      }

      const {
        error: passwordError,
      } = await root.auth.admin.updateUserById(
        row.user_id,
        {
          password,
        }
      );

      if (passwordError) {
        throw passwordError;
      }

      return json({
        ok: true,
        message:
          'Student password reset successfully.',
      });
    }

    // ==============================
    // DELETE STUDENT
    // ==============================

    if (action === 'delete') {
      const {
        data: row,
        error: rowError,
      } = await root
        .from('profiles')
        .select('user_id')
        .eq('student_id', studentId)
        .maybeSingle();

      if (rowError) {
        throw rowError;
      }

      if (row) {
        const {
          error: authDeleteError,
        } = await root.auth.admin.deleteUser(
          row.user_id
        );

        if (authDeleteError) {
          throw authDeleteError;
        }
      }

      const {
        error: studentDeleteError,
      } = await root
        .from('students')
        .delete()
        .eq('id', studentId);

      if (studentDeleteError) {
        throw studentDeleteError;
      }

      return json({
        ok: true,
        message:
          'Student deleted successfully.',
      });
    }

    // ==============================
    // RESET WORKSPACE
    // ==============================

    if (action === 'reset-workspace') {
      const {
        data: accounts,
        error: accountsError,
      } = await root
        .from('profiles')
        .select('user_id')
        .eq('role', 'student');

      if (accountsError) {
        throw accountsError;
      }

      for (const account of accounts ?? []) {
        const {
          error: accountError,
        } = await root.auth.admin.deleteUser(
          account.user_id
        );

        if (accountError) {
          throw accountError;
        }
      }

      const {
        error: studentsError,
      } = await root
        .from('students')
        .delete()
        .neq('id', '');

      if (studentsError) {
        throw studentsError;
      }

      for (const table of [
        'payments',
        'receipts',
        'complaints',
        'notifications',
        'audit_logs',
      ]) {
        const {
          error: cleanupError,
        } = await root
          .from(table)
          .delete()
          .neq('id', '');

        if (cleanupError) {
          throw cleanupError;
        }
      }

      return json({
        ok: true,
        message:
          'Workspace reset successfully.',
      });
    }

    // ==============================
    // UNKNOWN ACTION
    // ==============================

    throw new Error(
      'Unsupported admin action.'
    );

  } catch (error) {
    console.error(
      'CampusPay admin error:',
      error
    );

    return json(
      {
        error:
          error instanceof Error
            ? error.message
            : String(error),
      },
      400
    );
  }
});