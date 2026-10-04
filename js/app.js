'use strict';

function pageHref(role,page) {
    const base=role==='admin'?'../admin/':'../student/';

    const map={
        overview:'dashboard.html',
        students:'students.html',
        payments:'payments.html',
        receipts:'receipts.html',
        complaints:'complaints.html',
        notifications:'notifications.html',
        reports:'reports.html',
        audit:'audit-logs.html',
        settings:'settings.html',
        profile:'profile.html'
    };

    return base+(map[page]||'dashboard.html');
}

function go(role,page) {
    location.href=pageHref(role,page);
}

function toast(msg,type='success') {
    let t=$('#toast');

    if(!t) {
        t=document.createElement('div');
        t.id='toast';
        t.className='toast';
        document.body.appendChild(t);
    }

    t.textContent=msg;
    t.className='toast '+type;
    t.classList.add('show');

    clearTimeout(window.__toast);

    window.__toast=setTimeout(
        ()=>t.classList.remove('show'),
        2600
    );
}

function modal(title,content,onSubmit,button='Save') {

    const wrap=document.createElement('div');

    wrap.className='modal-backdrop';

    wrap.innerHTML=`
        <div class="modal">

            <div class="modal-head">

                <h3>${title}</h3>

                <button
                    class="icon-button"
                    data-close
                >
                    ×
                </button>

            </div>

            <form id="modalForm">

                <div class="modal-body">
                    ${content}
                </div>

                <div class="modal-actions">

                    <button
                        type="button"
                        class="button ghost"
                        data-close
                    >
                        Cancel
                    </button>

                    <button
                        class="button primary"
                        type="submit"
                    >
                        ${button}
                    </button>

                </div>

            </form>

        </div>
    `;

    document.body.appendChild(wrap);

    enhancePasswordInputs(wrap);

    wrap.querySelectorAll('[data-close]').forEach(b=>{
        b.onclick=()=>wrap.remove();
    });

    wrap.querySelector('form').onsubmit=e=>{

        e.preventDefault();

        try {

            Promise.resolve(
                onSubmit(
                    new FormData(e.currentTarget)
                )
            )
            .then(()=>wrap.remove())
            .catch(err=>{

                const x=wrap.querySelector(
                    '.modal-error'
                );

                if(x) {

                    x.textContent=
                        userMessage(err);

                } else {

                    toast(
                        userMessage(err),
                        'error'
                    );

                }

            });

        } catch(err) {

            const x=wrap.querySelector(
                '.modal-error'
            );

            if(x) {

                x.textContent=err.message;

            }

        }
    };

    return wrap;
}

function passwordEyeMarkup(
    name,
    label,
    value,
    required,
    extra
) {

    return `
        <label>

            ${label}

            <span class="password-field">

                <input
                    name="${name}"
                    type="password"
                    value="${esc(value)}"
                    ${required?'required':''}
                    ${extra}
                >

                <button
                    type="button"
                    class="password-toggle"
                    data-password-toggle
                    aria-label="Show password"
                    title="Show password"
                >
                    👁
                </button>

            </span>

        </label>
    `;
}

const field=(
    name,
    label,
    value='',
    type='text',
    required=true,
    extra=''
)=>
    type==='password'
        ?passwordEyeMarkup(
            name,
            label,
            value,
            required,
            extra
        )
        :`
            <label>

                ${label}

                <input
                    name="${name}"
                    type="${type}"
                    value="${esc(value)}"
                    ${required?'required':''}
                    ${extra}
                >

            </label>
        `;

function enhancePasswordInputs(root=document) {

    root
        .querySelectorAll(
            'input[type="password"]'
        )
        .forEach(input=>{

            if(
                input.closest(
                    '.password-field'
                )
            ) {
                return;
            }

            const wrap=document.createElement(
                'span'
            );

            wrap.className='password-field';

            input.parentNode.insertBefore(
                wrap,
                input
            );

            wrap.appendChild(input);

            const b=document.createElement(
                'button'
            );

            b.type='button';
            b.className='password-toggle';

            b.setAttribute(
                'data-password-toggle',
                ''
            );

            b.setAttribute(
                'aria-label',
                'Show password'
            );

            b.title='Show password';
            b.textContent='👁';

            wrap.appendChild(b);

        });

    root
        .querySelectorAll(
            '[data-password-toggle]'
        )
        .forEach(b=>{

            if(b.dataset.bound) {
                return;
            }

            b.dataset.bound='1';

            b.addEventListener(
                'click',
                ()=>{

                    const input=
                        b.parentElement
                        .querySelector('input');

                    if(!input) {
                        return;
                    }

                    const show=
                        input.type==='password';

                    input.type=
                        show
                            ?'text'
                            :'password';

                    b.textContent=
                        show
                            ?'🙈'
                            :'👁';

                    b.setAttribute(
                        'aria-label',
                        show
                            ?'Hide password'
                            :'Show password'
                    );

                    b.title=
                        show
                            ?'Hide password'
                            :'Show password';

                }
            );

        });
}

function frame(
    session,
    page,
    body,
    title
) {

    const role = session.role;
    const admin = role === 'admin';

    /*
     * Student photo
     */
    const studentKey =
        session.student_id ||
        session.studentId ||
        session.username ||
        session.id;

    const savedStudentPhoto =
        !admin
            ? localStorage.getItem(
                `campuspay_student_photo_${studentKey}`
            )
            : null;

    const studentPhoto =
        savedStudentPhoto
            ? `
                <img
                    src="${savedStudentPhoto}"
                    alt="Student"
                >
            `
            : initials(
                session.name
            );

    document.body.className = 'app-page';

    document.body.innerHTML = `
        <div class="app-shell">

            <aside class="sidebar">

                <div class="brand side-brand">

                    <span class="brand-mark">
                        C
                    </span>

                    <span>
                        CampusPay
                    </span>

                </div>


                ${
                    admin
                        ? `
                            <div class="admin-profile">

                                <div
                                    class="admin-profile-top"
                                    onclick="openAdminPhoto()"
                                >

                                    <div class="avatar admin-avatar">

                                        <img
                                            src="../picture/AD.JPG"
                                            alt="Admin"
                                        >

                                    </div>

                                    <div class="admin-identity">

                                        <strong>
                                            ZakariaAD
                                        </strong>

                                        <small>
                                            Administrator
                                        </small>

                                    </div>

                                </div>

                            </div>
                        `
                        : `
                            <div class="student-profile">

                                <div class="user-mini">

                                    <div
                                        class="avatar student-nav-avatar"
                                    >
                                        ${studentPhoto}
                                    </div>

                                    <div>

                                        <strong>
                                            ${esc(
                                                session.name
                                            )}
                                        </strong>

                                        <small>
                                            Student
                                        </small>

                                    </div>

                                </div>

                            </div>
                        `
                }


                ${
                    admin
                        ? `

                            <nav class="admin-navigation">

                                <div class="admin-nav-group">

                                    <div class="admin-nav-title">
                                        Dashboard
                                    </div>

                                    <div class="admin-nav-items">

                                        <a
                                            class="nav-link ${
                                                page === 'overview'
                                                    ? 'active'
                                                    : ''
                                            }"
                                            href="${pageHref(
                                                role,
                                                'overview'
                                            )}"
                                        >
                                            <span>⌂</span>
                                            Dashboard
                                        </a>

                                        <a
                                            class="nav-link ${
                                                page === 'students'
                                                    ? 'active'
                                                    : ''
                                            }"
                                            href="${pageHref(
                                                role,
                                                'students'
                                            )}"
                                        >
                                            <span>♙</span>
                                            Students
                                        </a>

                                        <a
                                            class="nav-link ${
                                                page === 'payments'
                                                    ? 'active'
                                                    : ''
                                            }"
                                            href="${pageHref(
                                                role,
                                                'payments'
                                            )}"
                                        >
                                            <span>₿</span>
                                            Payments
                                        </a>

                                    </div>

                                </div>


                                <div class="admin-nav-group">

                                    <div class="admin-nav-title">
                                        Management
                                    </div>

                                    <div class="admin-nav-items">

                                        <a
                                            class="nav-link ${
                                                page === 'receipts'
                                                    ? 'active'
                                                    : ''
                                            }"
                                            href="${pageHref(
                                                role,
                                                'receipts'
                                            )}"
                                        >
                                            <span>▣</span>
                                            Receipts
                                        </a>

                                        <a
                                            class="nav-link ${
                                                page === 'complaints'
                                                    ? 'active'
                                                    : ''
                                            }"
                                            href="${pageHref(
                                                role,
                                                'complaints'
                                            )}"
                                        >
                                            <span>?</span>
                                            Support
                                        </a>

                                        <a
                                            class="nav-link ${
                                                page === 'notifications'
                                                    ? 'active'
                                                    : ''
                                            }"
                                            href="${pageHref(
                                                role,
                                                'notifications'
                                            )}"
                                        >
                                            <span>●</span>
                                            Notifications
                                        </a>

                                    </div>

                                </div>


                                <div class="admin-nav-group">

                                    <div class="admin-nav-title">
                                        Reports
                                    </div>

                                    <div class="admin-nav-items">

                                        <a
                                            class="nav-link ${
                                                page === 'reports'
                                                    ? 'active'
                                                    : ''
                                            }"
                                            href="${pageHref(
                                                role,
                                                'reports'
                                            )}"
                                        >
                                            <span>▤</span>
                                            Reports
                                        </a>

                                        <a
                                            class="nav-link ${
                                                page === 'audit'
                                                    ? 'active'
                                                    : ''
                                            }"
                                            href="${pageHref(
                                                role,
                                                'audit'
                                            )}"
                                        >
                                            <span>◷</span>
                                            Audit logs
                                        </a>

                                        <a
                                            class="nav-link ${
                                                page === 'settings'
                                                    ? 'active'
                                                    : ''
                                            }"
                                            href="${pageHref(
                                                role,
                                                'settings'
                                            )}"
                                        >
                                            <span>⚙</span>
                                            Settings
                                        </a>

                                    </div>

                                </div>

                            </nav>

                        `
                        : `

                            <nav class="admin-navigation">

                                <div class="admin-nav-group">

                                    <div class="admin-nav-title">
                                        Dashboard
                                    </div>

                                    <div class="admin-nav-items">

                                        <a
                                            class="nav-link ${
                                                page === 'overview'
                                                    ? 'active'
                                                    : ''
                                            }"
                                            href="${pageHref(
                                                role,
                                                'overview'
                                            )}"
                                        >
                                            <span>⌂</span>
                                            Dashboard
                                        </a>

                                        <a
                                            class="nav-link ${
                                                page === 'profile'
                                                    ? 'active'
                                                    : ''
                                            }"
                                            href="${pageHref(
                                                role,
                                                'profile'
                                            )}"
                                        >
                                            <span>♙</span>
                                            My profile
                                        </a>

                                    </div>

                                </div>


                                <div class="admin-nav-group">

                                    <div class="admin-nav-title">
                                        Payments & Support
                                    </div>

                                    <div class="admin-nav-items">

                                        <a
                                            class="nav-link ${
                                                page === 'payments'
                                                    ? 'active'
                                                    : ''
                                            }"
                                            href="${pageHref(
                                                role,
                                                'payments'
                                            )}"
                                        >
                                            <span>₿</span>
                                            My payments
                                        </a>

                                        <a
                                            class="nav-link ${
                                                page === 'receipts'
                                                    ? 'active'
                                                    : ''
                                            }"
                                            href="${pageHref(
                                                role,
                                                'receipts'
                                            )}"
                                        >
                                            <span>▣</span>
                                            Receipts
                                        </a>

                                        <a
                                            class="nav-link ${
                                                page === 'complaints'
                                                    ? 'active'
                                                    : ''
                                            }"
                                            href="${pageHref(
                                                role,
                                                'complaints'
                                            )}"
                                        >
                                            <span>?</span>
                                            Support
                                        </a>

                                    </div>

                                </div>


                                <div class="admin-nav-group">

                                    <div class="admin-nav-title">
                                        Account
                                    </div>

                                    <div class="admin-nav-items">

                                        <a
                                            class="nav-link ${
                                                page === 'notifications'
                                                    ? 'active'
                                                    : ''
                                            }"
                                            href="${pageHref(
                                                role,
                                                'notifications'
                                            )}"
                                        >
                                            <span>●</span>
                                            Notifications
                                        </a>

                                        <a
                                            class="nav-link ${
                                                page === 'settings'
                                                    ? 'active'
                                                    : ''
                                            }"
                                            href="${pageHref(
                                                role,
                                                'settings'
                                            )}"
                                        >
                                            <span>⚙</span>
                                            Account settings
                                        </a>

                                    </div>

                                </div>

                            </nav>

                        `
                }


                <div class="side-bottom">

                    <button
                        class="button ghost full"
                        id="logoutBtn"
                    >
                        Sign out
                    </button>

                </div>

            </aside>


            <main class="main">

                <header class="topbar">

                    <div>

                        <span class="eyebrow">

                            ${
                                admin
                                    ? 'ADMIN WORKSPACE'
                                    : 'STUDENT PORTAL'
                            }

                        </span>

                        <h1>
                            ${title}
                        </h1>

                    </div>


                    <div class="top-actions">

                        ${
                            admin && page === 'students'
                                ? `
                                    <button
                                        class="button primary"
                                        id="addStudentBtn"
                                    >
                                        + Add student
                                    </button>
                                `
                                : ''
                        }

                        ${
                            admin && page === 'payments'
                                ? `
                                    <button
                                        class="button primary"
                                        id="addPaymentBtn"
                                    >
                                        + Add payment
                                    </button>
                                `
                                : ''
                        }

                        ${
                            admin && page === 'notifications'
                                ? `
                                    <button
                                        class="button primary"
                                        id="addNotificationBtn"
                                    >
                                        + Notification
                                    </button>
                                `
                                : ''
                        }

                        ${
                            !admin && page === 'complaints'
                                ? `
                                    <button
                                        class="button primary"
                                        id="addComplaintBtn"
                                    >
                                        + New complaint
                                    </button>
                                `
                                : ''
                        }

                    </div>

                </header>


                <section class="content">

                    ${body}

                </section>

            </main>

        </div>


        <div
            id="toast"
            class="toast"
        ></div>
    `;

    $('#logoutBtn').onclick = logout;
}
function statsCard(
    label,
    value,
    note=''
) {

    return `
        <div class="stat-card">

            <span>
                ${label}
            </span>

            <strong>
                ${value}
            </strong>

            <small>
                ${note}
            </small>

        </div>
    `;
}

