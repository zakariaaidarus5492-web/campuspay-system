'use strict';

const KEYS = {
    students: 'students',
    payments: 'payments',
    receipts: 'receipts',
    complaints: 'complaints',
    notifications: 'notifications',
    admin: 'admin',
    settings: 'settings',
    audit: 'audit_logs',
    session: 'session'
};

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

const esc = s =>
    String(s ?? '').replace(/[&<>"']/g, c => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[c]));

const stamp = () => new Date().toISOString();

const id = p =>
    p +
    '-' +
    Date.now().toString(36).toUpperCase() +
    '-' +
    Math.random().toString(36).slice(2, 7).toUpperCase();

const date = v =>
    v
        ? new Date(v).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
          })
        : '—';

const initials = n =>
    (n || '?')
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(x => x[0])
        .join('')
        .toUpperCase();


/* =========================================================
   AUTH EMAIL ALIAS
========================================================= */

const aliases = username => {

    const u = String(username || '')
        .trim()
        .toLowerCase();

    if (u === 'admin') {
        return 'uywrtaw4@campuspay.invalid';
    }

    return (
        'u' +
        btoa(unescape(encodeURIComponent(u)))
            .replaceAll('+', '-')
            .replaceAll('/', '_')
            .replaceAll('=', '')
    ) + '@campuspay.invalid';
};


/* =========================================================
   DEFAULT STORE
========================================================= */

const emptyStore = {
    students: [],
    payments: [],
    receipts: [],
    complaints: [],
    notifications: [],
    audit_logs: [],
    admin: {
        username: ''
    },
    settings: {
        schoolName: 'CampusPay Student Finance',
        currency: 'USD',
        monthlyFee: 2.50,
        yearlyFee: 30.00
    }
};

const store = structuredClone(emptyStore);

let session = null;
let ready = false;


/* =========================================================
   SUPABASE CONNECTION
========================================================= */

const validConfig = () =>
    window.CAMPUSPAY_SUPABASE_URL?.startsWith('https://') &&
    window.CAMPUSPAY_SUPABASE_PUBLIC_KEY &&
    !window.CAMPUSPAY_SUPABASE_PUBLIC_KEY.startsWith('YOUR_');

const db =
    validConfig() && window.supabase?.createClient
        ? window.supabase.createClient(
              window.CAMPUSPAY_SUPABASE_URL,
              window.CAMPUSPAY_SUPABASE_PUBLIC_KEY
          )
        : null;


function userMessage(error) {
    return (
        error?.message ||
        'The database request failed. Check your connection and try again.'
    );
}


function ensureDb() {

    if (!db) {
        throw Error(
            'CampusPay is not connected. Add your Supabase project URL and public key to js/supabase-config.js, then reload.'
        );
    }
}


/* =========================================================
   DATABASE → APP DATA
========================================================= */

const toStudent = r => ({
    id: r.id,
    username: r.username,
    fullName: r.full_name,
    email: r.email || '',
    phone: r.phone || '',
    course: r.course || '',
    className: r.class_name || '',
    gender: r.gender || '',
    createdAt: r.created_at,
    updatedAt: r.updated_at
});


const toPayment = r => ({
    ...r,
    studentId: r.student_id,
    paymentDate: r.payment_date
});


const toReceipt = r => ({
    ...r,
    paymentId: r.payment_id,
    studentId: r.student_id,
    createdAt: r.created_at
});


const toComplaint = r => ({
    ...r,
    studentId: r.student_id,
    date: r.complaint_date
});


const toNotification = r => ({
    ...r,
    createdAt: r.created_at
});


const toAudit = r => ({
    ...r,
    createdAt: r.created_at
});


/* =========================================================
   LOAD CAMPUS DATA
========================================================= */