function empty(text) {

    return `
        <div class="empty">

            <div class="empty-icon">
                ○
            </div>

            <h3>
                ${text}
            </h3>

            <p>
                Add records from the appropriate section
                to see them here.
            </p>

        </div>
    `;
}

function dashboardView(s) {

    const admin =
        s.role === 'admin';

    if (admin) {

        const students =
            getStudents();

        const payments =
            getPayments();

        const settings =
            read(
                KEYS.settings,
                {}
            );

        const monthlyFee =
            Number(
                settings.monthlyFee
            ) || 2.50;

        const now =
            new Date();

        const currentMonth =
            `${now.getFullYear()}-${
                String(
                    now.getMonth() + 1
                ).padStart(2, '0')
            }`;

        const selectedMonth =
            window.__dashboardMonth ||
            currentMonth;

        const parts =
            selectedMonth
                .split('-')
                .map(Number);

        const selectedYear =
            parts[0];

        const selectedMonthNumber =
            parts[1];

        const validSelectedMonth =
            selectedYear &&
            selectedMonthNumber >= 1 &&
            selectedMonthNumber <= 12;

        const safeMonth =
            validSelectedMonth
                ? selectedMonth
                : currentMonth;

        const safeParts =
            safeMonth
                .split('-')
                .map(Number);

        const year =
            safeParts[0];

        const monthNumber =
            safeParts[1];

        window.__dashboardMonth =
            safeMonth;

        const selectedStart =
            new Date(
                year,
                monthNumber - 1,
                1
            );

        const selectedEnd =
            new Date(
                year,
                monthNumber,
                1
            );

        const previousStart =
            new Date(
                year,
                monthNumber - 2,
                1
            );

        const previousEnd =
            new Date(
                year,
                monthNumber - 1,
                1
            );

        const selectedStudents =
            students.filter(
                student => {

                    if (!student.createdAt) {
                        return true;
                    }

                    const created =
                        new Date(
                            student.createdAt
                        );

                    return (
                        !Number.isNaN(
                            created.getTime()
                        ) &&
                        created < selectedEnd
                    );
                }
            );

        const previousStudents =
            students.filter(
                student => {

                    if (!student.createdAt) {
                        return true;
                    }

                    const created =
                        new Date(
                            student.createdAt
                        );

                    return (
                        !Number.isNaN(
                            created.getTime()
                        ) &&
                        created < previousEnd
                    );
                }
            );

        const inRange = (
            payment,
            start,
            end
        ) => {

            if (
                payment.status !== 'Paid'
            ) {
                return false;
            }

            if (
                !payment.paymentDate
            ) {
                return false;
            }

            const d =
                new Date(
                    payment.paymentDate
                );

            return (
                !Number.isNaN(
                    d.getTime()
                ) &&
                d >= start &&
                d < end
            );
        };

        const selectedPaid =
            payments
                .filter(
                    p =>
                        inRange(
                            p,
                            selectedStart,
                            selectedEnd
                        )
                )
                .sort(
                    (a, b) =>
                        new Date(
                            b.paymentDate
                        ) -
                        new Date(
                            a.paymentDate
                        )
                );

        const previousPaid =
            payments.filter(
                p =>
                    inRange(
                        p,
                        previousStart,
                        previousEnd
                    )
            );

        const total =
            selectedPaid.reduce(
                (a, p) =>
                    a +
                    Number(
                        p.amount || 0
                    ),
                0
            );

        const previousTotal =
            previousPaid.reduce(
                (a, p) =>
                    a +
                    Number(
                        p.amount || 0
                    ),
                0
            );

        const target =
            selectedStudents.length *
            monthlyFee;

        const previousTarget =
            previousStudents.length *
            monthlyFee;

        const remaining =
            Math.max(
                target - total,
                0
            );

        const previousRemaining =
            Math.max(
                previousTarget -
                previousTotal,
                0
            );

        const selectedMonthName =
            selectedStart.toLocaleDateString(
                undefined,
                {
                    month: 'long',
                    year: 'numeric'
                }
            );

        const previousMonthName =
            previousStart.toLocaleDateString(
                undefined,
                {
                    month: 'long',
                    year: 'numeric'
                }
            );

        return `

            <div class="panel">

                <div class="panel-head">

                    <div>

                        <span class="eyebrow">
                            MONTHLY CLASS FEE
                        </span>

                        <h2>
                            ${esc(
                                selectedMonthName
                            )}
                        </h2>

                        <p>
                            View payments and student
                            fee information for the
                            selected month.
                        </p>

                    </div>

                    <div>

                        <label
                            style="
                                display:block;
                                margin:0;
                                font-weight:600;
                            "
                        >

                            Select month

                            <input
                                id="dashboardMonth"
                                type="month"
                                value="${esc(
                                    safeMonth
                                )}"
                                style="
                                    margin-top:6px;
                                    padding:10px 12px;
                                    border:1px solid #d8e2df;
                                    border-radius:10px;
                                    font:inherit;
                                "
                            >

                        </label>

                    </div>

                </div>

            </div>

            <div class="stats">

                ${statsCard(
                    'Students',
                    selectedStudents.length,
                    `Registered by ${
                        selectedMonthName
                    }`
                )}

                ${statsCard(
                    'Collected',
                    money(total),
                    `${
                        selectedPaid.length
                    } paid transaction${
                        selectedPaid.length === 1
                            ? ''
                            : 's'
                    }`
                )}

                ${statsCard(
                    'Remaining Money',
                    money(remaining),
                    'Amount still due'
                )}

                ${statsCard(
                    'Target Money',
                    money(target),
                    'Monthly class fee target'
                )}

            </div>

            <div class="panel">

                <div class="panel-head">

                    <div>

                        <h2>
                            Month comparison
                        </h2>

                        <p>
                            ${esc(
                                previousMonthName
                            )}
                            compared with
                            ${esc(
                                selectedMonthName
                            )}
                        </p>

                    </div>

                </div>

                <div class="table-wrap">

                    <table>

                        <thead>

                            <tr>

                                <th>
                                    Information
                                </th>

                                <th>
                                    ${esc(
                                        previousMonthName
                                    )}
                                </th>

                                <th>
                                    ${esc(
                                        selectedMonthName
                                    )}
                                </th>

                            </tr>

                        </thead>

                        <tbody>

                            <tr>

                                <td>
                                    Students
                                </td>

                                <td>
                                    ${previousStudents.length}
                                </td>

                                <td>
                                    ${selectedStudents.length}
                                </td>

                            </tr>

                            <tr>

                                <td>
                                    Target Money
                                </td>

                                <td>
                                    ${money(
                                        previousTarget
                                    )}
                                </td>

                                <td>
                                    ${money(
                                        target
                                    )}
                                </td>

                            </tr>

                            <tr>

                                <td>
                                    Collected
                                </td>

                                <td>
                                    ${money(
                                        previousTotal
                                    )}
                                </td>

                                <td>
                                    ${money(
                                        total
                                    )}
                                </td>

                            </tr>

                            <tr>

                                <td>
                                    Remaining Money
                                </td>

                                <td>
                                    ${money(
                                        previousRemaining
                                    )}
                                </td>

                                <td>
                                    ${money(
                                        remaining
                                    )}
                                </td>

                            </tr>

                        </tbody>

                    </table>

                </div>

            </div>

            <div class="panel">

                <div class="panel-head">

                    <div>

                        <h2>
                            Recent payments
                        </h2>

                        <p>
                            Payments from
                            ${esc(
                                selectedMonthName
                            )}.
                        </p>

                    </div>

                    <a
                        class="button ghost"
                        href="${pageHref(
                            'admin',
                            'payments'
                        )}"
                    >
                        View all
                    </a>

                </div>

                ${
                    selectedPaid.length
                        ? tablePayments(
                            selectedPaid.slice(
                                0,
                                6
                            ),
                            true
                        )
                        : empty(
                            `No paid payments in ${
                                selectedMonthName
                            }`
                        )
                }

            </div>

        `;
    }

    const st =
        getStudentById(
            s.studentId
        );

    const ps =
        getPayments().filter(
            p =>
                p.studentId ===
                s.studentId
        );

    const paid =
        ps
            .filter(
                p =>
                    p.status === 'Paid'
            )
            .reduce(
                (a, p) =>
                    a +
                    Number(
                        p.amount || 0
                    ),
                0
            );

    const cs =
        getComplaints().filter(
            c =>
                c.studentId ===
                s.studentId
        );

    const settings =
        read(
            KEYS.settings,
            {}
        );

    const monthlyFee =
        Number(
            settings.monthlyFee
        ) || 2.50;

    const now =
        new Date();

    const currentMonth =
        `${now.getFullYear()}-${
            String(
                now.getMonth() + 1
            ).padStart(2, '0')
        }`;

    const selectedMonth =
        window.__dashboardMonth ||
        currentMonth;

    const parts =
        selectedMonth
            .split('-')
            .map(Number);

    const selectedYear =
        parts[0];

    const selectedMonthNumber =
        parts[1];

    const validSelectedMonth =
        selectedYear &&
        selectedMonthNumber >= 1 &&
        selectedMonthNumber <= 12;

    const safeMonth =
        validSelectedMonth
            ? selectedMonth
            : currentMonth;

    const safeParts =
        safeMonth
            .split('-')
            .map(Number);

    const year =
        safeParts[0];

    const monthNumber =
        safeParts[1];

    window.__dashboardMonth =
        safeMonth;

    const selectedStart =
        new Date(
            year,
            monthNumber - 1,
            1
        );

    const selectedEnd =
        new Date(
            year,
            monthNumber,
            1
        );

    const previousStart =
        new Date(
            year,
            monthNumber - 2,
            1
        );

    const previousEnd =
        new Date(
            year,
            monthNumber - 1,
            1
        );

    const selectedPayments =
        ps.filter(
            p => {

                if (
                    p.status !== 'Paid'
                ) {
                    return false;
                }

                if (
                    !p.paymentDate
                ) {
                    return false;
                }

                const d =
                    new Date(
                        p.paymentDate
                    );

                return (
                    !Number.isNaN(
                        d.getTime()
                    ) &&
                    d >= selectedStart &&
                    d < selectedEnd
                );
            }
        );

    const previousPayments =
        ps.filter(
            p => {

                if (
                    p.status !== 'Paid'
                ) {
                    return false;
                }

                if (
                    !p.paymentDate
                ) {
                    return false;
                }

                const d =
                    new Date(
                        p.paymentDate
                    );

                return (
                    !Number.isNaN(
                        d.getTime()
                    ) &&
                    d >= previousStart &&
                    d < previousEnd
                );
            }
        );

    const selectedPaid =
        selectedPayments.reduce(
            (a, p) =>
                a +
                Number(
                    p.amount || 0
                ),
            0
        );

    const previousPaid =
        previousPayments.reduce(
            (a, p) =>
                a +
                Number(
                    p.amount || 0
                ),
            0
        );

    const amountRequired =
        monthlyFee;

    const previousRequired =
        monthlyFee;

    const remaining =
        Math.max(
            amountRequired -
            selectedPaid,
            0
        );

    const previousRemaining =
        Math.max(
            previousRequired -
            previousPaid,
            0
        );

    const selectedMonthName =
        selectedStart.toLocaleDateString(
            undefined,
            {
                month: 'long',
                year: 'numeric'
            }
        );

    const previousMonthName =
        previousStart.toLocaleDateString(
            undefined,
            {
                month: 'long',
                year: 'numeric'
            }
        );

    return `

        <div class="welcome panel">

            <div>

                <span class="eyebrow">
                    WELCOME
                </span>

                <h2>
                    ${esc(s.name)}
                </h2>

                <p>
                    Manage your account,
                    payments, receipts and
                    support requests.
                </p>

            </div>

            <div class="student-photo-box">

                <div
                    class="avatar large"
                    id="studentDashboardPhoto"
                >
                    ${initials(s.name)}
                </div>

                <label
                    class="button ghost student-photo-button"
                    for="studentPhotoInput"
                >
                    Change Photo
                </label>

                <input
                    id="studentPhotoInput"
                    type="file"
                    accept="image/*"
                    style="display:none;"
                >

            </div>

        </div>


        <div class="stats">

            ${statsCard(
                'Student ID',
                esc(
                    st?.id ||
                    s.studentId
                ),
                'Fixed account identifier'
            )}

            ${statsCard(
                'Amount Required',
                money(amountRequired),
                `Required for ${esc(
                    selectedMonthName
                )}`
            )}

            ${statsCard(
                'Paid total',
                money(selectedPaid),
                `Paid in ${esc(
                    selectedMonthName
                )}`
            )}

            ${statsCard(
                'Remaining',
                money(remaining),
                'Amount still due'
            )}

        </div>


        <div class="panel">

            <div class="panel-head">

                <div>

                    <h2>
                        Month comparison
                    </h2>

                    <p>
                        ${esc(
                            previousMonthName
                        )}
                        compared with
                        ${esc(
                            selectedMonthName
                        )}
                    </p>

                </div>

                <div>

                    <label
                        style="
                            display:block;
                            margin:0;
                            font-weight:600;
                        "
                    >

                        Select month

                        <input
                            id="dashboardMonth"
                            type="month"
                            value="${esc(
                                safeMonth
                            )}"
                            style="
                                margin-top:6px;
                                padding:10px 12px;
                                border:1px solid #d8e2df;
                                border-radius:10px;
                                font:inherit;
                            "
                        >

                    </label>

                </div>

            </div>

            <div class="table-wrap">

                <table>

                    <thead>

                        <tr>

                            <th>
                                Information
                            </th>

                            <th>
                                ${esc(
                                    previousMonthName
                                )}
                            </th>

                            <th>
                                ${esc(
                                    selectedMonthName
                                )}
                            </th>

                        </tr>

                    </thead>

                    <tbody>

                        <tr>

                            <td>
                                Amount Required
                            </td>

                            <td>
                                ${money(
                                    previousRequired
                                )}
                            </td>

                            <td>
                                ${money(
                                    amountRequired
                                )}
                            </td>

                        </tr>

                        <tr>

                            <td>
                                Paid total
                            </td>

                            <td>
                                ${money(
                                    previousPaid
                                )}
                            </td>

                            <td>
                                ${money(
                                    selectedPaid
                                )}
                            </td>

                        </tr>

                        <tr>

                            <td>
                                Remaining
                            </td>

                            <td>
                                ${money(
                                    previousRemaining
                                )}
                            </td>

                            <td>
                                ${money(
                                    remaining
                                )}
                            </td>

                        </tr>

                    </tbody>

                </table>

            </div>

        </div>


        <div class="panel security-banner">

            <strong>
                Account information
            </strong>

            <p>
                Your Student ID and username are controlled
                by the administrator. You can change your
                password from Account settings.
            </p>

        </div>


        <div
            class="panel"
            style="
                margin-top:20px;
                border-radius:18px;
                padding:22px;
                background:#e7f4ee;
                border:1px solid #cfe7dc;
            "
        >

            <div
                style="
                    display:flex;
                    align-items:center;
                    justify-content:space-between;
                    gap:20px;
                    flex-wrap:wrap;
                "
            >

                <div>

                    <span
                        class="eyebrow"
                        style="color:#176c58;"
                    >
                        STUDENT SUPPORT
                    </span>

                    <h3
                        style="
                            margin:6px 0 6px;
                            color:#102d32;
                        "
                    >
                        Need help or have a complaint?
                    </h3>

                    <p
                        style="
                            margin:0;
                            color:#5f706d;
                            line-height:1.5;
                        "
                    >
                        Contact us directly on WhatsApp
                        to submit your complaint or request support.
                    </p>

                </div>


                <a
                    href="https://wa.me/252770507180?text=${encodeURIComponent(
                        `Hello CampusPay Support,

I am ${s.name || 'a student'}.
Student ID: ${s.studentId || '—'}

I would like to submit a complaint/support request.

Thank you.`
                    )}"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="button primary"
                    style="
                        display:inline-flex;
                        align-items:center;
                        justify-content:center;
                        gap:10px;
                        min-width:180px;
                        background:#25D366;
                        border-color:#25D366;
                        color:#ffffff;
                        font-weight:700;
                        text-decoration:none;
                    "
                >

                    <span
                        style="
                            font-size:22px;
                            line-height:1;
                        "
                    >
                        ☎
                    </span>

                    WhatsApp Support

                </a>

            </div>

        </div>

    `;
}

function studentMini(list) {

    return `
        <div class="mini-list">

            ${list.map(s=>`

                <div class="mini-row">

                    <div class="avatar">
                        ${initials(s.fullName)}
                    </div>

                    <div>

                        <strong>
                            ${esc(s.fullName)}
                        </strong>

                        <small>
                            ${esc(s.id)}
                            ·
                            ${esc(
                                s.course||
                                'No course'
                            )}
                        </small>

                    </div>

                </div>

            `).join('')}

        </div>
    `;
}

function tablePayments(
    list,
    admin
) {

    return `
        <div class="table-wrap">

            <table>

                <thead>

                    <tr>

                        <th>
                            Date
                        </th>

                        <th>
                            Student
                        </th>

                        <th>
                            Reference
                        </th>

                        <th>
                            Amount
                        </th>

                        <th>
                            Status
                        </th>

                        ${
                            admin
                                ?'<th>Action</th>'
                                :''
                        }

                    </tr>

                </thead>

                <tbody>

                    ${list.map(p=>{

                        const s=
                            getStudentById(
                                p.studentId
                            );

                        return `

                            <tr>

                                <td>
                                    ${date(
                                        p.paymentDate
                                    )}
                                </td>

                                <td>
                                    ${esc(
                                        s?.fullName||
                                        p.studentId
                                    )}
                                </td>

                                <td>
                                    ${esc(
                                        p.reference||
                                        p.id
                                    )}
                                </td>

                                <td>
                                    ${money(
                                        p.amount
                                    )}
                                </td>

                                <td>

                                    <span
                                        class="status ${String(
                                            p.status
                                        ).toLowerCase()}"
                                    >
                                        ${esc(
                                            p.status
                                        )}
                                    </span>

                                </td>

                                ${
                                    admin
                                        ?`
                                            <td>

                                                <button
                                                    class="link-btn"
                                                    data-edit-payment="${p.id}"
                                                >
                                                    Edit
                                                </button>

                                            </td>
                                        `
                                        :''
                                }

                            </tr>

                        `;

                    }).join('')}

                </tbody>

            </table>

        </div>
    `;
}