async function loadCampusData() {

    ensureDb();

    const {
        data: { user },
        error
    } = await db.auth.getUser();

    if (error) {
        throw error;
    }

    if (!user) {
        session = null;
        ready = true;
        return null;
    }


    const {
        data: profile,
        error: profileError
    } = await db
        .from('profiles')
        .select('role,student_id,username')
        .eq('user_id', user.id)
        .single();


    if (profileError || !profile) {

        await db.auth.signOut();

        throw Error(
            'Your CampusPay profile was not found. Please contact the administrator.'
        );
    }


    session = {
        role: profile.role,
        studentId: profile.student_id,
        name:
            user.user_metadata?.full_name ||
            user.email?.split('@')[0] ||
            'CampusPay user',
        userId: user.id
    };


    if (profile.role === 'admin') {

        store.admin.username = profile.username || 'admin';

    }


    const queries = await Promise.all([

        db
            .from('students')
            .select('*'),

        db
            .from('payments')
            .select('*')
            .order('payment_date', {
                ascending: false
            }),

        db
            .from('receipts')
            .select('*')
            .order('created_at', {
                ascending: false
            }),

        db
            .from('complaints')
            .select('*')
            .order('complaint_date', {
                ascending: false
            }),

        db
            .from('notifications')
            .select('*')
            .order('created_at', {
                ascending: false
            }),

        db
            .from('audit_logs')
            .select('*')
            .order('created_at', {
                ascending: false
            })
            .limit(500),

        db
            .from('school_settings')
            .select('*')
            .eq('id', true)
            .maybeSingle()

    ]);


    const fail = queries.find(q => q.error);

    if (fail) {
        throw fail.error;
    }


    const settingsRow = queries[6].data;


    store.students =
        queries[0].data?.map(toStudent) || [];


    store.payments =
        queries[1].data?.map(toPayment) || [];


    store.receipts =
        queries[2].data?.map(toReceipt) || [];


    store.complaints =
        queries[3].data?.map(toComplaint) || [];


    store.notifications =
        queries[4].data?.map(toNotification) || [];


    store.audit_logs =
        queries[5].data?.map(toAudit) || [];


    if (settingsRow) {

        store.settings = {
            schoolName:
                settingsRow.school_name ||
                'CampusPay Student Finance',

            currency:
                settingsRow.currency ||
                'USD',

            monthlyFee:
                Number(settingsRow.monthly_fee) || 2.50,

            yearlyFee:
                Number(settingsRow.yearly_fee) || 30.00
        };

    } else {

        store.settings = {
            schoolName: 'CampusPay Student Finance',
            currency: 'USD',
            monthlyFee: 2.50,
            yearlyFee: 30.00
        };

    }


    if (session.role === 'student') {

        const s = store.students.find(
            x => x.id === session.studentId
        );

        if (s) {
            session.name = s.fullName;
        }

    }


    ready = true;

    return session;
}


/* =========================================================
   READ / MONEY / GETTERS
========================================================= */

function read(key, fallback = []) {

    if (key === 'session') {
        return session;
    }

    return store[key] ?? fallback;
}


function money(v) {

    return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: store.settings.currency || 'USD'
    }).format(Number(v) || 0);

}


const getStudents = () => store.students;

const getStudentById = x =>
    store.students.find(s => s.id === x);

const getPayments = () =>
    store.payments;

const getComplaints = () =>
    store.complaints;

const getNotifications = () =>
    store.notifications;

const getReceipts = () =>
    store.receipts;


/* =========================================================
   DATABASE HELPERS
========================================================= */

async function dbInsert(table, row) {

    ensureDb();

    const {
        data,
        error
    } = await db
        .from(table)
        .insert(row)
        .select()
        .single();

    if (error) {
        throw error;
    }

    return data;
}


async function dbUpdate(table, idv, row) {

    ensureDb();

    const {
        data,
        error
    } = await db
        .from(table)
        .update(row)
        .eq('id', idv)
        .select()
        .single();

    if (error) {
        throw error;
    }

    return data;
}


async function dbDelete(table, idv) {

    ensureDb();

    const {
        error
    } = await db
        .from(table)
        .delete()
        .eq('id', idv);

    if (error) {
        throw error;
    }

}