function studentsView() {

    const list=getStudents();

    return `

        <div class="toolbar">

            <input
                id="studentSearch"
                placeholder="Search by name, ID or username"
            >

            <span class="muted">

                ${list.length}

                student account${
                    list.length===1
                        ?''
                        :'s'
                }

            </span>

        </div>

        <div id="studentTable">
            ${renderStudentTable(list)}
        </div>

    `;
}

function renderStudentTable(list) {

    if(!list.length) {

        return empty(
            'No student accounts yet'
        );

    }

    return `

        <div class="panel">

            <div class="table-wrap">

                <table>

                    <thead>

                        <tr>

                            <th>
                                Student
                            </th>

                            <th>
                                Student ID
                            </th>

                            <th>
                                Username
                            </th>

                            <th>
                                Course
                            </th>

                            <th>
                                Phone
                            </th>

                            <th>
                                Actions
                            </th>

                        </tr>

                    </thead>

                    <tbody>

                        ${list.map(s=>`

                            <tr>

                                <td>

                                    <div class="person">

                                        <div class="avatar">
                                            ${initials(
                                                s.fullName
                                            )}
                                        </div>

                                        <div>

                                            <strong>
                                                ${esc(
                                                    s.fullName
                                                )}
                                            </strong>

                                            <small>
                                                ${esc(
                                                    s.email||
                                                    'No email'
                                                )}
                                            </small>

                                        </div>

                                    </div>

                                </td>

                                <td>
                                    ${esc(s.id)}
                                </td>

                                <td>
                                    ${esc(
                                        s.username
                                    )}
                                </td>

                                <td>
                                    ${esc(
                                        s.course||
                                        '—'
                                    )}
                                </td>

                                <td>
                                    ${esc(
                                        s.phone||
                                        '—'
                                    )}
                                </td>

                                <td class="actions">

                                    <button
                                        class="link-btn"
                                        data-view-student="${s.id}"
                                    >
                                        View
                                    </button>

                                    <button
                                        class="link-btn"
                                        data-edit-student="${s.id}"
                                    >
                                        Edit
                                    </button>

                                    <button
                                        class="link-btn"
                                        data-reset-password="${s.id}"
                                    >
                                        Reset password
                                    </button>

                                    <button
                                        class="danger-link"
                                        data-delete-student="${s.id}"
                                    >
                                        Delete
                                    </button>

                                </td>

                            </tr>

                        `).join('')}

                    </tbody>

                </table>

            </div>

        </div>

    `;
}

function openStudentForm(old) {

    const content=`

        <div class="form-grid">

            ${field(
                'id',
                'Student ID',
                old?.id||''
            )}

            ${field(
                'username',
                'Username',
                old?.username||''
            )}

            ${field(
                'fullName',
                'Full name',
                old?.fullName||''
            )}

            <label>

                Gender

                <select
                    name="gender"
                >

                    <option
                        value=""
                        ${
                            !old?.gender
                                ?'selected'
                                :''
                        }
                    >
                        Select gender
                    </option>

                    <option
                        value="Male"
                        ${
                            old?.gender==='Male'
                                ?'selected'
                                :''
                        }
                    >
                        Male
                    </option>

                    <option
                        value="Female"
                        ${
                            old?.gender==='Female'
                                ?'selected'
                                :''
                        }
                    >
                        Female
                    </option>

                </select>

            </label>

            ${field(
                'email',
                'Email',
                old?.email||'',
                'email',
                false
            )}

            ${field(
                'phone',
                'Phone',
                old?.phone||'',
                'tel',
                false
            )}

            ${field(
                'course',
                'Course',
                old?.course||'',
                'text',
                false
            )}

            ${field(
                'className',
                'Class / year',
                old?.className||'',
                'text',
                false
            )}

            ${field(
                'password',
                'Password',
                '',
                'password',
                !old,
                'placeholder="Enter a new password only if you want to set/change it"'
            )}

        </div>

        <div class="modal-error"></div>
    `;

    modal(
        old
            ?'Edit student account'
            :'Create student account',

        content,

        async f=>{

            const v=
                Object.fromEntries(
                    f.entries()
                );

            /*
             * Student ID is required.
             * It can contain letters and numbers.
             */

            if(
                !v.id.trim()
            ) {

                throw Error(
                    'Student ID is required.'
                );

            }

            if(
                !/^[A-Za-z0-9]+$/.test(
                    v.id.trim()
                )
            ) {

                throw Error(
                    'Student ID can contain letters and numbers only.'
                );

            }

            /*
             * Username is required.
             * It can contain letters and numbers.
             */

            if(
                !v.username.trim()
            ) {

                throw Error(
                    'Username is required.'
                );

            }

            if(
                !/^[A-Za-z0-9]+$/.test(
                    v.username.trim()
                )
            ) {

                throw Error(
                    'Username can contain letters and numbers only.'
                );

            }

            if(
                !v.fullName.trim()
            ) {

                throw Error(
                    'Full name is required.'
                );

            }

            if(
                !old &&
                v.password.length<6
            ) {

                throw Error(
                    'Password must contain at least 6 characters.'
                );

            }

            if(
                old&&
                !v.password
            ) {

                delete v.password;

            }

            /*
             * Email and phone are optional.
             */

            v.email=
                v.email?.trim()||'';

            v.phone=
                v.phone?.trim()||'';

            v.course=
                v.course?.trim()||'';

            v.className=
                v.className?.trim()||'';

            v.gender=
                v.gender?.trim()||'';

            v.id=
                v.id.trim();

            v.username=
                v.username.trim();

            v.fullName=
                v.fullName.trim();

            await(
                old
                    ?updateStudent(
                        old.id,
                        v
                    )
                    :addStudent(v)
            );

            toast(
                old
                    ?'Student account updated'
                    :'Student account created'
            );

            renderPage();

        }
    );
}

function openResetPassword(s) {

    const content=`

        ${field(
            'password',
            'New password',
            '',
            'password',
            true,
            'minlength="6"'
        )}

        ${field(
            'confirm',
            'Confirm password',
            '',
            'password',
            true,
            'minlength="6"'
        )}

        <div class="modal-error"></div>
    `;

    modal(
        `Reset password — ${
            esc(s.fullName)
        }`,

        content,

        async f=>{

            const v=
                Object.fromEntries(
                    f.entries()
                );

            if(
                v.password!==v.confirm
            ) {

                throw Error(
                    'Passwords do not match.'
                );

            }

            await resetStudentPassword(
                s.id,
                v.password
            );

            toast(
                'Password reset successfully. Give the new password to the student.'
            );

            renderPage();

        },

        'Reset password'
    );
}

function viewStudent(s) {

    const ps=
        getPayments().filter(
            p=>
                p.studentId===
                s.id
        );

    const cs=
        getComplaints().filter(
            c=>
                c.studentId===
                s.id
        );

    modal(
        `Student account — ${
            esc(s.fullName)
        }`,

        `

            <div class="profile-grid">

                <div>
                    <span>
                        Student ID
                    </span>

                    <strong>
                        ${esc(s.id)}
                    </strong>
                </div>

                <div>
                    <span>
                        Username
                    </span>

                    <strong>
                        ${esc(
                            s.username
                        )}
                    </strong>
                </div>

                <div>
                    <span>
                        Gender
                    </span>

                    <strong>
                        ${esc(
                            s.gender||
                            '—'
                        )}
                    </strong>
                </div>

                <div>
                    <span>
                        Password
                    </span>

                    <strong>
                        Hidden
                    </strong>
                </div>

                <div>
                    <span>
                        Email
                    </span>

                    <strong>
                        ${esc(
                            s.email||
                            '—'
                        )}
                    </strong>
                </div>

                <div>
                    <span>
                        Phone
                    </span>

                    <strong>
                        ${esc(
                            s.phone||
                            '—'
                        )}
                    </strong>
                </div>

                <div>
                    <span>
                        Course
                    </span>

                    <strong>
                        ${esc(
                            s.course||
                            '—'
                        )}
                    </strong>
                </div>

                <div>
                    <span>
                        Class / year
                    </span>

                    <strong>
                        ${esc(
                            s.className||
                            '—'
                        )}
                    </strong>
                </div>

                <div>
                    <span>
                        Payments
                    </span>

                    <strong>
                        ${ps.length}
                    </strong>
                </div>

                <div>
                    <span>
                        Support requests
                    </span>

                    <strong>
                        ${cs.length}
                    </strong>
                </div>

            </div>

            <p class="muted">
                For security, an existing password is never displayed.
                Use Reset password when a student needs a new one.
            </p>

            <div class="modal-error"></div>

        `,

        ()=>{},

        'Close'
    );
}

function paymentsView(s) {

    const admin=s.role==='admin';

    const list=admin
        ?getPayments()
        :getPayments().filter(
            p=>
                p.studentId===
                s.studentId
        );

    return `

        ${
            admin
                ?`
                    <div class="toolbar">

                        <input
                            id="paymentSearch"
                            placeholder="Search student or reference"
                        >

                        <span class="muted">
                            ${list.length}
                            payment records
                        </span>

                    </div>
                `
                :''
        }

        <div class="panel">

            ${
                list.length
                    ?tablePayments(
                        list,
                        admin
                    )
                    :empty(
                        'No payment records yet'
                    )
            }

        </div>

    `;
}

function openPaymentForm(old) {

    const students=
        getStudents();

    if(!students.length) {

        toast(
            'Create a student account first.',
            'error'
        );

        return;
    }

    const content=`

        <div class="form-grid">

            <label>

                Student

                <select
                    name="studentId"
                    required
                >

                    ${students.map(s=>`

                        <option
                            value="${esc(s.id)}"
                            ${
                                old?.studentId===s.id
                                    ?'selected'
                                    :''
                            }
                        >
                            ${esc(
                                s.fullName
                            )}
                            —
                            ${esc(s.id)}
                        </option>

                    `).join('')}

                </select>

            </label>

            ${field(
                'amount',
                'Amount',
                old?.amount||'',
                'number',
                true,
                'min="0" step="0.01"'
            )}

            ${field(
                'reference',
                'Payment reference',
                old?.reference||''
            )}

            ${field(
                'paymentDate',
                'Payment date',
                old?.paymentDate
                    ?new Date(
                        old.paymentDate
                    )
                    .toISOString()
                    .slice(0,16)
                    :new Date()
                        .toISOString()
                        .slice(0,16),
                'datetime-local'
            )}

            ${field(
                'method',
                'Payment method',
                old?.method||
                'Cash',
                'text',
                true
            )}

            <label>

                Status

                <select
                    name="status"
                >

                    <option
                        ${
                            old?.status==='Paid'
                                ?'selected'
                                :''
                        }
                    >
                        Paid
                    </option>

                    <option
                        ${
                            old?.status==='Pending'
                                ?'selected'
                                :''
                        }
                    >
                        Pending
                    </option>

                    <option
                        ${
                            old?.status==='Overdue'
                                ?'selected'
                                :''
                        }
                    >
                        Overdue
                    </option>

                </select>

            </label>

            <label>

                Description

                <textarea
                    name="description"
                >${esc(
                    old?.description||
                    ''
                )}</textarea>

            </label>

        </div>

        <div class="modal-error"></div>
    `;

    modal(
        old
            ?'Edit payment'
            :'Record payment',

        content,

        async f=>{

            const v=
                Object.fromEntries(
                    f.entries()
                );

            await(
                old
                    ?updatePayment(
                        old.id,
                        v
                    )
                    :addPayment(v)
            );

            toast(
                old
                    ?'Payment updated'
                    :'Payment recorded'
            );

            renderPage();

        }
    );
}

function complaintsView(s) {

    const admin=
        s.role==='admin';

    const list=admin
        ?getComplaints()
        :getComplaints().filter(
            c=>
                c.studentId===
                s.studentId
        );

    if(!list.length) {

        return empty(
            admin
                ?'No support requests yet'
                :'You have no support requests yet'
        );

    }

    return `

        <div class="panel">

            <div class="table-wrap">

                <table>

                    <thead>

                        <tr>

                            <th>
                                Date
                            </th>

                            <th>
                                Student
                            </th>

                            <th>
                                Subject
                            </th>

                            <th>
                                Status
                            </th>

                            <th>
                                Message
                            </th>

                            ${
                                admin
                                    ?'<th>Action</th>'
                                    :''
                            }

                        </tr>

                    </thead>

                    <tbody>

                        ${list.map(c=>`

                            <tr>

                                <td>
                                    ${date(c.date)}
                                </td>

                                <td>
                                    ${esc(
                                        getStudentById(
                                            c.studentId
                                        )?.fullName||
                                        c.studentId
                                    )}
                                </td>

                                <td>
                                    ${esc(
                                        c.subject
                                    )}
                                </td>

                                <td>

                                    <span
                                        class="status ${String(
                                            c.status
                                        ).toLowerCase()}"
                                    >
                                        ${esc(
                                            c.status
                                        )}
                                    </span>

                                </td>

                                <td>
                                    ${esc(
                                        c.message
                                    )}
                                </td>

                                ${
                                    admin
                                        ?`
                                            <td>

                                                <button
                                                    class="link-btn"
                                                    data-resolve-complaint="${c.id}"
                                                >
                                                    Change status
                                                </button>

                                            </td>
                                        `
                                        :''
                                }

                            </tr>

                        `).join('')}

                    </tbody>

                </table>

            </div>

        </div>

    `;
}

function openComplaintForm(s) {

    const content=`

        ${field(
            'subject',
            'Subject',
            '',
            'text',
            true
        )}

        <label>

            Message

            <textarea
                name="message"
                required
                placeholder="Describe your issue..."
            ></textarea>

        </label>

        <div class="modal-error"></div>

    `;

    modal(
        'New support request',

        content,

        async f=>{

            const v=
                Object.fromEntries(
                    f.entries()
                );

            await addComplaint({
                ...v,
                studentId:
                    s.studentId
            });

            toast(
                'Support request submitted'
            );

            renderPage();

        },

        'Submit request'
    );
}

function notificationsView(s) {

    const list=
        getNotifications().filter(
            n=>
                n.target==='all'||
                n.target===s.studentId||
                s.role==='admin'
        );

    if(!list.length) {

        return empty(
            'No notifications yet'
        );

    }

    return `

        <div class="notice-list">

            ${list.map(n=>`

                <article class="notice">

                    <div class="notice-dot"></div>

                    <div>

                        <h3>
                            ${esc(n.title)}
                        </h3>

                        <p>
                            ${esc(n.message)}
                        </p>

                        <small>
                            ${date(n.createdAt)}
                        </small>

                    </div>

                </article>

            `).join('')}

        </div>

    `;
}

function openNotificationForm() {

    const students=
        getStudents();

    const content=`

        ${field(
            'title',
            'Title',
            '',
            'text',
            true
        )}

        <label>

            Message

            <textarea
                name="message"
                required
            ></textarea>

        </label>

        <label>

            Send to

            <select
                name="target"
            >

                <option value="all">
                    All students
                </option>

                ${students.map(s=>`

                    <option
                        value="${esc(s.id)}"
                    >
                        ${esc(
                            s.fullName
                        )}
                        —
                        ${esc(s.id)}
                    </option>

                `).join('')}

            </select>

        </label>

        <div class="modal-error"></div>

    `;

    modal(
        'Create notification',

        content,

        async f=>{

            await addNotification(
                Object.fromEntries(
                    f.entries()
                )
            );

            toast(
                'Notification created'
            );

            renderPage();

        },

        'Publish'
    );
}

function receiptsView(s) {

    const list=
        s.role==='admin'
            ?getReceipts()
            :getReceipts().filter(
                r=>
                    r.studentId===
                    s.studentId
            );

    if(!list.length) {

        return empty(
            'No receipts yet'
        );

    }

    return `

        <div class="panel">

            <div class="table-wrap">

                <table>

                    <thead>

                        <tr>

                            <th>
                                Receipt
                            </th>

                            <th>
                                Payment
                            </th>

                            <th>
                                Student
                            </th>

                            <th>
                                Created
                            </th>

                            <th>
                                Action
                            </th>

                        </tr>

                    </thead>

                    <tbody>

                        ${list.map(r=>{

                            const p=
                                getPayments()
                                .find(
                                    x=>
                                        x.id===
                                        r.paymentId
                                );

                            return `

                                <tr>

                                    <td>
                                        ${esc(
                                            r.number
                                        )}
                                    </td>

                                    <td>
                                        ${money(
                                            p?.amount
                                        )}
                                    </td>

                                    <td>
                                        ${esc(
                                            getStudentById(
                                                r.studentId
                                            )?.fullName||
                                            r.studentId
                                        )}
                                    </td>

                                    <td>
                                        ${date(
                                            r.createdAt
                                        )}
                                    </td>

                                    <td>

                                        <button
                                            class="link-btn"
                                            data-print-receipt="${r.id}"
                                        >
                                            Print
                                        </button>

                                    </td>

                                </tr>

                            `;

                        }).join('')}

                    </tbody>

                </table>

            </div>

        </div>

    `;
}

function printReceipt(r) {

    const p=
        getPayments().find(
            x=>
                x.id===
                r.paymentId
        );

    const s=
        getStudentById(
            r.studentId
        );

    const w=
        window.open(
            '',
            '_blank',
            'width=700,height=700'
        );

    w.document.write(`

        <html>

            <head>

                <title>
                    ${esc(r.number)}
                </title>

                <style>

                    body{
                        font-family:Arial;
                        padding:40px;
                    }

                    h1{
                        margin-bottom:4px;
                    }

                    .box{
                        border:1px solid #ddd;
                        padding:24px;
                        border-radius:12px;
                    }

                    p{
                        margin:10px 0;
                    }

                </style>

            </head>

            <body>

                <h1>
                    CampusPay
                </h1>

                <p>
                    Payment Receipt
                </p>

                <div class="box">

                    <p>
                        <b>Receipt:</b>
                        ${esc(r.number)}
                    </p>

                    <p>
                        <b>Student:</b>
                        ${esc(
                            s?.fullName||
                            r.studentId
                        )}
                    </p>

                    <p>
                        <b>Student ID:</b>
                        ${esc(
                            r.studentId
                        )}
                    </p>

                    <p>
                        <b>Amount:</b>
                        ${money(
                            p?.amount
                        )}
                    </p>

                    <p>
                        <b>Reference:</b>
                        ${esc(
                            p?.reference||
                            '—'
                        )}
                    </p>

                    <p>
                        <b>Date:</b>
                        ${date(
                            p?.paymentDate
                        )}
                    </p>

                    <p>
                        <b>Method:</b>
                        ${esc(
                            p?.method||
                            '—'
                        )}
                    </p>

                </div>

                <script>
                    window.print()
                <\/script>

            </body>

        </html>

    `);

    w.document.close();
}