/* =========================================================
   ADMIN EDGE FUNCTION
========================================================= */

async function invokeAdmin(body) {

    ensureDb();

    const {
        data,
        error
    } = await db.functions.invoke(
        'campuspay-admin',
        {
            body
        }
    );


    if (error) {

        let message =
            error.message ||
            'Administrator request failed.';

        try {

            const payload =
                await error.context.json();

            if (payload.error) {
                message = payload.error;
            }

        } catch {}

        throw Error(message);
    }


    if (data?.error) {
        throw Error(data.error);
    }


    return data;
}


/* =========================================================
   WRITE SETTINGS
========================================================= */

async function write(key, value) {

    ensureDb();


    if (key === 'settings') {

        const settings = {
            schoolName:
                String(
                    value?.schoolName ||
                    'CampusPay Student Finance'
                ),

            currency:
                String(
                    value?.currency ||
                    'USD'
                ),

            monthlyFee:
                Number(value?.monthlyFee) || 2.50,

            yearlyFee:
                Number(value?.yearlyFee) || 30.00
        };


        const {
            error
        } = await db
            .from('school_settings')
            .upsert(
                {
                    id: true,
                    school_name: settings.schoolName,
                    currency: settings.currency,
                    monthly_fee: settings.monthlyFee,
                    yearly_fee: settings.yearlyFee,
                    updated_at: stamp()
                },
                {
                    onConflict: 'id'
                }
            );


        if (error) {
            throw error;
        }


        store.settings = settings;

        return;
    }


    throw Error(
        'This data can only be changed through its supported screen.'
    );
}


/* =========================================================
   LOGIN
========================================================= */

async function login(role, username, password) {

    ensureDb();


    const enteredUsername =
        String(username || '')
            .trim()
            .toLowerCase();


    if (!enteredUsername) {
        throw Error('Username is required.');
    }


    if (!password) {
        throw Error('Password is required.');
    }


    let authEmail =
        aliases(enteredUsername);


    if (role === 'admin') {

        const {
            data: email,
            error
        } = await db.rpc(
            'get_admin_login_email_by_username',
            {
                p_username: enteredUsername
            }
        );


        if (error) {
            throw error;
        }


        if (!email) {
            throw Error(
                'Incorrect username or password.'
            );
        }


        authEmail = email;
    }


    const {
        data,
        error
    } = await db.auth.signInWithPassword({
        email: authEmail,
        password
    });


    if (error) {
        throw Error(
            'Incorrect username or password.'
        );
    }


    const {
        data: profile,
        error: profileError
    } = await db
        .from('profiles')
        .select(
            'role,student_id,username'
        )
        .eq(
            'user_id',
            data.user.id
        )
        .single();


    if (
        profileError ||
        !profile ||
        profile.role !== role
    ) {

        await db.auth.signOut();

        throw Error(
            'Incorrect username or password.'
        );
    }


    await loadCampusData();

    return session;
}


/* =========================================================
   LOGOUT
========================================================= */

async function logout() {

    ensureDb();

    const {
        error
    } = await db.auth.signOut();

    if (error) {
        throw error;
    }

    session = null;

    location.href = '../index.html';
}


function currentSession() {

    return session;

}


/* =========================================================
   AUDIT LOG
========================================================= */

async function addAuditLog(action) {

    ensureDb();


    const row = {
        id: id('LOG'),
        action,
        actor: session?.userId || 'system'
    };


    const saved =
        await dbInsert(
            'audit_logs',
            row
        );


    store.audit_logs.unshift(
        toAudit(saved)
    );

}


/* =========================================================
   STUDENTS
========================================================= */

async function addStudent(student) {

    await invokeAdmin({
        action: 'create',
        student
    });


    await loadCampusData();


    const saved =
        getStudentById(student.id);


    if (!saved) {
        throw Error(
            'Student was created, but the student record could not be loaded.'
        );
    }


    await addAuditLog(
        `Created student account ${saved.id}`
    );


    return saved;
}