function profileView(s) {

    const st =
        getStudentById(
            s.studentId
        );

    const studentKey =
        s.student_id ||
        s.studentId ||
        s.username ||
        s.id;

    const savedStudentPhoto =
        localStorage.getItem(
            `campuspay_student_photo_${studentKey}`
        );

    const profilePhoto =
        savedStudentPhoto
            ? `
                <img
                    src="${savedStudentPhoto}"
                    alt="Student profile"
                >
            `
            : initials(
                st?.fullName ||
                s.name
            );

    return `

        <div class="panel">

            <div class="profile-header">

                <div
                    class="avatar large student-profile-photo"
                >
                    ${profilePhoto}
                </div>

                <div>

                    <span class="eyebrow">
                        STUDENT PROFILE
                    </span>

                    <h2>
                        ${esc(
                            st?.fullName ||
                            s.name ||
                            '—'
                        )}
                    </h2>

                    <p class="muted">
                        Student account information
                    </p>

                </div>

            </div>


            <div class="profile-grid">

                <div>

                    <span>
                        Full Name
                    </span>

                    <strong>
                        ${esc(
                            st?.fullName ||
                            s.name ||
                            '—'
                        )}
                    </strong>

                </div>


                <div>

                    <span>
                        Student ID
                    </span>

                    <strong>
                        ${esc(
                            st?.id ||
                            s.studentId ||
                            '—'
                        )}
                    </strong>

                </div>


                <div>

                    <span>
                        Username
                    </span>

                    <strong>
                        ${esc(
                            st?.username ||
                            '—'
                        )}
                    </strong>

                </div>


                <div>

                    <span>
                        Email
                    </span>

                    <strong>
                        ${esc(
                            st?.email ||
                            '—'
                        )}
                    </strong>

                </div>


                <div>

                    <span>
                        Phone
                    </span>

                    <strong>
                        ${esc(
                            st?.phone ||
                            '—'
                        )}
                    </strong>

                </div>


                <div>

                    <span>
                        Course / Class
                    </span>

                    <strong>
                        ${esc(
                            st?.course ||
                            st?.className ||
                            '—'
                        )}
                    </strong>

                </div>


                <div>

                    <span>
                        Gender
                    </span>

                    <strong>
                        ${esc(
                            st?.gender ||
                            '—'
                        )}
                    </strong>

                </div>

            </div>

        </div>

    `;
}

function reportsView() {

    const ps=
        getPayments();

    const paid=
        ps.filter(
            p=>
                p.status==='Paid'
        );

    const pending=
        ps.filter(
            p=>
                p.status==='Pending'
        );

    const overdue=
        ps.filter(
            p=>
                p.status==='Overdue'
        );

    return `

        <div class="stats">

            ${statsCard(
                'Total collected',
                money(
                    paid.reduce(
                        (a,p)=>
                            a+
                            Number(
                                p.amount||0
                            ),
                        0
                    )
                ),
                'Paid payments'
            )}

            ${statsCard(
                'Paid',
                paid.length,
                'Transactions'
            )}

            ${statsCard(
                'Pending',
                pending.length,
                'Transactions'
            )}

            ${statsCard(
                'Overdue',
                overdue.length,
                'Transactions'
            )}

        </div>

        <div class="panel">

            <div class="panel-head">

                <div>

                    <h2>
                        Payment summary
                    </h2>

                    <p>
                        Current records stored
                        in the connected database.
                    </p>

                </div>

            </div>

            ${
                ps.length
                    ?tablePayments(
                        ps,
                        true
                    )
                    :empty(
                        'No payments yet'
                    )
            }

        </div>

    `;
}

function auditView() {

    const list=
        read(
            KEYS.audit,
            []
        );

    return `

        <div class="panel">

            <div class="table-wrap">

                <table>

                    <thead>

                        <tr>

                            <th>
                                Date
                            </th>

                            <th>
                                Actor
                            </th>

                            <th>
                                Action
                            </th>

                        </tr>

                    </thead>

                    <tbody>

                        ${
                            list.length
                                ?list.map(x=>`

                                    <tr>

                                        <td>
                                            ${date(
                                                x.createdAt
                                            )}
                                        </td>

                                        <td>
                                            ${esc(
                                                x.actor
                                            )}
                                        </td>

                                        <td>
                                            ${esc(
                                                x.action
                                            )}
                                        </td>

                                    </tr>

                                `).join('')

                                :`

                                    <tr>

                                        <td colspan="3">
                                            No audit records yet.
                                        </td>

                                    </tr>

                                `
                        }

                    </tbody>

                </table>

            </div>

        </div>

    `;
}

function settingsView(s) {

    if (
        s.role === 'student'
    ) {

        const set =
            read(
                KEYS.settings,
                {}
            );

        const student =
            getStudentById(
                s.studentId
            );

        const username =
            student?.username ||
            s.username ||
            '—';

        const monthlyFee =
            Number(
                set.monthlyFee
            ) || 2.50;

        const yearlyFee =
            Number(
                set.yearlyFee
            ) ||
            (
                monthlyFee * 12
            );

        const weeklyFee =
            monthlyFee / 4;

        return `

            <div
                style="
                    display:grid;
                    grid-template-columns:
                        repeat(2,minmax(0,1fr));
                    gap:24px;
                    align-items:stretch;
                "
            >

                <!-- ACCOUNT SETTINGS -->

                <div
                    class="panel"
                    style="
                        border-radius:18px;
                        padding:28px;
                        box-shadow:
                            0 10px 30px
                            rgba(16,45,50,.08);
                    "
                >

                    <div
                        style="
                            margin-bottom:24px;
                        "
                    >

                        <span
                            class="eyebrow"
                        >
                            ACCOUNT
                        </span>

                        <h2
                            style="
                                margin:6px 0 8px;
                                font-size:24px;
                                font-weight:700;
                            "
                        >
                            Account settings
                        </h2>

                        <p
                            class="muted"
                            style="
                                margin:0;
                                line-height:1.6;
                            "
                        >
                            Your account details are controlled
                            by the administrator.
                        </p>

                    </div>


                    <!-- USERNAME -->

                    <div
                        style="
                            padding:18px;
                            margin-bottom:16px;
                            border:1px solid #e3ebe8;
                            border-radius:14px;
                            background:#f8fbfa;
                        "
                    >

                        <div
                            style="
                                display:flex;
                                justify-content:space-between;
                                align-items:center;
                                gap:15px;
                            "
                        >

                            <div>

                                <span
                                    style="
                                        display:block;
                                        font-size:13px;
                                        font-weight:600;
                                        color:#71817e;
                                        margin-bottom:6px;
                                    "
                                >
                                    Username
                                </span>

                                <strong
                                    style="
                                        display:block;
                                        font-size:18px;
                                        color:#102d32;
                                        letter-spacing:.2px;
                                    "
                                >
                                    ${esc(
                                        username
                                    )}
                                </strong>

                            </div>

                            <span
                                style="
                                    font-size:12px;
                                    font-weight:600;
                                    color:#176c58;
                                    white-space:nowrap;
                                "
                            >
                                Admin only
                            </span>

                        </div>

                    </div>


                    <!-- PASSWORD -->

                    <div
                        style="
                            padding:18px;
                            border:1px solid #e3ebe8;
                            border-radius:14px;
                            background:#f8fbfa;
                        "
                    >

                        <div
                            style="
                                display:flex;
                                justify-content:space-between;
                                align-items:flex-start;
                                gap:15px;
                            "
                        >

                            <div>

                                <span
                                    style="
                                        display:block;
                                        font-size:13px;
                                        font-weight:600;
                                        color:#71817e;
                                        margin-bottom:7px;
                                    "
                                >
                                    Password
                                </span>

                                <strong
                                    style="
                                        display:block;
                                        font-size:20px;
                                        letter-spacing:4px;
                                        color:#102d32;
                                        margin-bottom:8px;
                                    "
                                >
                                    ••••••••
                                </strong>

                                <span
                                    class="muted"
                                    style="
                                        display:block;
                                        font-size:13px;
                                        line-height:1.5;
                                    "
                                >
                                    Only admin can change
                                    or manage your password.
                                </span>

                            </div>

                            <span
                                style="
                                    font-size:12px;
                                    font-weight:600;
                                    color:#176c58;
                                    white-space:nowrap;
                                "
                            >
                                Admin only
                            </span>

                        </div>

                    </div>


                    <!-- ADMIN CONTROL MESSAGE -->

                    <div
                        style="
                            margin-top:18px;
                            padding:14px 16px;
                            border-radius:12px;
                            background:#e7f4ee;
                            color:#176c58;
                            font-size:13px;
                            line-height:1.5;
                            font-weight:500;
                        "
                    >
                        Account settings are controlled
                        by the administrator and cannot
                        be changed by students.
                    </div>

                </div>


                <!-- FEE INFORMATION -->

                <div
                    class="panel"
                    style="
                        border-radius:18px;
                        padding:28px;
                        box-shadow:
                            0 10px 30px
                            rgba(16,45,50,.08);
                    "
                >

                    <div
                        style="
                            margin-bottom:24px;
                        "
                    >

                        <span
                            class="eyebrow"
                        >
                            FEES
                        </span>

                        <h2
                            style="
                                margin:6px 0 8px;
                                font-size:24px;
                                font-weight:700;
                            "
                        >
                            Fee information
                        </h2>

                        <p
                            class="muted"
                            style="
                                margin:0;
                                line-height:1.6;
                            "
                        >
                            Your current fees are shown below.
                        </p>

                    </div>


                    <!-- WEEKLY -->

                    <div
                        style="
                            padding:18px;
                            margin-bottom:14px;
                            border:1px solid #e3ebe8;
                            border-radius:14px;
                            background:#f8fbfa;
                            display:flex;
                            justify-content:space-between;
                            align-items:center;
                            gap:15px;
                        "
                    >

                        <div>

                            <span
                                style="
                                    display:block;
                                    font-size:13px;
                                    font-weight:600;
                                    color:#71817e;
                                    margin-bottom:6px;
                                "
                            >
                                Weekly Fee
                            </span>

                            <strong
                                style="
                                    font-size:20px;
                                    color:#102d32;
                                "
                            >
                                ${money(
                                    weeklyFee
                                )}
                            </strong>

                        </div>

                        <span
                            style="
                                font-size:12px;
                                font-weight:600;
                                color:#176c58;
                            "
                        >
                            Read only
                        </span>

                    </div>


                    <!-- MONTHLY -->

                    <div
                        style="
                            padding:18px;
                            margin-bottom:14px;
                            border:1px solid #e3ebe8;
                            border-radius:14px;
                            background:#f8fbfa;
                            display:flex;
                            justify-content:space-between;
                            align-items:center;
                            gap:15px;
                        "
                    >

                        <div>

                            <span
                                style="
                                    display:block;
                                    font-size:13px;
                                    font-weight:600;
                                    color:#71817e;
                                    margin-bottom:6px;
                                "
                            >
                                Monthly Fee
                            </span>

                            <strong
                                style="
                                    font-size:20px;
                                    color:#102d32;
                                "
                            >
                                ${money(
                                    monthlyFee
                                )}
                            </strong>

                        </div>

                        <span
                            style="
                                font-size:12px;
                                font-weight:600;
                                color:#176c58;
                            "
                        >
                            Read only
                        </span>

                    </div>


                    <!-- YEARLY -->

                    <div
                        style="
                            padding:18px;
                            margin-bottom:20px;
                            border:1px solid #e3ebe8;
                            border-radius:14px;
                            background:#f8fbfa;
                            display:flex;
                            justify-content:space-between;
                            align-items:center;
                            gap:15px;
                        "
                    >

                        <div>

                            <span
                                style="
                                    display:block;
                                    font-size:13px;
                                    font-weight:600;
                                    color:#71817e;
                                    margin-bottom:6px;
                                "
                            >
                                Yearly Fee
                            </span>

                            <strong
                                style="
                                    font-size:20px;
                                    color:#102d32;
                                "
                            >
                                ${money(
                                    yearlyFee
                                )}
                            </strong>

                        </div>

                        <span
                            style="
                                font-size:12px;
                                font-weight:600;
                                color:#176c58;
                            "
                        >
                            Read only
                        </span>

                    </div>


                    <div
                        style="
                            padding:14px 16px;
                            border-radius:12px;
                            background:#e7f4ee;
                            color:#176c58;
                            font-size:13px;
                            line-height:1.5;
                            font-weight:500;
                        "
                    >
                        Fees are controlled by the
                        administrator and cannot be
                        changed by students.
                    </div>

                </div>

            </div>

            <style>

                @media (max-width: 800px) {

                    [style*="grid-template-columns:repeat(2,minmax(0,1fr))"] {
                        grid-template-columns:1fr !important;
                    }

                }

            </style>

        `;
    }


    const set =
        read(
            KEYS.settings,
            {}
        );

    const monthlyFee =
        Number(
            set.monthlyFee
        ) || 2.50;

    const yearlyFee =
        Number(
            set.yearlyFee
        ) ||
        (
            monthlyFee * 12
        );

    return `

        <div class="grid-2">

            <div class="panel">

                <h2>
                    System settings
                </h2>

                <form
                    id="systemSettings"
                    class="stack-form"
                >

                    ${field(
                        'schoolName',
                        'Class / organization name',
                        set.schoolName || ''
                    )}

                    ${field(
                        'currency',
                        'Currency code',
                        set.currency || 'USD'
                    )}

                    ${field(
                        'monthlyFee',
                        'Class Fee — Monthly',
                        monthlyFee,
                        'number',
                        true,
                        'min="0" step="0.01"'
                    )}

                    ${field(
                        'yearlyFee',
                        'Class Fee — Yearly',
                        yearlyFee,
                        'number',
                        true,
                        'min="0" step="0.01"'
                    )}

                    <div class="form-grid">

                        <button
                            type="button"
                            class="button ghost"
                            id="changeAdminUsernameBtn"
                        >
                            Change Username
                        </button>

                        <button
                            type="button"
                            class="button ghost"
                            id="changeAdminPasswordBtn"
                        >
                            Change Password
                        </button>

                    </div>

                    <div
                        id="settingsError"
                        class="form-error"
                    ></div>

                    <button
                        class="button primary"
                        type="submit"
                    >
                        Save settings
                    </button>

                </form>

            </div>


            <div class="panel">

                <h2>
                    Data & security
                </h2>

                <p class="muted">
                    CampusPay data is stored in the connected
                    Supabase database and protected by account
                    permissions.
                </p>

                <div class="danger-box">

                    <strong>
                        Reset all workspace data
                    </strong>

                    <p>
                        This removes all students, payments,
                        receipts, complaints, notifications
                        and audit logs from the online workspace.
                    </p>

                    <button
                        class="button danger"
                        id="resetAll"
                    >
                        Reset workspace
                    </button>

                </div>

            </div>

        </div>

    `;
}