async function updateStudent(
    oldId,
    updates
) {

    await invokeAdmin({
        action: 'update',
        studentId: oldId,
        student: updates
    });


    await loadCampusData();


    const saved =
        getStudentById(
            String(
                updates.id ?? oldId
            ).trim()
        );


    if (!saved) {
        throw Error(
            'Student was updated, but the student record could not be loaded.'
        );
    }


    await addAuditLog(
        `Updated student account ${saved.id}`
    );


    return saved;
}


async function deleteStudent(
    studentId
) {

    await invokeAdmin({
        action: 'delete',
        studentId
    });


    await loadCampusData();


    await addAuditLog(
        `Deleted student ${studentId} and linked records`
    );

}


async function resetStudentPassword(
    studentId,
    password
) {

    if (
        String(password || '').length < 6
    ) {
        throw Error(
            'Password must contain at least 6 characters.'
        );
    }


    await invokeAdmin({
        action: 'reset-password',
        studentId,
        password
    });


    await addAuditLog(
        `Reset password for ${studentId}`
    );

}


/* =========================================================
   ADMIN USERNAME + PASSWORD
========================================================= */

async function updateAdminCredentials(
    username,
    password
) {

    ensureDb();


    const newUsername =
        String(username || '')
            .trim()
            .toLowerCase();


    if (!newUsername) {

        throw Error(
            'Admin username is required.'
        );

    }


    if (!/^[a-zA-Z]+$/.test(newUsername)) {

        throw Error(
            'Admin username can contain letters only.'
        );

    }


    if (!session?.userId) {

        throw Error(
            'Admin session not found.'
        );

    }


    const newPassword =
        String(password || '');


    if (
        newPassword &&
        newPassword.length < 6
    ) {

        throw Error(
            'Password must contain at least 6 characters.'
        );

    }


    /*
       Username update
    */

    const {
        error: usernameError
    } = await db
        .from('profiles')
        .update({
            username: newUsername
        })
        .eq(
            'user_id',
            session.userId
        );


    if (usernameError) {

        if (
            usernameError.code === '23505'
        ) {

            throw Error(
                'This admin username is already in use.'
            );

        }

        throw usernameError;
    }


    /*
       Password update is OPTIONAL.

       If password field is empty,
       username can still be changed.
    */

    if (newPassword) {

        const {
            error: passwordError
        } = await db.auth.updateUser({
            password: newPassword,
            data: {
                username: newUsername
            }
        });


        if (passwordError) {
            throw passwordError;
        }

    } else {

        /*
           Keep Auth metadata synchronized
           when only username changes.
        */

        const {
            error: metadataError
        } = await db.auth.updateUser({
            data: {
                username: newUsername
            }
        });


        if (metadataError) {
            throw metadataError;
        }

    }


    store.admin.username =
        newUsername;


    await addAuditLog(
        `Updated administrator username to ${newUsername}`
    );

}


/* =========================================================
   STUDENT PASSWORD
========================================================= */

async function changeStudentPassword(
    oldPassword,
    newPassword
) {

    ensureDb();


    const {
        data,
        error
    } = await db.functions.invoke(
        'campuspay-student-password',
        {
            body: {
                oldPassword,
                newPassword
            }
        }
    );


    if (error) {
        throw Error(error.message);
    }


    if (data?.error) {
        throw Error(data.error);
    }

}


/* =========================================================
   RESET WORKSPACE
========================================================= */

async function resetWorkspace() {

    await invokeAdmin({
        action: 'reset-workspace'
    });


    await loadCampusData();


    await addAuditLog(
        'Workspace data reset'
    );

}


/* =========================================================
   PAYMENTS
========================================================= */

async function addPayment(payment) {

    if (
        !getStudentById(
            payment.studentId
        )
    ) {

        throw Error(
            'Student not found.'
        );

    }


    const p = {
        id: id('PAY'),
        student_id: payment.studentId,
        amount: Number(payment.amount) || 0,
        reference:
            payment.reference || null,
        payment_date:
            payment.paymentDate || stamp(),
        method:
            payment.method || null,
        status:
            payment.status || 'Pending',
        description:
            payment.description || null
    };


    const saved =
        toPayment(
            await dbInsert(
                'payments',
                p
            )
        );


    if (saved.status === 'Paid') {

        await generateReceipt(
            saved
        );

    }


    await addAuditLog(
        `Added payment ${saved.id} for ${saved.studentId}`
    );


    await loadCampusData();


    return saved;
}


async function updatePayment(
    paymentId,
    updates
) {

    const old =
        store.payments.find(
            x => x.id === paymentId
        );


    if (!old) {
        throw Error(
            'Payment not found.'
        );
    }


    const row = {
        amount:
            Number(
                updates.amount ??
                old.amount
            ) || 0,

        reference:
            updates.reference ??
            old.reference,

        payment_date:
            updates.paymentDate ??
            old.paymentDate,

        method:
            updates.method ??
            old.method,

        status:
            updates.status ??
            old.status,

        description:
            updates.description ??
            old.description,

        updated_at:
            stamp()
    };


    const saved =
        toPayment(
            await dbUpdate(
                'payments',
                paymentId,
                row
            )
        );


    if (
        saved.status === 'Paid'
    ) {

        await generateReceipt(
            saved
        );

    } else {

        const receipt =
            store.receipts.find(
                r =>
                    r.paymentId ===
                    paymentId
            );


        if (receipt) {

            await dbDelete(
                'receipts',
                receipt.id
            );

        }

    }


    await addAuditLog(
        `Updated payment ${paymentId}`
    );


    await loadCampusData();


    return saved;
}


/* =========================================================
   RECEIPTS
========================================================= */

async function generateReceipt(
    payment
) {

    let r =
        store.receipts.find(
            x =>
                x.paymentId ===
                payment.id
        );


    if (!r) {

        const saved =
            await dbInsert(
                'receipts',
                {
                    id: id('RCT'),
                    number:
                        'RCT-' +
                        Date.now()
                            .toString()
                            .slice(-8),

                    payment_id:
                        payment.id,

                    student_id:
                        payment.studentId
                }
            );


        r = toReceipt(
            saved
        );


        store.receipts.unshift(
            r
        );

    }


    return r;
}


/* =========================================================
   COMPLAINTS
========================================================= */

async function addComplaint(c) {

    if (
        !getStudentById(
            c.studentId
        )
    ) {

        throw Error(
            'Student not found.'
        );

    }


    const x =
        toComplaint(
            await dbInsert(
                'complaints',
                {
                    id: id('SUP'),
                    student_id:
                        c.studentId,
                    subject:
                        c.subject,
                    message:
                        c.message,
                    status:
                        'Pending'
                }
            )
        );


    await addAuditLog(
        `Complaint submitted by ${x.studentId}`
    );


    store.complaints.unshift(
        x
    );


    return x;
}


async function updateComplaint(
    idv,
    updates
) {

    const saved =
        toComplaint(
            await dbUpdate(
                'complaints',
                idv,
                {
                    ...updates,
                    updated_at:
                        stamp()
                }
            )
        );


    store.complaints =
        store.complaints.map(
            x =>
                x.id === idv
                    ? saved
                    : x
        );


    await addAuditLog(
        `Updated complaint ${idv}`
    );


    return saved;
}


/* =========================================================
   NOTIFICATIONS
========================================================= */

async function addNotification(n) {

    const x =
        toNotification(
            await dbInsert(
                'notifications',
                {
                    id: id('NTF'),
                    title: n.title,
                    message: n.message,
                    target:
                        n.target || 'all'
                }
            )
        );


    store.notifications.unshift(
        x
    );


    await addAuditLog(
        `Created notification: ${x.title}`
    );


    return x;
}