function openAdminUsernameModal() {

    const content=`
        <label>
            New Username

            <input
                name="newUsername"
                type="text"
                required
                autocomplete="off"
                pattern="[A-Za-z]+"
                title="Username can contain letters only."
            >
        </label>

        <div class="modal-error"></div>
    `;

    modal(
        'Change Username',
        content,
        async form=>{

            const newUsername=
                String(
                    form.get('newUsername')||''
                )
                .trim()
                .toLowerCase();

            if(!newUsername) {
                throw Error(
                    'New username is required.'
                );
            }

            if(
                !/^[a-zA-Z]+$/.test(
                    newUsername
                )
            ) {
                throw Error(
                    'Username can contain letters only.'
                );
            }

            await updateAdminUsername(
                newUsername
            );

            toast(
                'Username changed successfully'
            );

        }
    );
}


function openAdminPasswordModal() {

    const content=`
        ${field(
            'currentPassword',
            'Current Password',
            '',
            'password',
            true,
            'autocomplete="current-password"'
        )}

        ${field(
            'newPassword',
            'New Password',
            '',
            'password',
            true,
            'minlength="6" autocomplete="new-password"'
        )}

        ${field(
            'confirmPassword',
            'Confirm New Password',
            '',
            'password',
            true,
            'minlength="6" autocomplete="new-password"'
        )}

        <div class="modal-error"></div>
    `;

    modal(
        'Change Password',
        content,
        async form=>{

            const currentPassword=
                String(
                    form.get('currentPassword')||''
                );

            const newPassword=
                String(
                    form.get('newPassword')||''
                );

            const confirmPassword=
                String(
                    form.get('confirmPassword')||''
                );

            if(!currentPassword) {
                throw Error(
                    'Current password is required.'
                );
            }

            if(
                newPassword.length<6
            ) {
                throw Error(
                    'New password must contain at least 6 characters.'
                );
            }

            if(
                newPassword!==confirmPassword
            ) {
                throw Error(
                    'New passwords do not match.'
                );
            }

            await changeAdminPassword(
                currentPassword,
                newPassword
            );

            toast(
                'Password changed successfully'
            );

        }
    );
}


async function updateAdminUsername(username) {

    ensureDb();

    const newUsername=
        String(
            username||''
        )
        .trim()
        .toLowerCase();

    if(!newUsername) {
        throw Error(
            'Admin username is required.'
        );
    }

    if(
        !/^[a-zA-Z]+$/.test(
            newUsername
        )
    ) {
        throw Error(
            'Admin username can contain letters only.'
        );
    }

    if(!session?.userId) {
        throw Error(
            'Admin session not found.'
        );
    }

    const {
        error:usernameError
    }=
        await db
            .from('profiles')
            .update({
                username:newUsername
            })
            .eq(
                'user_id',
                session.userId
            );

    if(usernameError) {

        if(
            usernameError.code===
            '23505'
        ) {
            throw Error(
                'This admin username is already in use.'
            );
        }

        throw usernameError;
    }

    const {
        error:metadataError
    }=
        await db.auth.updateUser({
            data:{
                username:newUsername
            }
        });

    if(metadataError) {
        throw metadataError;
    }

    store.admin.username=
        newUsername;

    await addAuditLog(
        'Updated administrator username'
    );
}


async function changeAdminPassword(
    currentPassword,
    newPassword
) {

    ensureDb();

    const current=
        String(
            currentPassword||''
        );

    const next=
        String(
            newPassword||''
        );

    if(!current) {
        throw Error(
            'Current password is required.'
        );
    }

    if(
        next.length<6
    ) {
        throw Error(
            'New password must contain at least 6 characters.'
        );
    }

    if(!session?.userId) {
        throw Error(
            'Admin session not found.'
        );
    }

    const {
        data:authData,
        error:userError
    }=
        await db.auth.getUser();

    if(userError) {
        throw userError;
    }

    const email=
        authData?.user?.email;

    if(!email) {
        throw Error(
            'Administrator authentication email was not found.'
        );
    }

    const {
        error:verifyError
    }=
        await db.auth.signInWithPassword({
            email,
            password:current
        });

    if(verifyError) {
        throw Error(
            'Current password is incorrect.'
        );
    }

    const {
        error:passwordError
    }=
        await db.auth.updateUser({
            password:next
        });

    if(passwordError) {
        throw passwordError;
    }

    await addAuditLog(
        'Updated administrator password'
    );
}


function bindPage(
    s,
    page
) {

    $('#dashboardMonth')?.addEventListener(
        'change',
        e=>{
            window.__dashboardMonth=e.target.value;
            renderPage();
        }
    );

    const studentKey =
        s.student_id ||
        s.studentId ||
        s.username ||
        s.id;

    const savedStudentPhoto =
        localStorage.getItem(
            `campuspay_student_photo_${studentKey}`
        );

    const studentAvatar =
        $('#studentDashboardPhoto');

    if (savedStudentPhoto && studentAvatar) {
        studentAvatar.innerHTML =
            `<img src="${savedStudentPhoto}" alt="Profile photo">`;
    }

    $('#addStudentBtn')?.addEventListener(
        'click',
        ()=>openStudentForm(null)
    );

    $('#addPaymentBtn')?.addEventListener(
        'click',
        ()=>openPaymentForm(null)
    );

    $('#addNotificationBtn')?.addEventListener(
        'click',
        openNotificationForm
    );

    $('#addComplaintBtn')?.addEventListener(
        'click',
        ()=>openComplaintForm(s)
    );

    $('#studentSearch')?.addEventListener(
        'input',
        e=>{

            $('#studentTable').innerHTML=
                renderStudentTable(
                    getStudents().filter(
                        x=>
                            [
                                x.id,
                                x.username,
                                x.fullName,
                                x.phone,
                                x.course
                            ]
                            .join(' ')
                            .toLowerCase()
                            .includes(
                                e.target.value
                                    .toLowerCase()
                            )
                    )
                );

        }
    );

    $$('[data-edit-student]').forEach(
        b=>{

            b.onclick=()=>{

                openStudentForm(
                    getStudentById(
                        b.dataset.editStudent
                    )
                );

            };

        }
    );

    $$('[data-view-student]').forEach(
        b=>{

            b.onclick=()=>{

                viewStudent(
                    getStudentById(
                        b.dataset.viewStudent
                    )
                );

            };

        }
    );

    $$('[data-reset-password]').forEach(
        b=>{

            b.onclick=()=>{

                openResetPassword(
                    getStudentById(
                        b.dataset.resetPassword
                    )
                );

            };

        }
    );

    $$('[data-delete-student]').forEach(
        b=>{

            b.onclick=()=>{

                const st=
                    getStudentById(
                        b.dataset.deleteStudent
                    );

                if(
                    confirm(
                        `Delete ${
                            st?.fullName||
                            b.dataset.deleteStudent
                        }? This also removes linked records.`
                    )
                ) {

                    deleteStudent(
                        b.dataset.deleteStudent
                    )
                    .then(()=>{

                        toast(
                            'Student deleted'
                        );

                        renderPage();

                    })
                    .catch(
                        err=>
                            toast(
                                userMessage(err),
                                'error'
                            )
                    );

                }

            };

        }
    );

    $$('[data-edit-payment]').forEach(
        b=>{

            b.onclick=()=>{

                openPaymentForm(
                    getPayments().find(
                        p=>
                            p.id===
                            b.dataset.editPayment
                    )
                );

            };

        }
    );

    $$('[data-resolve-complaint]').forEach(
        b=>{

            b.onclick=()=>{

                const c=
                    getComplaints().find(
                        x=>
                            x.id===
                            b.dataset.resolveComplaint
                    );

                if(!c) {
                    return;
                }

                const next=
                    c.status==='Pending'
                        ?'In review'
                        :c.status==='In review'
                            ?'Resolved'
                            :'Pending';

                updateComplaint(
                    c.id,
                    {
                        status:next
                    }
                )
                .then(()=>{

                    toast(
                        `Status changed to ${next}`
                    );

                    renderPage();

                })
                .catch(
                    err=>
                        toast(
                            userMessage(err),
                            'error'
                        )
                );

            };

        }
    );

    $$('[data-print-receipt]').forEach(
        b=>{

            b.onclick=()=>{

                printReceipt(
                    getReceipts().find(
                        r=>
                            r.id===
                            b.dataset.printReceipt
                    )
                );

            };

        }
    );

    /*
     * STUDENT CHANGE PASSWORD
     */

    $('#changePassword')?.addEventListener(
        'submit',
        async e=>{

            e.preventDefault();

            const v=
                Object.fromEntries(
                    new FormData(
                        e.currentTarget
                    )
                );

            const err=
                $('#profileError');

            err.textContent='';

            if(
                v.newPassword.length<6
            ) {

                err.textContent=
                    'New password must contain at least 6 characters.';

                return;
            }

            if(
                v.newPassword!==
                v.confirmPassword
            ) {

                err.textContent=
                    'New passwords do not match.';

                return;
            }

            try {

                await changeStudentPassword(
                    v.oldPassword,
                    v.newPassword
                );

                toast(
                    'Password changed successfully'
                );

            } catch(x) {

                err.textContent=
                    userMessage(x);

            }

        }
    );

    /*
     * ADMIN SETTINGS SECURITY
     */

    $('#changeAdminUsernameBtn')?.addEventListener(
        'click',
        openAdminUsernameModal
    );

    $('#changeAdminPasswordBtn')?.addEventListener(
        'click',
        openAdminPasswordModal
    );

    /*
     * CLASS FEE AUTOMATIC CALCULATION
     */

    const monthlyInput=
        $('#systemSettings input[name="monthlyFee"]');

    const yearlyInput=
        $('#systemSettings input[name="yearlyFee"]');

    if(
        monthlyInput&&
        yearlyInput
    ) {

        let feeUpdating=false;

        monthlyInput.addEventListener(
            'input',
            ()=>{

                if(feeUpdating) {
                    return;
                }

                const monthly=
                    Number(
                        monthlyInput.value
                    );

                if(
                    !Number.isFinite(
                        monthly
                    )||
                    monthly<0
                ) {
                    return;
                }

                feeUpdating=true;

                yearlyInput.value=
                    (monthly*12)
                        .toFixed(2);

                feeUpdating=false;

            }
        );

        yearlyInput.addEventListener(
            'input',
            ()=>{

                if(feeUpdating) {
                    return;
                }

                const yearly=
                    Number(
                        yearlyInput.value
                    );

                if(
                    !Number.isFinite(
                        yearly
                    )||
                    yearly<0
                ) {
                    return;
                }

                feeUpdating=true;

                monthlyInput.value=
                    (yearly/12)
                        .toFixed(2);

                feeUpdating=false;

            }
        );

    }

    /*
     * SAVE SYSTEM SETTINGS
     */

    $('#systemSettings')?.addEventListener(
        'submit',
        async e=>{

            e.preventDefault();

            const v=
                Object.fromEntries(
                    new FormData(
                        e.currentTarget
                    )
                );

            $('#settingsError').textContent='';

            let monthly=
                Number(
                    v.monthlyFee
                );

            let yearly=
                Number(
                    v.yearlyFee
                );

            if(
                !Number.isFinite(monthly)||
                monthly<0
            ) {

                $('#settingsError').textContent=
                    'Monthly Class Fee cannot be negative.';

                return;
            }

            if(
                !Number.isFinite(yearly)||
                yearly<0
            ) {

                $('#settingsError').textContent=
                    'Yearly Class Fee cannot be negative.';

                return;
            }

            yearly=
                Number(
                    (
                        monthly*12
                    ).toFixed(2)
                );

            monthly=
                Number(
                    (
                        yearly/12
                    ).toFixed(2)
                );

            try {

                await write(
                    KEYS.settings,
                    {
                        schoolName:
                            v.schoolName,

                        currency:
                            v.currency
                                .toUpperCase(),

                        monthlyFee:
                            monthly,

                        yearlyFee:
                            yearly
                    }
                );

                toast(
                    'Settings saved'
                );

                renderPage();

            } catch(x) {

                $('#settingsError').textContent=
                    userMessage(x);

            }

        }
    );

    $('#resetAll')?.addEventListener(
        'click',
        ()=>{

            if(
                confirm(
                    'Reset all workspace data? This cannot be undone.'
                )
            ) {

                resetWorkspace()
                .then(()=>{

                    toast(
                        'Workspace reset'
                    );

                    renderPage();

                })
                .catch(
                    err=>
                        toast(
                            userMessage(err),
                            'error'
                        )
                );

            }

        }
    );
    $('#studentPhotoInput')?.addEventListener(
    'change',
    e => {
        const file = e.target.files?.[0];

        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast('Please select an image file.');
            return;
        }

        const reader = new FileReader();

reader.onload = () => {
    const photo = reader.result;

    const studentKey =
        s.student_id ||
        s.studentId ||
        s.username ||
        s.id;

    localStorage.setItem(
        `campuspay_student_photo_${studentKey}`,
        photo
    );

    const avatar =
        $('#studentDashboardPhoto');

    if (avatar) {
        avatar.innerHTML =
            `<img src="${photo}" alt="Profile photo">`;
    }

    toast('Profile photo updated.');
};

        reader.readAsDataURL(file);
    }
    );
}

function renderPage() {

    const s=
        currentSession();

    if(!s) {

        if(
            !location.pathname.endsWith(
                'index.html'
            )&&
            !location.pathname.endsWith('/')
        ) {

            location.href=
                '../index.html';

        }

        return;
    }

    const file=
        location.pathname
            .split('/')
            .pop();

    const pageMap={

        'dashboard.html':
            'overview',

        'students.html':
            'students',

        'payments.html':
            'payments',

        'receipts.html':
            'receipts',

        'complaints.html':
            'complaints',

        'notifications.html':
            'notifications',

        'notification.html':
            'notifications',

        'reports.html':
            'reports',

        'audit-logs.html':
            'audit',

        'settings.html':
            'settings',

        'profile.html':
            'profile',

        'swtting.html':
            'settings'
    };

    const page=
        pageMap[file]||
        document.querySelector(
            '#app'
        )?.dataset.page||
        'overview';

    let body='';

    let title='Dashboard';

    if(page==='overview') {

        title='Dashboard';

        body=
            dashboardView(s);

    } else if(page==='students') {

        title='Students';

        body=
            studentsView();

    } else if(page==='payments') {

        title=
            s.role==='admin'
                ?'Payments'
                :'My payments';

        body=
            paymentsView(s);

    } else if(page==='receipts') {

        title='Receipts';

        body=
            receiptsView(s);

    } else if(page==='complaints') {

        title=
            s.role==='admin'
                ?'Support requests'
                :'Support';

        body=
            complaintsView(s);

    } else if(page==='notifications') {

        title='Notifications';

        body=
            notificationsView(s);

    } else if(page==='reports') {

        title='Reports';

        body=
            reportsView();

    } else if(page==='audit') {

        title='Audit logs';

        body=
            auditView();

    } else if(page==='profile') {

        title='My profile';

        body=
            profileView(s);

    } else if(page==='settings') {

        title=
            s.role==='admin'
                ?'Settings'
                :'Account settings';

        body=
            settingsView(s);
    }

    frame(
        s,
        page,
        body,
        title
    );

    enhancePasswordInputs(
        document
    );

    bindPage(
        s,
        page
    );
}

function boot() {

    enhancePasswordInputs(
        document
    );

    if($('#loginForm')) {

        $('#loginForm').onsubmit=
            async e=>{

                e.preventDefault();

                const error=
                    $('#loginError');

                error.textContent='';

                try {

                    const role=
                        $('#loginRole').value;

                    await login(
                        role,
                        $('#loginUsername').value,
                        $('#loginPassword').value
                    );

                    location.href=
                        role+
                        '/dashboard.html';

                } catch(x) {

                    error.textContent=
                        userMessage(x);

                }

            };

    } else {

        loadCampusData()
        .then(s=>{

            if(!s) {

                location.href=
                    '../index.html';

                return;
            }

            renderPage();

        })
        .catch(e=>{

            document.body.insertAdjacentHTML(
                'beforeend',
                `
                    <div class="toast error show">
                        ${esc(
                            userMessage(e)
                        )}
                    </div>
                `
            );

        });
    }
}

document.addEventListener(
    'DOMContentLoaded',
    boot
);




function openAdminPhoto() {
    const modal = document.createElement('div');

    modal.className = 'admin-photo-modal';

    modal.innerHTML = `
        <div class="admin-photo-overlay" onclick="closeAdminPhoto()">
            <div class="admin-photo-box" onclick="event.stopPropagation()">
                <button class="admin-photo-close" onclick="closeAdminPhoto()">×</button>
                <img src="../picture/AD.JPG" alt="Admin Photo">
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

function closeAdminPhoto() {
    const modal = document.querySelector('.admin-photo-modal');

    if (modal) {
        modal.remove();
    }
}