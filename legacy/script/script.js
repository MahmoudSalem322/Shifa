/* ====================================================================
   Shifa - Combined JavaScript
   Merged from script.js (main site) + login/script2.js (auth pages)
   ==================================================================== */

/* --------------------------------------------------------------------
   SECTION 1: Main site logic (formerly script.js)
   -------------------------------------------------------------------- */

/* هذا الجزء خاص بالصفحة الرئيسية فقط (الهيدر وشريط التنقل)، لذلك يتم
   تفعيله فقط عندما تكون عناصر الصفحة الرئيسية (مثل navbar) موجودة،
   حتى لا يسبب خطأ عند تحميل نفس الملف على صفحة تسجيل الدخول */
if (document.getElementById("navbar")) {

    const navbar = document.getElementById("navbar");

    window.addEventListener("scroll", function () {
        if (window.scrollY > 30) {
            navbar.classList.add("scrolled");
        } else {
            navbar.classList.remove("scrolled");
        }
    });

    const menuBtn = document.getElementById("menuBtn");
    const navLinks = document.getElementById("navLinks");

    menuBtn.addEventListener("click", function () {
        navLinks.classList.toggle("show");
    });

    document.querySelectorAll(".nav-links a").forEach(function (link) {
        link.addEventListener("click", function () {
            navLinks.classList.remove("show");
        });
    });

    const sections = document.querySelectorAll("section[id]");
    const links = document.querySelectorAll(".nav-links a");

    window.addEventListener("scroll", function () {
        let current = "";
        sections.forEach(function (section) {
            const sectionTop = section.offsetTop - 150;
            const sectionHeight = section.offsetHeight;
            if (window.scrollY >= sectionTop && window.scrollY < sectionTop + sectionHeight) {
                current = section.getAttribute("id");
            }
        });

        links.forEach(function (link) {
            link.classList.remove("active");
            if (link.getAttribute("href") === "#" + current) {
                link.classList.add("active");
            }
        });
    });

} // إغلاق فحص الصفحة الرئيسية

/* login */
function login() {
    window.location.href = "login.html#login";
}

function register() {
    window.location.href = "login.html#register";
}

function startJourney() {
    window.location.href = "login.html#login";
}

function goToServices() {
    document.getElementById("services").scrollIntoView({ behavior: "smooth" });
}

// دالة التحقق المشتركة للتأكد من تسجيل الدخول قبل تنفيذ أي خدمة.
// كل نقاط النهاية في الخادم تتطلب توكن، لذلك يتم التحقق قبل الانتقال.
function checkLogin(returnTo) {
    if (Shifa.auth.isAuthed()) return true;
    Shifa.auth.redirectToLogin(returnTo || "");
    return false;
}

// الصفحات الحقيقية المقابلة لكل خدمة في الصفحة الرئيسية.
const SERVICE_PAGES = {
    "الطبيب": "doctor-search.html",
    "المراكز الصحية": "facility-search.html",
    "الأدوية": "pharmacy-search.html",
    "المواعيد": "doctor-search.html"
};

function serviceAction(service) {
    const page = SERVICE_PAGES[service] || "doctor-search.html";
    if (!checkLogin(page)) return;
    window.location.href = page;
}

function donateMedicine() {
    if (!checkLogin("pharmacy-search.html")) return;
    window.location.href = "pharmacy-search.html";
}

function contactUs() {
    alert("أهلًا بك في شفاء 🌿\n\nسيتم تجهيز نموذج التواصل قريبًا.");
}

function mapService(service) {
    const searchInput = document.getElementById("mapSearch");
    if (searchInput) {
        searchInput.value = service;
    }
    if (!checkLogin("facility-search.html")) return;
    window.location.href = "facility-search.html";
}

/* --------------------------------------------------------------------
   SECTION 2: Auth / login page logic (formerly login/script2.js)
   Guarded to only run its page-specific listeners when the login
   page's elements exist, so this file can safely be shared with
   the main page too.
   -------------------------------------------------------------------- */

/* VIEWS */

const views = [
    "login",
    "register",
    "forgot",
    "newPassword",
    "dashboard",
    "edit"
];


function hideAllViews() {

    views.forEach(view => {

        const element = document.getElementById(
            view + "View"
        );

        if (element) {
            element.classList.add("hidden");
        }

    });

}


function showView(view) {

    hideAllViews();

    const element = document.getElementById(
        view + "View"
    );

    if (element) {
        element.classList.remove("hidden");
    }

    location.hash = view;

    clearMessages();

    if (view === "dashboard") {
        loadDashboard();
    }

    if (view === "edit") {
        loadEditForm();
    }

}


function clearMessages() {

    document.querySelectorAll(".message").forEach(message => {

        message.className = "message";
        message.textContent = "";

    });

}


function showMessage(elementId, text, type) {

    const element =
        document.getElementById(elementId);

    element.textContent = text;

    element.className =
        "message " + type;

}


/* EMAIL VALIDATION HELPER */

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}


/* PASSWORD TOGGLE */

function togglePassword(inputId, button) {

    const input =
        document.getElementById(inputId);

    if (input.type === "password") {

        input.type = "text";

        button.setAttribute(
            "aria-label",
            "إخفاء كلمة المرور"
        );

        button.innerHTML = `
            <svg viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2">

                <path d="M3 3l18 18"></path>

                <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8"></path>

                <path d="M9.9 4.2A10.6 10.6 0 0 1 12 4
                c7 0 10 7 10 7a18.3 18.3 0 0 1-3.1 4.4"></path>

                <path d="M6.6 6.6C3.8 8.3 2 11 2 11s3.5 7 10 7
                c1.5 0 2.8-.3 4-.8"></path>

            </svg>
        `;

    } else {

        input.type = "password";

        button.setAttribute(
            "aria-label",
            "إظهار كلمة المرور"
        );

        button.innerHTML = `
            <svg viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2">

                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"></path>

                <circle cx="12" cy="12" r="3"></circle>

            </svg>
        `;

    }

}


/* ====================================================================
   AUTH — wired to POST /api/auth/* on the Shifaa API.

   The server owns account state, the OTP and the session token; this
   file only collects input, mirrors the server's validation rules so
   users are not accepted here and rejected there, and renders whatever
   comes back. Nothing about the account is stored in localStorage any
   more except the token and a display-only session snapshot, both
   managed by Shifa.auth (script/api.js).
   ==================================================================== */

/* The API answers a 400 with {"errors":{"Field":["..."]}} in PascalCase;
   these map those field names onto the input ids already in login.html. */
const REGISTER_FIELD_MAP = {
    FullName: "registerName",
    Email: "registerEmail",
    Phone: "registerPhone",
    Password: "registerPassword",
    ConfirmPassword: "registerConfirmPassword",
    Role: "registerRole"
};

const LOGIN_FIELD_MAP = {
    EmailOrPhone: "loginEmail",
    Password: "loginPassword",
    Credentials: "loginPassword"
};

const FORGOT_FIELD_MAP = { Email: "forgotEmail" };

const OTP_FIELD_MAP = { Otp: "otpInput", Email: "forgotEmail" };

const RESET_FIELD_MAP = {
    NewPassword: "newPassword",
    ConfirmNewPassword: "confirmNewPassword"
};

/* Only these three roles have a profile endpoint. Patient and Donor
   accounts have no /me route on the API, so the edit view stays
   read-only for them — see saveEditedProfile(). */
const ROLE_PROFILE_API = {
    Doctor: "doctors",
    Pharmacy: "pharmacies",
    Hospital: "facilities"
};


/* Disables a form while its request is in flight and hands back an undo. */
function setFormBusy(form, label) {
    if (!form) return function () {};

    const submit = form.querySelector('button[type="submit"], button:not([type])');
    const restoreButton = submit ? Shifa.ui.busy(submit, label) : function () {};

    const fields = Array.prototype.slice.call(
        form.querySelectorAll("input, select, textarea")
    );
    fields.forEach(field => { field.disabled = true; });

    return function () {
        restoreButton();
        fields.forEach(field => { field.disabled = false; });
    };
}


/* REGISTER */
/* هذا الجزء خاص بصفحة تسجيل الدخول فقط */
if (document.getElementById("loginView")) {

document.getElementById("registerForm").addEventListener(
    "submit",
    function (event) {

        event.preventDefault();

        Shifa.errors.clear(REGISTER_FIELD_MAP);

        const name =
            document.getElementById(
                "registerName"
            ).value.trim();

        const email =
            document.getElementById(
                "registerEmail"
            ).value.trim();

        const phone =
            document.getElementById(
                "registerPhone"
            ).value.trim();

        const role =
            document.getElementById(
                "registerRole"
            ).value;

        const password =
            document.getElementById(
                "registerPassword"
            ).value;

        const confirmPassword =
            document.getElementById(
                "registerConfirmPassword"
            ).value;


        if (!name) {
            showMessage("registerMessage", "الاسم: قم بادخاله", "error");
            return;
        }

        if (!email) {
            showMessage("registerMessage", "البريد الإلكتروني: قم بادخاله", "error");
            return;
        }

        /* The API accepts Gmail addresses only. */
        if (!Shifa.validate.gmail(email)) {
            showMessage(
                "registerMessage",
                "يجب إدخال بريد Gmail صحيح (مثال: name@gmail.com).",
                "error"
            );
            return;
        }

        if (!phone) {
            showMessage("registerMessage", "رقم الهاتف: قم بادخاله", "error");
            return;
        }

        if (!Shifa.validate.phone(phone)) {
            showMessage(
                "registerMessage",
                "رقم الهاتف يجب أن يتكون من 10 أرقام ويبدأ بـ 05.",
                "error"
            );
            return;
        }

        if (!role) {
            showMessage("registerMessage", "نوع الحساب: قم بادخاله", "error");
            return;
        }

        if (!password) {
            showMessage("registerMessage", "كلمة المرور: قم بادخاله", "error");
            return;
        }

        if (!Shifa.validate.password(password)) {
            showMessage(
                "registerMessage",
                "كلمة المرور يجب أن تكون 8 أحرف على الأقل.",
                "error"
            );
            return;
        }

        if (!confirmPassword) {
            showMessage("registerMessage", "تأكيد كلمة المرور: قم بادخاله", "error");
            return;
        }

        if (password !== confirmPassword) {
            showMessage(
                "registerMessage",
                "كلمتا المرور غير متطابقتين.",
                "error"
            );
            return;
        }


        const done = setFormBusy(this, "جارٍ إنشاء الحساب…");

        showMessage("registerMessage", "جارٍ إنشاء الحساب…", "success");

        Shifa.api.auth.signup({
            fullName: name,
            email: email,
            phone: phone,
            password: password,
            confirmPassword: confirmPassword,
            role: Shifa.roles.normalize(role)
        })
            .then(response => {
                done();

                /* Some deployments hand back a token immediately; others
                   require the emailed OTP first. Follow whichever the
                   response indicates rather than assuming one. */
                const session = Shifa.auth.setSession(response);

                if (Shifa.auth.isAuthed()) {
                    showMessage(
                        "registerMessage",
                        "تم إنشاء حسابك بنجاح 🌿",
                        "success"
                    );
                    setTimeout(() => { showView("dashboard"); }, 700);
                    return;
                }

                /* No token yet — send them through email verification. */
                showMessage(
                    "registerMessage",
                    "تم إنشاء حسابك. أدخل رمز التحقق المُرسل إلى بريدك الإلكتروني.",
                    "success"
                );
                pendingEmail = email;
                setTimeout(() => {
                    showView("forgot");
                    const forgotEmail = document.getElementById("forgotEmail");
                    if (forgotEmail) forgotEmail.value = email;
                    openOtpStep();
                    showMessage(
                        "forgotMessage",
                        "أدخل رمز التحقق المُرسل إلى " + email,
                        "success"
                    );
                }, 900);
            })
            .catch(error => {
                done();
                Shifa.errors.applyToForm(error, REGISTER_FIELD_MAP, "registerMessage");
            });

    }
);

} // إغلاق فحص صفحة تسجيل الدخول (REGISTER)


/* LOGIN */
if (document.getElementById("loginView")) {

document.getElementById("loginForm").addEventListener(
    "submit",
    function (event) {

        event.preventDefault();

        Shifa.errors.clear(LOGIN_FIELD_MAP);

        /* The field accepts a Gmail address or an 05… phone number —
           the API binds both to a single emailOrPhone property. */
        const emailOrPhone =
            document.getElementById(
                "loginEmail"
            ).value.trim();

        const password =
            document.getElementById(
                "loginPassword"
            ).value;

        const remember =
            document.getElementById(
                "rememberMe"
            ).checked;


        if (!emailOrPhone) {
            showMessage("loginMessage", "البريد الإلكتروني أو رقم الهاتف: قم بادخاله", "error");
            return;
        }

        if (!Shifa.validate.emailOrPhone(emailOrPhone)) {
            showMessage(
                "loginMessage",
                "أدخل بريد Gmail صحيح أو رقم هاتف مكوّن من 10 أرقام يبدأ بـ 05.",
                "error"
            );
            return;
        }

        if (!password) {
            showMessage("loginMessage", "كلمة المرور: قم بادخاله", "error");
            return;
        }


        const done = setFormBusy(this, "جارٍ تسجيل الدخول…");

        showMessage("loginMessage", "جارٍ تسجيل الدخول…", "success");

        Shifa.api.auth.login({
            emailOrPhone: emailOrPhone,
            password: password,
            rememberMe: remember
        })
            .then(response => {
                done();
                Shifa.auth.setSession(response);

                if (!Shifa.auth.isAuthed()) {
                    /* Account exists but is not verified yet. */
                    showMessage(
                        "loginMessage",
                        "لم يتم تأكيد الحساب بعد. تحقّق من بريدك الإلكتروني.",
                        "error"
                    );
                    return;
                }

                /* Honour the page the visitor was trying to reach before
                   the auth wall sent them here. */
                const returnTo = Shifa.auth.consumeReturnTo();
                if (returnTo && returnTo.indexOf("login.html") !== 0) {
                    window.location.href = returnTo;
                    return;
                }

                showView("dashboard");
            })
            .catch(error => {
                done();
                Shifa.errors.applyToForm(error, LOGIN_FIELD_MAP, "loginMessage");
            });

    }
);

} // إغلاق فحص صفحة تسجيل الدخول (LOGIN)


/* DASHBOARD */

function loadDashboard() {

    const user = Shifa.auth.getUser();

    if (!Shifa.auth.isAuthed() || !user) {

        showView("login");

        return;
    }


    document.getElementById(
        "dashboardName"
    ).textContent = user.fullName || "—";


    document.getElementById(
        "dashboardEmail"
    ).textContent = user.email || "—";


    document.getElementById(
        "dashboardPhone"
    ).textContent = user.phone || "—";


    document.getElementById(
        "dashboardRole"
    ).textContent = Shifa.roles.toArabic(user.role) || "—";

}


/* EDIT PROFILE */

function loadEditForm() {

    const user = Shifa.auth.getUser();

    if (!Shifa.auth.isAuthed() || !user) {

        showView("login");

        return;
    }


    document.getElementById(
        "editName"
    ).value = user.fullName || "";


    document.getElementById(
        "editEmail"
    ).value = user.email || "";


    document.getElementById(
        "editPhone"
    ).value = user.phone || "";


    document.getElementById(
        "editRole"
    ).value = Shifa.roles.normalize(user.role) || "";


    /* Neither the email nor the account type can be changed through any
       endpoint the API exposes, so they are shown but not editable. */
    const emailField = document.getElementById("editEmail");
    const roleField = document.getElementById("editRole");
    if (emailField) emailField.readOnly = true;
    if (roleField) roleField.disabled = true;

    const endpoint = ROLE_PROFILE_API[Shifa.roles.normalize(user.role)];
    if (!endpoint) {
        showMessage(
            "editMessage",
            "تعديل بيانات هذا النوع من الحسابات غير متاح حالياً عبر الخادم.",
            "error"
        );
    }

}


function saveEditedProfile() {

    const user = Shifa.auth.getUser();

    if (!Shifa.auth.isAuthed() || !user) {

        showView("login");

        return;
    }


    const newName =
        document.getElementById(
            "editName"
        ).value.trim();


    const newPhone =
        document.getElementById(
            "editPhone"
        ).value.trim();


    if (!newName) {
        showMessage("editMessage", "الاسم: قم بادخاله", "error");
        return;
    }

    if (!newPhone) {
        showMessage("editMessage", "رقم الهاتف: قم بادخاله", "error");
        return;
    }

    if (!Shifa.validate.phone(newPhone)) {
        showMessage(
            "editMessage",
            "رقم الهاتف يجب أن يتكون من 10 أرقام ويبدأ بـ 05.",
            "error"
        );
        return;
    }


    const role = Shifa.roles.normalize(user.role);
    const endpoint = ROLE_PROFILE_API[role];

    if (!endpoint) {
        /* Patient and Donor accounts have no profile endpoint on the API. */
        showMessage(
            "editMessage",
            "تعديل بيانات هذا النوع من الحسابات غير متاح حالياً عبر الخادم.",
            "error"
        );
        return;
    }


    showMessage("editMessage", "جارٍ حفظ التعديلات…", "success");

    /* The PUT bodies are full replacements with several required fields
       the small edit form does not collect, so the current profile is
       read first and only the two edited values are overwritten. */
    Shifa.api[endpoint].me()
        .then(current => {
            const profile = Shifa.toItem(current) || {};
            const payload = Object.assign({}, profile);

            if (role === "Doctor") {
                payload.fullName = newName;
            } else {
                payload.name = newName;
            }
            payload.phone = newPhone;

            return Shifa.api[endpoint].updateMe(payload);
        })
        .then(() => {
            Shifa.auth.mergeSession({ fullName: newName, phone: newPhone });
            showView("dashboard");
        })
        .catch(error => {
            Shifa.errors.applyToForm(
                error,
                { FullName: "editName", Name: "editName", Phone: "editPhone" },
                "editMessage"
            );
        });

}


/* ENTER THE APP
   The view in login.html is only an account summary; dashboard.html is the
   real, role-aware dashboard. */

function goToApp() {

    if (!Shifa.auth.isAuthed()) {
        showView("login");
        return;
    }

    window.location.href = "dashboard.html";

}


/* FORGOT PASSWORD / OTP
   The OTP is generated and emailed by the server. The old build made one
   up with Math.random() and printed it on the page; both are gone. */

let pendingEmail = "";


function openOtpStep() {

    const otpStep = document.getElementById("otpStep");
    const emailStep = document.getElementById("emailStep");

    if (otpStep) otpStep.classList.add("active");
    if (emailStep) emailStep.style.display = "none";

}


function sendOTP() {

    const email =
        document.getElementById(
            "forgotEmail"
        ).value.trim();


    if (!email) {

        showMessage(
            "forgotMessage",
            "البريد الإلكتروني: قم بادخاله",
            "error"
        );

        return;
    }


    if (!Shifa.validate.gmail(email)) {
        showMessage(
            "forgotMessage",
            "يجب إدخال بريد Gmail صحيح (مثال: name@gmail.com).",
            "error"
        );
        return;
    }


    showMessage("forgotMessage", "جارٍ إرسال رمز التحقق…", "success");

    Shifa.api.auth.forgotPassword(email)
        .then(() => {
            pendingEmail = email;
            openOtpStep();
            showMessage(
                "forgotMessage",
                "تم إرسال رمز التحقق إلى بريدك الإلكتروني.",
                "success"
            );
        })
        .catch(error => {
            Shifa.errors.applyToForm(error, FORGOT_FIELD_MAP, "forgotMessage");
        });

}


function resendOTP() {

    const email = pendingEmail ||
        document.getElementById("forgotEmail").value.trim();

    if (!Shifa.validate.gmail(email)) {
        showMessage(
            "forgotMessage",
            "يجب إدخال بريد Gmail صحيح (مثال: name@gmail.com).",
            "error"
        );
        return;
    }

    showMessage("forgotMessage", "جارٍ إعادة إرسال الرمز…", "success");

    Shifa.api.auth.resendOtp(email)
        .then(() => {
            pendingEmail = email;
            showMessage(
                "forgotMessage",
                "تم إرسال رمز جديد إلى بريدك الإلكتروني.",
                "success"
            );
        })
        .catch(error => {
            Shifa.errors.applyToForm(error, FORGOT_FIELD_MAP, "forgotMessage");
        });

}


/* VERIFY OTP */

function verifyOTP() {

    const enteredOTP =
        document.getElementById(
            "otpInput"
        ).value.trim();


    if (!enteredOTP) {
        showMessage("forgotMessage", "رمز التحقق: قم بادخاله", "error");
        return;
    }


    if (!Shifa.validate.otp(enteredOTP)) {

        showMessage(
            "forgotMessage",
            "رمز التحقق يجب أن يتكون من 6 أرقام.",
            "error"
        );

        return;
    }


    const email = pendingEmail ||
        document.getElementById("forgotEmail").value.trim();

    showMessage("forgotMessage", "جارٍ التحقق من الرمز…", "success");

    Shifa.api.auth.verifyOtp(email, enteredOTP)
        .then(response => {
            pendingEmail = email;

            /* Verifying a brand-new signup can return the session token;
               verifying a password reset does not. */
            Shifa.auth.setSession(response);

            if (Shifa.auth.isAuthed()) {
                showView("dashboard");
                return;
            }

            showView("newPassword");
        })
        .catch(error => {
            Shifa.errors.applyToForm(error, OTP_FIELD_MAP, "forgotMessage");
        });

}


/* NEW PASSWORD */
if (document.getElementById("loginView")) {

document.getElementById(
    "newPasswordForm"
).addEventListener(
    "submit",
    function (event) {

        event.preventDefault();

        Shifa.errors.clear(RESET_FIELD_MAP);

        const newPassword =
            document.getElementById(
                "newPassword"
            ).value;

        const confirmNewPassword =
            document.getElementById(
                "confirmNewPassword"
            ).value;


        if (!newPassword) {
            showMessage("newPasswordMessage", "كلمة المرور الجديدة: قم بادخاله", "error");
            return;
        }

        if (!Shifa.validate.password(newPassword)) {

            showMessage(
                "newPasswordMessage",
                "كلمة المرور يجب أن تكون 8 أحرف على الأقل.",
                "error"
            );

            return;
        }


        if (!confirmNewPassword) {
            showMessage("newPasswordMessage", "تأكيد كلمة المرور: قم بادخاله", "error");
            return;
        }

        if (
            newPassword !==
            confirmNewPassword
        ) {

            showMessage(
                "newPasswordMessage",
                "كلمتا المرور غير متطابقتين.",
                "error"
            );

            return;
        }


        if (!pendingEmail) {
            showMessage(
                "newPasswordMessage",
                "انتهت صلاحية العملية. ابدأ من جديد بطلب رمز تحقق.",
                "error"
            );
            return;
        }


        const done = setFormBusy(this, "جارٍ الحفظ…");

        Shifa.api.auth.resetPassword({
            email: pendingEmail,
            newPassword: newPassword,
            confirmNewPassword: confirmNewPassword
        })
            .then(() => {
                done();

                showMessage(
                    "newPasswordMessage",
                    "تم حفظ كلمة المرور الجديدة بنجاح ✓",
                    "success"
                );

                pendingEmail = "";

                setTimeout(() => {
                    showView("login");
                }, 1000);
            })
            .catch(error => {
                done();
                Shifa.errors.applyToForm(error, RESET_FIELD_MAP, "newPasswordMessage");
            });

    }
);

} // إغلاق فحص صفحة تسجيل الدخول (NEW PASSWORD)


/* LOGOUT
   Tells the server first, but clears the local session either way — a
   failed logout call must not leave the visitor stuck signed in. */

function logout() {

    const finish = function () {

        Shifa.auth.clear();

        /* The sidebar on every app page calls this too, where the login
           views do not exist — those pages have to navigate instead. */
        if (!document.getElementById("loginView")) {
            window.location.href = "login.html";
            return;
        }

        showView("login");

        const form = document.getElementById("loginForm");
        if (form) form.reset();

    };

    if (!Shifa.auth.isAuthed()) {
        finish();
        return;
    }

    Shifa.api.auth.logout().then(finish, finish);

}


/* HASH NAVIGATION */

function loadFromHash() {

    const hash =
        location.hash.replace("#", "");


    if (views.includes(hash)) {

        if (
            hash === "dashboard" ||
            hash === "edit"
        ) {

            if (!Shifa.auth.isAuthed()) {

                showView("login");

                return;
            }

        }


        showView(hash);

    } else {

        showView("login");

    }

}


/* هذا الجزء خاص بصفحة تسجيل الدخول فقط، لذلك يتم تفعيله فقط عندما تكون
   عناصر صفحة الدخول (مثل loginView) موجودة، حتى لا يؤثر عند دمج الملف
   مع الصفحة الرئيسية */
if (document.getElementById("loginView")) {

    window.addEventListener(
        "hashchange",
        loadFromHash
    );


    /* INITIAL LOAD */

    window.addEventListener(
        "DOMContentLoaded",
        function () {

            // إلغاء التحقق الافتراضي للمتصفح ومنع رسالة Please fill out this field
            document.querySelectorAll("form").forEach(form => {
                form.setAttribute("novalidate", "true");
            });

            /* A 401 from anywhere means the token is gone; fall back to
               the login view rather than a half-rendered dashboard. */
            Shifa.onUnauthorized(function () {
                showView("login");
            });

            if (Shifa.auth.isAuthed() && !location.hash) {

                showView("dashboard");

            } else {

                loadFromHash();

            }

        }
    );

}

/* --------------------------------------------------------------------
   SECTION 3: Doctor search page logic (doctor-search.html)

   Cards used to be six hardcoded blocks that the filters showed and hid.
   They are now rendered from GET /api/doctors/search. The page's existing
   selects still drive the query; because the API documents no query
   parameters, the same filters are also applied client-side so the page
   behaves correctly whether or not the server honours them.
   -------------------------------------------------------------------- */

/* Normalises one doctor record. Every read goes through Shifa.pick because
   the API publishes no response schema — see script/api.js. */
function normalizeDoctor(raw) {
  if (!raw) return null;
  return {
    id: Shifa.pick(raw, 'id', 'doctorId'),
    name: Shifa.pick(raw, 'fullName', 'name', 'doctorName') || 'طبيب',
    specialization: Shifa.pick(raw, 'specialization', 'specialty', 'specializationName') || '',
    licenseNumber: Shifa.pick(raw, 'licenseNumber', 'license') || '',
    experience: Number(Shifa.pick(raw, 'yearsOfExperience', 'experienceYears', 'experience')) || 0,
    bio: Shifa.pick(raw, 'bio', 'about', 'description') || '',
    rating: Number(Shifa.pick(raw, 'rating', 'averageRating', 'rate')) || 0,
    reviewsCount: Number(Shifa.pick(raw, 'reviewsCount', 'reviewCount', 'totalReviews')) || 0,
    /* The live API returns a nested `facility` object (or null) rather than
       a flat facilityId, so both shapes are resolved here. */
    facilityId: Shifa.pick(raw, 'facilityId') ||
                (raw.facility && typeof raw.facility === 'object'
                  ? Shifa.pick(raw.facility, 'id', 'facilityId') : undefined),
    facilityName: Shifa.pick(raw, 'facilityName', 'hospitalName', 'workplace') ||
                  (raw.facility && typeof raw.facility === 'object'
                    ? (Shifa.pick(raw.facility, 'name') || '')
                    : (typeof raw.facility === 'string' ? raw.facility : '')),
    area: Shifa.pick(raw, 'area', 'city', 'governorate', 'location') || '',
    phone: Shifa.pick(raw, 'phone', 'phoneNumber') || '',
    workDays: Shifa.pick(raw, 'workDays', 'workingDays') || '',
    workHours: Shifa.pick(raw, 'workHours', 'workingHours') || '',
    durationMinutes: Number(Shifa.pick(raw, 'consultationDurationMinutes', 'sessionDuration')) || 0,
    image: Shifa.pick(raw, 'imageUrl', 'photoUrl', 'avatarUrl', 'image', 'profileImage') || ''
  };
}

/* A neutral placeholder for records with no photo. */
const DOCTOR_FALLBACK_AVATAR =
  'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128">' +
    '<rect width="128" height="128" fill="#d3e4fe"/>' +
    '<circle cx="64" cy="50" r="22" fill="#0f766e"/>' +
    '<path d="M20 128c0-26 20-44 44-44s44 18 44 44z" fill="#0f766e"/></svg>'
  );

if (document.getElementById('doctors-grid')) {

  let doctorResults = [];
  let doctorFilterTimer = null;

  const doctorsGrid = document.getElementById('doctors-grid');
  const doctorsCount = document.getElementById('results-count');
  const doctorsEmptyState = document.getElementById('no-results-state');

  function readDoctorFilters() {
    const value = id => {
      const element = document.getElementById(id);
      return element ? element.value.trim() : '';
    };
    return {
      search: value('search-doctor-input'),
      specialty: value('specialty-select'),
      city: value('city-select'),
      facility: value('facility-select'),
      availability: value('availability-select')
    };
  }

  /* Client-side pass, kept as a fallback for filters the API ignores. */
  function filterDoctorsLocally(list, filters) {
    return list.filter(doctor => {
      if (filters.search) {
        const haystack = (doctor.name + ' ' + doctor.specialization + ' ' +
                          doctor.facilityName + ' ' + doctor.area).toLowerCase();
        if (haystack.indexOf(filters.search.toLowerCase()) === -1) return false;
      }
      if (filters.specialty) {
        const specialization = String(doctor.specialization).toLowerCase();
        if (specialization.indexOf(filters.specialty.toLowerCase()) === -1) return false;
      }
      if (filters.city) {
        const wanted = Shifa.geo.normalize(filters.city);
        const actual = Shifa.geo.normalize(doctor.area);
        if (wanted && actual && wanted !== actual) return false;
      }
      return true;
    });
  }

  function sortDoctorList(list, criteria) {
    const sorted = list.slice();
    if (criteria === 'rating') {
      sorted.sort((a, b) => b.rating - a.rating);
    } else if (criteria === 'experience') {
      sorted.sort((a, b) => b.experience - a.experience);
    }
    /* 'recommended' keeps the server's own ordering; 'nearest' needs
       distance data the API does not expose, so it is left untouched. */
    return sorted;
  }

  function doctorCardHtml(doctor) {
    const esc = Shifa.ui.escape;
    const detailHref = doctor.id != null
      ? 'doctor-profile.html?id=' + encodeURIComponent(doctor.id)
      : 'doctor-profile.html';

    const ratingBlock = doctor.rating
      ? '<div class="flex items-center gap-1.5 text-text-body">' +
          '<span class="material-symbols-outlined text-state-warning text-[18px]">star</span>' +
          '<span class="font-label-md text-label-md">' + esc(doctor.rating.toFixed(1)) + '</span>' +
          (doctor.reviewsCount
            ? '<span class="font-body-sm text-body-sm text-text-muted">(' +
                esc(doctor.reviewsCount) + ' تقييم)</span>'
            : '') +
        '</div>'
      : '';

    const experienceBlock = doctor.experience
      ? '<div class="flex items-center gap-1.5 text-text-body">' +
          '<span class="material-symbols-outlined text-text-primary text-[18px]">medical_services</span>' +
          '<span class="font-body-sm text-body-sm">خبرة ' + esc(doctor.experience) + ' عاماً</span>' +
        '</div>'
      : '';

    const place = [doctor.facilityName, Shifa.geo.label(doctor.area)]
      .filter(Boolean).join(' - ');
    const placeBlock = place
      ? '<div class="flex items-center gap-1.5 text-text-body col-span-2">' +
          '<span class="material-symbols-outlined text-text-muted text-[18px]">location_on</span>' +
          '<span class="font-body-sm text-body-sm text-text-muted">' + esc(place) + '</span>' +
        '</div>'
      : '';

    const schedule = [doctor.workDays, doctor.workHours].filter(Boolean).join(' · ');
    const scheduleBlock = schedule
      ? '<div class="flex items-center gap-2 p-2 bg-state-success-subtle text-state-success rounded-lg font-body-sm text-body-sm mb-space-md">' +
          '<span class="material-symbols-outlined text-[18px]">schedule</span>' +
          '<span>' + esc(schedule) + '</span>' +
        '</div>'
      : '';

    return '' +
      '<div class="doctor-card bg-surface-card rounded-2xl p-space-md shadow-md hover:shadow-xl transition-all duration-300 flex flex-col justify-between group"' +
        ' data-doctor-id="' + esc(doctor.id == null ? '' : doctor.id) + '">' +
        '<div>' +
          '<div class="flex items-start justify-between gap-space-xs mb-space-sm">' +
            '<div class="flex items-center gap-space-xs">' +
              '<div class="relative">' +
                '<img class="w-16 h-16 rounded-xl object-cover shadow-sm" alt="" src="' +
                  esc(doctor.image || DOCTOR_FALLBACK_AVATAR) + '"/>' +
                (doctor.licenseNumber
                  ? '<span class="absolute -bottom-1 -left-1 bg-state-success text-on-primary w-5 h-5 rounded-full flex items-center justify-center shadow-sm" title="طبيب معتمد رسمياً">' +
                      '<span class="material-symbols-outlined text-[13px]">check</span></span>'
                  : '') +
              '</div>' +
              '<div class="flex flex-col">' +
                '<h3 class="font-headline-md text-headline-md text-text-heading group-hover:text-primary transition-colors">' +
                  esc(doctor.name) + '</h3>' +
                '<span class="font-label-md text-label-md text-text-primary">' +
                  esc(doctor.specialization) + '</span>' +
                (doctor.licenseNumber
                  ? '<span class="font-body-sm text-body-sm text-text-muted">ترخيص ' +
                      esc(doctor.licenseNumber) + '</span>'
                  : '') +
              '</div>' +
            '</div>' +
          '</div>' +
          (ratingBlock || experienceBlock || placeBlock
            ? '<div class="grid grid-cols-2 gap-2 p-space-xs bg-surface-container-low rounded-xl mb-space-sm">' +
                ratingBlock + experienceBlock + placeBlock +
              '</div>'
            : '') +
          scheduleBlock +
        '</div>' +
        '<div class="pt-space-xs flex flex-col gap-space-xs">' +
          '<div class="grid grid-cols-2 gap-space-2xs mt-1">' +
            '<button class="w-full bg-primary-container text-on-primary hover:bg-text-heading py-2.5 px-space-xs rounded-lg font-label-lg text-label-lg flex items-center justify-center gap-1 shadow-sm transition-all"' +
              ' type="button" data-book-doctor>' +
              '<span>حجز موعد</span>' +
              '<span class="material-symbols-outlined text-[18px]">arrow_back</span>' +
            '</button>' +
            '<a class="w-full bg-surface-container-high/60 text-text-primary hover:bg-surface-container-high py-2.5 px-space-xs rounded-lg font-label-md text-label-md flex items-center justify-center gap-1 transition-colors"' +
              ' href="' + esc(detailHref) + '">' +
              '<span>الملف الكامل</span>' +
            '</a>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function renderDoctors(list) {
    if (doctorsEmptyState) {
      doctorsEmptyState.classList.add('hidden');
      doctorsEmptyState.classList.remove('flex');
    }

    if (!list.length) {
      doctorsGrid.innerHTML = '';
      if (doctorsEmptyState) {
        doctorsEmptyState.classList.remove('hidden');
        doctorsEmptyState.classList.add('flex');
      } else {
        Shifa.ui.empty(doctorsGrid, 'لا توجد نتائج مطابقة');
      }
      if (doctorsCount) doctorsCount.textContent = '0 أطباء';
      return;
    }

    doctorsGrid.innerHTML = list.map(doctorCardHtml).join('');
    if (doctorsCount) {
      doctorsCount.textContent = list.length + ' ' +
        (list.length === 1 ? 'طبيب معتمد' : 'أطباء معتمدين');
    }

    doctorsGrid.querySelectorAll('[data-book-doctor]').forEach(button => {
      button.addEventListener('click', function () {
        const card = button.closest('.doctor-card');
        const id = card ? card.getAttribute('data-doctor-id') : '';
        const doctor = list.filter(d => String(d.id) === String(id))[0];
        if (doctor) openBookingModal(doctor.id, doctor.name, doctor.specialization, doctor);
      });
    });
  }

  function loadDoctors() {
    const filters = readDoctorFilters();

    Shifa.ui.skeleton(doctorsGrid, 6);
    if (doctorsCount) doctorsCount.textContent = 'جارٍ التحميل…';
    if (doctorsEmptyState) {
      doctorsEmptyState.classList.add('hidden');
      doctorsEmptyState.classList.remove('flex');
    }

    /* The search endpoint declares no parameters; these are sent under the
       most likely names and ignored harmlessly if the server does not bind
       them, because the same filters run client-side below. */
    const query = {
      name: filters.search,
      specialization: filters.specialty,
      area: Shifa.geo.normalize(filters.city) || filters.city
    };

    Shifa.api.doctors.search(query)
      .then(response => {
        doctorResults = Shifa.toList(response).map(normalizeDoctor).filter(Boolean);
        const sortSelect = document.getElementById('sort-select');
        const visible = sortDoctorList(
          filterDoctorsLocally(doctorResults, filters),
          sortSelect ? sortSelect.value : 'recommended'
        );
        renderDoctors(visible);
      })
      .catch(error => {
        if (doctorsCount) doctorsCount.textContent = '';
        Shifa.ui.failure(doctorsGrid, error, loadDoctors);
      });
  }

  /* Called by the page's oninput/onchange attributes. Debounced so typing
     in the search box does not fire a request per keystroke. */
  function applyFilters() {
    clearTimeout(doctorFilterTimer);
    doctorFilterTimer = setTimeout(loadDoctors, 300);
  }

  function sortDoctors(criteria) {
    renderDoctors(
      sortDoctorList(filterDoctorsLocally(doctorResults, readDoctorFilters()), criteria)
    );
  }

  window.applyFilters = applyFilters;
  window.sortDoctors = sortDoctors;

  document.addEventListener('DOMContentLoaded', loadDoctors);
  if (document.readyState !== 'loading') loadDoctors();
}


/* --------------------------------------------------------------------
   Booking modal — shared by doctor-search.html and doctor-profile.html.
   Submits to POST /api/appointments/book.
   -------------------------------------------------------------------- */

let bookingDoctorId = null;
let bookingDoctor = null;

/* Arabic weekday names, indexed the way Date#getDay() reports them, so a
   picked date can be checked against the doctor's stored workDays string. */
const BOOKING_WEEKDAYS_AR = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

function bookingIsoDate(date) {
  const pad = n => String(n).padStart(2, '0');
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
}

/* openBookingModal(doctorId, name, specialty, doctor?)
   `doctor` is the normalised record; it supplies the working days/hours
   shown as a hint and used to warn about a day the doctor does not work. */
function openBookingModal(doctorId, name, specialty, doctor) {
  bookingDoctorId = doctorId == null ? null : doctorId;
  bookingDoctor = doctor || null;

  const modal = document.getElementById('booking-modal');
  if (!modal) return;

  const nameSlot = document.getElementById('modal-doctor-name');
  const specialtySlot = document.getElementById('modal-doctor-specialty');
  if (nameSlot) nameSlot.textContent = name || '';
  if (specialtySlot) specialtySlot.textContent = specialty || '';

  /* The date field is a real date: today is the floor, and it opens on
     tomorrow so the default is always a bookable day. */
  const dayField = document.getElementById('booking-preferred-day');
  if (dayField) {
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    const horizon = new Date();
    horizon.setDate(today.getDate() + 60);

    dayField.min = bookingIsoDate(today);
    dayField.max = bookingIsoDate(horizon);
    if (!dayField.value) dayField.value = bookingIsoDate(tomorrow);
  }

  const hint = document.getElementById('booking-schedule-hint');
  if (hint) {
    const schedule = doctor
      ? [doctor.workDays, doctor.workHours].filter(Boolean).join(' · ')
      : '';
    hint.textContent = schedule ? 'أيام وساعات عمل الطبيب: ' + schedule : '';
  }

  modal.classList.remove('hidden');
  modal.classList.add('flex');

  /* Prefill the patient's own details from the session. */
  const session = Shifa.auth.getUser();
  if (session) {
    const nameField = document.getElementById('booking-patient-name');
    const phoneField = document.getElementById('booking-phone');
    if (nameField && !nameField.value) nameField.value = session.fullName || '';
    if (phoneField && !phoneField.value) phoneField.value = session.phone || '';
  }

  const firstField = document.getElementById('booking-patient-name');
  if (firstField) firstField.focus();
}

function closeBookingModal() {
  const modal = document.getElementById('booking-modal');
  if (!modal) return;
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

function submitBooking() {
  const form = document.getElementById('fast-booking-form');
  if (!form) return;

  const field = id => {
    const element = document.getElementById(id);
    return element ? element.value.trim() : '';
  };

  const patientName = field('booking-patient-name');
  const phone = field('booking-phone');
  const preferredDay = field('booking-preferred-day');
  const notes = field('booking-notes');

  if (!Shifa.auth.isAuthed()) {
    Shifa.ui.toast('يجب تسجيل الدخول لحجز موعد.');
    Shifa.auth.redirectToLogin();
    return;
  }
  if (!bookingDoctorId) {
    Shifa.ui.toast('تعذّر تحديد الطبيب. أعد المحاولة من قائمة الأطباء.');
    return;
  }
  if (!patientName) {
    Shifa.ui.toast('يرجى إدخال اسم المريض.');
    return;
  }
  if (!Shifa.validate.phone(phone)) {
    Shifa.ui.toast('رقم الهاتف يجب أن يتكون من 10 أرقام ويبدأ بـ 05.');
    return;
  }
  if (!preferredDay) {
    Shifa.ui.toast('يرجى اختيار تاريخ الموعد.');
    return;
  }

  /* The date input hands back YYYY-MM-DD; parse it as local time so the
     weekday check does not drift across the UTC boundary. */
  const parts = preferredDay.split('-');
  const picked = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (isNaN(picked.getTime()) || picked < today) {
    Shifa.ui.toast('لا يمكن اختيار تاريخ في الماضي.');
    return;
  }

  /* A soft check only — the doctor's schedule is free text on the API, so
     a mismatch is a warning the patient can override, not a hard block. */
  if (bookingDoctor && bookingDoctor.workDays) {
    const weekday = BOOKING_WEEKDAYS_AR[picked.getDay()];
    const worksThatDay = String(bookingDoctor.workDays).indexOf(weekday) !== -1;
    if (!worksThatDay && !window.confirm(
      'الطبيب لا يعمل يوم ' + weekday + ' حسب جدوله (' + bookingDoctor.workDays + ').\nهل تريد إرسال الطلب على أي حال؟')) {
      return;
    }
  }

  const submitButton = form.querySelector('button[type="submit"], button:not([type])');
  const done = Shifa.ui.busy(submitButton, 'جارٍ الحجز…');

  Shifa.api.appointments.book({
    doctorId: Number(bookingDoctorId),
    patientName: patientName,
    phone: phone,
    preferredDay: preferredDay,
    notes: notes
  })
    .then(response => {
      done();

      /* The API has no endpoint to list a patient's appointments, so the
         local notification store stays the source for reminders. */
      const doctor = document.getElementById('modal-doctor-name');
      const specialty = document.getElementById('modal-doctor-specialty');
      const appointment = createAppointmentFromBooking({
        patientName: patientName,
        doctor: doctor ? doctor.textContent.trim() : '',
        specialty: specialty ? specialty.textContent.trim() : '',
        preferredDay: preferredDay,
        type: 'clinic'
      });
      sendBookingConfirmation(appointment);

      closeBookingModal();
      form.reset();
      bookingDoctorId = null;
      bookingDoctor = null;

      const message = Shifa.pick(response || {}, 'message') || 'تم تأكيد الموعد وإرسال إشعار الحجز والتذكير.';
      const toast = document.getElementById('booking-toast');
      if (toast) {
        const toastText = toast.querySelector('span:last-child');
        if (toastText) toastText.textContent = message;
        toast.classList.remove('hidden');
        toast.classList.add('flex');
        setTimeout(() => {
          toast.classList.add('hidden');
          toast.classList.remove('flex');
        }, 4500);
      } else {
        Shifa.ui.toast(message);
      }
    })
    .catch(error => {
      done();

      /* Booking is restricted to patient accounts; say so plainly rather
         than showing the generic permission error. */
      if (error.status === 403) {
        Shifa.ui.toast('حجز المواعيد متاح لحسابات المرضى فقط. سجّل الدخول بحساب مريض.');
        return;
      }
      if (error.status === 401) {
        Shifa.ui.toast('انتهت صلاحية الجلسة. يرجى تسجيل الدخول مجدداً.');
        Shifa.auth.redirectToLogin();
        return;
      }
      Shifa.ui.toast(error.message);
    });
}


/* --------------------------------------------------------------------
   SECTION 4: Doctor profile page logic (doctor-profile.html)

   The page used to show one hardcoded doctor. It now reads ?id= and
   fills the [data-doctor-field] hooks from GET /api/doctors/{id}.
   -------------------------------------------------------------------- */

if (document.querySelector('[data-doctor-field="name"]')) {

  let profileDoctor = null;

  function setProfileField(field, value) {
    const node = document.querySelector('[data-doctor-field="' + field + '"]');
    if (!node || value === undefined || value === null || value === '') return;
    node.textContent = value;
  }

  function loadDoctorProfile() {
    const id = Shifa.queryParam('id');

    if (!id) {
      /* Reached without an id — send them back to pick a doctor. */
      Shifa.ui.toast('لم يتم تحديد الطبيب. اختر طبيباً من صفحة البحث.');
      return;
    }

    Shifa.api.doctors.get(id)
      .then(response => {
        const doctor = normalizeDoctor(Shifa.toItem(response));
        if (!doctor) return;
        profileDoctor = doctor;

        document.title = doctor.name + ' | شفاء';

        setProfileField('name', doctor.name);
        setProfileField('specialization', doctor.specialization);
        setProfileField('facility', doctor.facilityName);
        setProfileField('workHours', doctor.workHours);
        setProfileField('workDays', doctor.workDays);

        if (doctor.experience) setProfileField('experience', '+' + doctor.experience + ' عاماً');
        if (doctor.rating) setProfileField('rating', doctor.rating.toFixed(1));
        if (doctor.reviewsCount) {
          setProfileField('reviewsCount', '(' + doctor.reviewsCount + ' تقييماً)');
        }

        const place = [doctor.facilityName, Shifa.geo.label(doctor.area)]
          .filter(Boolean).join(' - ');
        setProfileField('location', place);

        const image = document.querySelector('[data-doctor-field="image"]');
        if (image && doctor.image) image.src = doctor.image;

        const phone = document.querySelector('[data-doctor-field="phone"]');
        if (phone && doctor.phone) {
          phone.textContent = doctor.phone;
          phone.setAttribute('href', 'tel:' + doctor.phone);
        }

        const bio = document.querySelector('[data-doctor-field="bio"]');
        if (bio && doctor.bio) {
          bio.innerHTML = '<p class="font-body-md text-body-md text-text-body leading-relaxed">' +
            Shifa.ui.escape(doctor.bio) + '</p>';
        }
      })
      .catch(error => {
        Shifa.ui.toast(error.message);
        if (error.status === 401) Shifa.auth.redirectToLogin();
      });
  }

  const bookButton = document.getElementById('profile-book-btn');
  if (bookButton) {
    bookButton.addEventListener('click', function () {
      if (!profileDoctor) return;
      openBookingModal(profileDoctor.id, profileDoctor.name, profileDoctor.specialization, profileDoctor);
    });
  }

  document.addEventListener('DOMContentLoaded', loadDoctorProfile);
  if (document.readyState !== 'loading') loadDoctorProfile();
}


/* The day-and-slot picker that used to live here (selectType / selectDay /
   selectSlot / handleBookingFlow) targeted markup that no longer exists in
   doctor-profile.html, so it was removed. Booking goes through the modal:
   openBookingModal() -> submitBooking() -> POST /api/appointments/book.
   The API models availability as two free-text strings (workDays /
   workHours) and exposes no slot endpoint, so there is nothing to pick from.
   TODO(api): a real slot picker needs an availability endpoint. */

/* --------------------------------------------------------------------
   SECTION 5: Facility search + details (facility-search.html,
   facility-details.html)

   Both pages were entirely hardcoded, and facility-search shipped its own
   inline filter script that only hid DOM nodes. Cards now come from
   GET /api/facilities/search and the detail page reads ?id=.
   -------------------------------------------------------------------- */

function normalizeFacility(raw) {
  if (!raw) return null;

  /* Services come back either as strings or as {id,name,status} objects. */
  const rawServices = Shifa.pick(raw, 'services', 'facilityServices') || [];
  const services = (Array.isArray(rawServices) ? rawServices : []).map(service => {
    if (typeof service === 'string') return { id: null, name: service, status: '' };
    return {
      id: Shifa.pick(service, 'id', 'serviceId'),
      name: Shifa.pick(service, 'name', 'serviceName') || '',
      status: Shifa.pick(service, 'status') || ''
    };
  }).filter(service => service.name);

  return {
    id: Shifa.pick(raw, 'id', 'facilityId'),
    name: Shifa.pick(raw, 'name', 'facilityName') || 'منشأة صحية',
    type: Shifa.pick(raw, 'type', 'facilityType') || '',
    address: Shifa.pick(raw, 'address', 'location') || '',
    phone: Shifa.pick(raw, 'phone', 'phoneNumber') || '',
    workingHours: Shifa.pick(raw, 'workingHours', 'workHours') || '',
    emergency: !!Shifa.pick(raw, 'emergencyStatus', 'hasEmergency', 'isEmergency'),
    status: Shifa.pick(raw, 'status') || '',
    rating: Number(Shifa.pick(raw, 'rating', 'averageRating')) || 0,
    reviewsCount: Number(Shifa.pick(raw, 'reviewsCount', 'reviewCount')) || 0,
    area: Shifa.pick(raw, 'area', 'city', 'governorate') || '',
    image: Shifa.pick(raw, 'imageUrl', 'photoUrl', 'image') || '',
    services: services
  };
}

/* The page's select uses short slugs; the API stores free text. */
const FACILITY_TYPE_LABELS = {
  gov: 'مستشفى حكومي',
  complex: 'مجمع طبي',
  clinic: 'عيادة تخصصية',
  field: 'مستشفى ميداني',
  phc: 'مركز رعاية أولية'
};

function facilityTypeLabel(type) {
  if (!type) return '';
  const key = String(type).trim().toLowerCase();
  return FACILITY_TYPE_LABELS[key] || type;
}


/* ---- facility-search.html ---------------------------------------- */

if (document.getElementById('facilities-container')) {

  let facilityResults = [];
  let facilityFilterTimer = null;

  const facilitiesContainer = document.getElementById('facilities-container');
  const facilitiesCount = document.getElementById('results-count');
  const facilitiesEmpty = document.getElementById('no-results-box');

  function readFacilityFilters() {
    const value = id => {
      const element = document.getElementById(id);
      return element ? element.value.trim() : '';
    };
    return {
      search: value('search-input'),
      type: value('facility-type'),
      service: value('service-type'),
      location: value('location-select')
    };
  }

  function filterFacilitiesLocally(list, filters) {
    return list.filter(facility => {
      if (filters.search) {
        const haystack = (facility.name + ' ' + facility.address + ' ' +
                          facility.type + ' ' +
                          facility.services.map(s => s.name).join(' ')).toLowerCase();
        if (haystack.indexOf(filters.search.toLowerCase()) === -1) return false;
      }
      if (filters.type) {
        const wanted = facilityTypeLabel(filters.type).toLowerCase();
        const actual = String(facility.type).toLowerCase();
        if (actual && actual.indexOf(wanted) === -1 &&
            actual.indexOf(String(filters.type).toLowerCase()) === -1) return false;
      }
      if (filters.location) {
        const wanted = Shifa.geo.normalize(filters.location);
        const actual = Shifa.geo.normalize(facility.area) ||
                       Shifa.geo.normalize(facility.address);
        if (wanted && actual && wanted !== actual) return false;
      }
      if (filters.service) {
        const names = facility.services.map(s => s.name.toLowerCase()).join(' ');
        if (names && names.indexOf(String(filters.service).toLowerCase()) === -1) return false;
      }
      return true;
    });
  }

  function facilityCardHtml(facility) {
    const esc = Shifa.ui.escape;
    const detailHref = facility.id != null
      ? 'facility-details.html?id=' + encodeURIComponent(facility.id)
      : 'facility-details.html';

    const ratingBlock = facility.rating
      ? '<div class="flex items-center gap-1 bg-surface-card/90 text-text-body px-2 py-0.5 rounded-md text-label-sm font-label-sm">' +
          '<span class="material-symbols-outlined text-state-warning text-[16px]">star</span>' +
          '<span>' + esc(facility.rating.toFixed(1)) + '</span>' +
          (facility.reviewsCount
            ? '<span class="text-text-muted">(' + esc(facility.reviewsCount) + ')</span>'
            : '') +
        '</div>'
      : '';

    const serviceTags = facility.services.slice(0, 4).map(service =>
      '<span class="px-space-2xs py-0.5 rounded bg-surface-container text-on-surface-variant font-label-sm text-label-sm">' +
        esc(service.name) + '</span>').join('');
    const extraServices = facility.services.length > 4
      ? '<span class="px-space-2xs py-0.5 rounded bg-surface-container text-on-surface-variant font-label-sm text-label-sm">+' +
          (facility.services.length - 4) + ' أقسام</span>'
      : '';

    const hero = facility.image
      ? '<img class="w-full h-full object-cover" alt="" src="' + esc(facility.image) + '"/>'
      : '<div class="w-full h-full bg-gradient-to-br from-primary-container to-secondary-container"></div>';

    return '' +
      '<article class="facility-card bg-surface-card rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between"' +
        ' data-facility-id="' + esc(facility.id == null ? '' : facility.id) + '">' +
        '<div>' +
          '<div class="relative h-48 w-full bg-surface-container overflow-hidden">' +
            hero +
            '<div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>' +
            (facility.type
              ? '<div class="absolute top-3 right-3 flex items-center gap-space-2xs">' +
                  '<span class="px-space-xs py-1 rounded-full bg-surface-card/95 text-text-heading font-label-sm text-label-sm backdrop-blur-sm shadow-sm">' +
                    esc(facilityTypeLabel(facility.type)) + '</span></div>'
              : '') +
            (facility.emergency
              ? '<div class="absolute top-3 left-3">' +
                  '<span class="inline-flex items-center gap-space-3xs px-space-xs py-1 rounded-full bg-state-success text-on-primary font-label-sm text-label-sm shadow-sm">' +
                    '<span class="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>طوارئ مفتوحة 24/7</span></div>'
              : '') +
            '<div class="absolute bottom-3 right-3 left-3 flex justify-between items-end text-white">' +
              '<div><h3 class="font-headline-md text-headline-md leading-tight text-white">' +
                esc(facility.name) + '</h3></div>' +
              ratingBlock +
            '</div>' +
          '</div>' +
          '<div class="p-space-md flex flex-col gap-space-sm">' +
            (facility.address
              ? '<div class="flex items-center gap-space-2xs text-text-muted font-body-sm text-body-sm">' +
                  '<span class="material-symbols-outlined text-text-primary text-[18px]">location_on</span>' +
                  '<span>' + esc(facility.address) + '</span></div>'
              : '') +
            (facility.workingHours
              ? '<div class="flex items-center gap-space-2xs text-text-muted font-body-sm text-body-sm">' +
                  '<span class="material-symbols-outlined text-text-primary text-[18px]">schedule</span>' +
                  '<span>' + esc(facility.workingHours) + '</span></div>'
              : '') +
            (serviceTags
              ? '<div><span class="font-label-sm text-label-sm text-text-muted mb-space-2xs block">الخدمات والأقسام المتاحة:</span>' +
                  '<div class="flex flex-wrap gap-space-3xs">' + serviceTags + extraServices + '</div></div>'
              : '') +
          '</div>' +
        '</div>' +
        '<div class="p-space-md pt-0 flex items-center gap-space-2xs">' +
          '<a class="flex-1 py-space-xs px-space-sm rounded-lg bg-primary-container hover:bg-text-heading text-on-primary font-label-md text-label-md flex items-center justify-center gap-space-3xs shadow-sm transition-colors"' +
            ' href="' + esc(detailHref) + '">' +
            '<span>عرض التفاصيل</span>' +
            '<span class="material-symbols-outlined text-[18px]">arrow_back</span>' +
          '</a>' +
          (facility.phone
            ? '<a aria-label="الاتصال بالاستقبال" title="الاتصال بالاستقبال" href="tel:' + esc(facility.phone) + '"' +
                ' class="w-10 h-10 rounded-lg bg-surface-container-low hover:bg-surface-container text-text-primary flex items-center justify-center transition-colors">' +
                '<span class="material-symbols-outlined text-[20px]">call</span></a>'
            : '') +
        '</div>' +
      '</article>';
  }

  function renderFacilities(list) {
    if (facilitiesEmpty) facilitiesEmpty.classList.add('hidden');

    if (!list.length) {
      facilitiesContainer.innerHTML = '';
      if (facilitiesEmpty) {
        facilitiesEmpty.classList.remove('hidden');
      } else {
        Shifa.ui.empty(facilitiesContainer, 'لا توجد منشآت مطابقة');
      }
      if (facilitiesCount) facilitiesCount.textContent = '0 منشآت';
      return;
    }

    facilitiesContainer.innerHTML = list.map(facilityCardHtml).join('');
    if (facilitiesCount) {
      facilitiesCount.textContent = list.length + ' ' +
        (list.length === 1 ? 'منشأة' : 'منشآت');
    }
  }

  function loadFacilities() {
    const filters = readFacilityFilters();

    Shifa.ui.skeleton(facilitiesContainer, 6);
    if (facilitiesCount) facilitiesCount.textContent = 'جارٍ التحميل…';
    if (facilitiesEmpty) facilitiesEmpty.classList.add('hidden');

    Shifa.api.facilities.search({
      name: filters.search,
      type: filters.type,
      service: filters.service,
      area: Shifa.geo.normalize(filters.location) || filters.location
    })
      .then(response => {
        facilityResults = Shifa.toList(response).map(normalizeFacility).filter(Boolean);
        renderFacilities(filterFacilitiesLocally(facilityResults, filters));
      })
      .catch(error => {
        if (facilitiesCount) facilitiesCount.textContent = '';
        Shifa.ui.failure(facilitiesContainer, error, loadFacilities);
      });
  }

  function filterFacilities() {
    clearTimeout(facilityFilterTimer);
    facilityFilterTimer = setTimeout(loadFacilities, 300);
  }

  window.filterFacilities = filterFacilities;

  /* The page's own inline script used to wire these; it has been removed. */
  document.addEventListener('DOMContentLoaded', function () {
    ['search-input', 'facility-type', 'service-type', 'location-select'].forEach(id => {
      const element = document.getElementById(id);
      if (!element) return;
      element.addEventListener(element.tagName === 'SELECT' ? 'change' : 'input', filterFacilities);
    });

    const searchBtn = document.getElementById('search-btn');
    if (searchBtn) searchBtn.addEventListener('click', loadFacilities);

    const resetBtn = document.getElementById('reset-filters');
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        ['search-input', 'facility-type', 'service-type', 'location-select'].forEach(id => {
          const element = document.getElementById(id);
          if (element) element.value = '';
        });
        loadFacilities();
      });
    }

    /* The operational-status chips never filtered anything; they only
       swap their own styling, so that behaviour is preserved as-is. */
    document.querySelectorAll('.filter-chip').forEach(chip => {
      chip.addEventListener('click', function () {
        document.querySelectorAll('.filter-chip').forEach(other => other.classList.remove('is-active'));
        chip.classList.add('is-active');
      });
    });

    loadFacilities();
  });
}


/* ---- facility-details.html --------------------------------------- */

if (document.querySelector('[data-facility-field="name"]')) {

  function setFacilityField(field, value) {
    const node = document.querySelector('[data-facility-field="' + field + '"]');
    if (!node || value === undefined || value === null || value === '') return;
    node.textContent = value;
  }

  function renderFacilityServices(services) {
    const grid = document.querySelector('[data-facility-field="services"]');
    if (!grid) return;

    if (!services.length) {
      grid.closest('section').classList.add('hidden');
      return;
    }

    grid.innerHTML = services.map(service =>
      '<div class="p-space-sm rounded-xl bg-surface-subtle flex flex-col items-center text-center gap-space-2xs">' +
        '<span class="material-symbols-outlined text-display-hero-mobile text-primary">health_and_safety</span>' +
        '<span class="font-headline-sm text-label-md text-text-heading">' +
          Shifa.ui.escape(service.name) + '</span>' +
        (service.status
          ? '<span class="font-body-sm text-label-sm text-text-muted">' +
              Shifa.ui.escape(service.status) + '</span>'
          : '') +
      '</div>').join('');
  }

  /* The facility's doctors come from the doctors endpoint, matched on
     facilityId — the facility record itself does not carry them. */
  function renderFacilityDoctors(facilityId) {
    const grid = document.querySelector('[data-facility-field="doctors"]');
    if (!grid) return;

    Shifa.api.doctors.list()
      .then(response => {
        const doctors = Shifa.toList(response)
          .map(normalizeDoctor)
          .filter(doctor => doctor && String(doctor.facilityId) === String(facilityId));

        if (!doctors.length) {
          grid.closest('section').classList.add('hidden');
          return;
        }

        grid.innerHTML = doctors.slice(0, 6).map(doctor => {
          const esc = Shifa.ui.escape;
          const href = 'doctor-profile.html?id=' + encodeURIComponent(doctor.id);
          return '<div class="bg-surface-card p-space-md rounded-xl shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">' +
            '<div class="flex items-start gap-space-sm mb-space-sm">' +
              '<img class="w-16 h-16 rounded-xl object-cover" alt="" src="' +
                esc(doctor.image || DOCTOR_FALLBACK_AVATAR) + '"/>' +
              '<div class="flex flex-col">' +
                '<span class="font-headline-sm text-headline-sm text-text-heading">' + esc(doctor.name) + '</span>' +
                '<span class="font-body-sm text-body-sm text-text-muted">' + esc(doctor.specialization) + '</span>' +
                (doctor.experience
                  ? '<span class="font-label-sm text-label-sm text-text-muted mt-1">خبرة ' +
                      esc(doctor.experience) + ' عاماً</span>'
                  : '') +
              '</div>' +
            '</div>' +
            '<a class="w-full py-space-2xs rounded-lg bg-primary-container text-on-primary font-label-md text-label-md flex items-center justify-center transition-colors hover:bg-text-heading"' +
              ' href="' + esc(href) + '">حجز موعد عيادة</a>' +
          '</div>';
        }).join('');
      })
      .catch(() => {
        grid.closest('section').classList.add('hidden');
      });
  }

  function loadFacilityDetails() {
    /* Sections with no endpoint behind them are hidden rather than left
       showing invented figures. TODO(api): facility capacity endpoint. */
    document.querySelectorAll('[data-shifa-unbacked]').forEach(node => {
      node.classList.add('hidden');
    });

    const id = Shifa.queryParam('id');
    if (!id) {
      Shifa.ui.toast('لم يتم تحديد المنشأة. اخترها من صفحة البحث.');
      return;
    }

    Shifa.api.facilities.get(id)
      .then(response => {
        const facility = normalizeFacility(Shifa.toItem(response));
        if (!facility) return;

        document.title = facility.name + ' | شفاء';

        setFacilityField('name', facility.name);
        setFacilityField('type', facilityTypeLabel(facility.type));
        setFacilityField('address', facility.address);
        setFacilityField('description', facility.workingHours
          ? 'مواعيد العمل: ' + facility.workingHours
          : '');
        setFacilityField('status', facility.status ||
          (facility.emergency ? 'جاهزية الاستقبال نشطة' : ''));

        if (facility.rating) setFacilityField('rating', facility.rating.toFixed(1));
        if (facility.reviewsCount) {
          setFacilityField('reviewsCount', '(' + facility.reviewsCount + ' تقييم)');
        }

        const phoneLink = document.querySelector('[data-facility-field="phoneLink"]');
        if (phoneLink && facility.phone) {
          phoneLink.setAttribute('href', 'tel:' + facility.phone);
        }

        renderFacilityServices(facility.services);
        renderFacilityDoctors(facility.id);
      })
      .catch(error => {
        Shifa.ui.toast(error.message);
        if (error.status === 401) Shifa.auth.redirectToLogin();
      });
  }

  document.addEventListener('DOMContentLoaded', loadFacilityDetails);
  if (document.readyState !== 'loading') loadFacilityDetails();
}




/* --------------------------------------------------------------------
   SECTION 6: Pharmacies and medicines

   pharmacy-directory.html  -> GET /api/pharmacies/search   (browse pharmacies)
   pharmacy-details.html    -> GET /api/pharmacies/{id}
   pharmacy-search.html     -> GET /api/medicines/search    (find a medicine)
   medicine-details.html    -> GET /api/medicines/{id}

   /api/medicines/search is the only endpoint in the API that documents
   its query parameters: name, area, category.
   -------------------------------------------------------------------- */

function normalizePharmacy(raw) {
  if (!raw) return null;
  return {
    id: Shifa.pick(raw, 'id', 'pharmacyId'),
    name: Shifa.pick(raw, 'name', 'pharmacyName') || 'صيدلية',
    address: Shifa.pick(raw, 'address', 'location') || '',
    phone: Shifa.pick(raw, 'phone', 'phoneNumber') || '',
    workingHours: Shifa.pick(raw, 'workingHours', 'workHours') || '',
    status: Shifa.pick(raw, 'status') || '',
    governmentApproved: !!Shifa.pick(raw, 'isGovernmentApproved', 'governmentApproved'),
    acceptsInsurance: !!Shifa.pick(raw, 'acceptsInsurance'),
    hasColdChain: !!Shifa.pick(raw, 'hasColdChain'),
    rating: Number(Shifa.pick(raw, 'rating', 'averageRating')) || 0,
    reviewsCount: Number(Shifa.pick(raw, 'reviewsCount', 'reviewCount')) || 0,
    area: Shifa.pick(raw, 'area', 'city', 'governorate') || '',
    latitude: Shifa.pick(raw, 'latitude'),
    longitude: Shifa.pick(raw, 'longitude')
  };
}

function normalizeMedicine(raw) {
  if (!raw) return null;
  return {
    id: Shifa.pick(raw, 'id', 'medicineId'),
    name: Shifa.pick(raw, 'name', 'medicineName', 'tradeName') || 'دواء',
    scientificName: Shifa.pick(raw, 'scientificName', 'genericName') || '',
    category: Shifa.pick(raw, 'category') || '',
    description: Shifa.pick(raw, 'description') || '',
    dosage: Shifa.pick(raw, 'dosage') || '',
    atcCode: Shifa.pick(raw, 'atcCode') || '',
    isCritical: !!Shifa.pick(raw, 'isCritical'),
    packageInfo: Shifa.pick(raw, 'packageInfo') || '',
    storageConditions: Shifa.pick(raw, 'storageConditions') || '',
    manufacturer: Shifa.pick(raw, 'manufacturer') || '',
    requiresColdChain: !!Shifa.pick(raw, 'requiresColdChain'),
    stocks: normalizeStocks(raw)
  };
}

/* A medicine may arrive with the pharmacies that stock it attached under
   any of several names; the fields themselves follow AddPharmacyStockDto. */
function normalizeStocks(raw) {
  const list = Shifa.pick(raw, 'pharmacies', 'stocks', 'pharmacyStocks', 'availability');
  if (!Array.isArray(list)) return [];
  return list.map(entry => ({
    pharmacyId: Shifa.pick(entry, 'pharmacyId', 'id'),
    pharmacyName: Shifa.pick(entry, 'pharmacyName', 'name') || '',
    medicineName: Shifa.pick(entry, 'medicineName', 'medicine') || '',
    address: Shifa.pick(entry, 'address', 'location') || '',
    phone: Shifa.pick(entry, 'phone', 'phoneNumber') || '',
    area: Shifa.pick(entry, 'area', 'city', 'governorate') || '',
    quantity: Number(Shifa.pick(entry, 'quantity')) || 0,
    unit: Shifa.pick(entry, 'unit') || '',
    availability: Shifa.pick(entry, 'availability', 'stockStatus') || '',
    batchNumber: Shifa.pick(entry, 'batchNumber') || '',
    expiryDate: Shifa.pick(entry, 'expiryDate') || '',
    price: Number(Shifa.pick(entry, 'price')) || 0
  })).filter(stock => stock.pharmacyName || stock.medicineName || stock.pharmacyId != null);
}

function formatExpiry(value) {
  if (!value) return '';
  const date = new Date(value);
  if (isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('ar', { year: 'numeric', month: 'long' }).format(date);
}

function stockTone(stock) {
  const text = String(stock.availability || '').toLowerCase();
  if (stock.quantity === 0 || text.indexOf('out') !== -1 || text.indexOf('نفد') !== -1) {
    return { cls: 'bg-error-container text-state-danger', label: stock.availability || 'نفدت الكمية' };
  }
  if (stock.quantity > 0 && stock.quantity <= 15) {
    return { cls: 'bg-state-warning-subtle text-state-warning', label: stock.availability || 'كمية محدودة' };
  }
  return { cls: 'bg-state-success-subtle text-state-success', label: stock.availability || 'متوفر' };
}


/* ---- Drug request modal -------------------------------------------
   POST /api/drugrequests is multipart: medicineName, quantity, notes and
   an optional prescription file. The page's "reserve" buttons used to
   fake this against localStorage; they now open this form. Built in JS so
   it is available on every page that has a reserve button.
   ------------------------------------------------------------------- */

function openDrugRequestModal(medicineName) {
  let modal = document.getElementById('shifa-drug-request-modal');

  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'shifa-drug-request-modal';
    modal.className = 'shifa-modal';
    modal.innerHTML =
      '<div class="shifa-modal__backdrop" data-close></div>' +
      '<div class="shifa-modal__panel" role="dialog" aria-modal="true" aria-labelledby="shifa-dr-title">' +
        '<h3 id="shifa-dr-title" class="shifa-modal__title">طلب دواء</h3>' +
        '<form id="shifa-drug-request-form" class="shifa-modal__form">' +
          '<label class="shifa-field"><span>اسم الدواء</span>' +
            '<input type="text" id="dr-medicine-name" required></label>' +
          '<label class="shifa-field"><span>الكمية المطلوبة</span>' +
            '<input type="number" id="dr-quantity" min="1" value="1" required></label>' +
          '<label class="shifa-field"><span>ملاحظات (اختياري)</span>' +
            '<textarea id="dr-notes" rows="3" placeholder="اذكر أي تفاصيل تساعد على تجهيز الطلب"></textarea></label>' +
          '<label class="shifa-field"><span>صورة الوصفة الطبية (اختياري)</span>' +
            '<input type="file" id="dr-prescription" accept="image/*,application/pdf"></label>' +
          '<div class="shifa-modal__actions">' +
            '<button type="submit" class="shifa-state__action">إرسال الطلب</button>' +
            '<button type="button" class="shifa-modal__cancel" data-close>إلغاء</button>' +
          '</div>' +
        '</form>' +
      '</div>';
    document.body.appendChild(modal);

    modal.querySelectorAll('[data-close]').forEach(node => {
      node.addEventListener('click', closeDrugRequestModal);
    });

    modal.querySelector('#shifa-drug-request-form')
      .addEventListener('submit', submitDrugRequest);
  }

  const nameField = modal.querySelector('#dr-medicine-name');
  if (nameField) nameField.value = medicineName || '';

  modal.classList.add('is-open');
}

function closeDrugRequestModal() {
  const modal = document.getElementById('shifa-drug-request-modal');
  if (modal) modal.classList.remove('is-open');
}

function submitDrugRequest(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const medicineName = form.querySelector('#dr-medicine-name').value.trim();
  const quantity = form.querySelector('#dr-quantity').value;
  const notes = form.querySelector('#dr-notes').value.trim();
  const fileInput = form.querySelector('#dr-prescription');

  if (!medicineName) {
    Shifa.ui.toast('يرجى إدخال اسم الدواء.');
    return;
  }

  const payload = new FormData();
  payload.append('medicineName', medicineName);
  payload.append('quantity', quantity || '1');
  payload.append('notes', notes);
  if (fileInput && fileInput.files && fileInput.files[0]) {
    payload.append('prescription', fileInput.files[0]);
  }

  const submitButton = form.querySelector('button[type="submit"]');
  const done = Shifa.ui.busy(submitButton, 'جارٍ الإرسال…');

  Shifa.api.drugRequests.create(payload)
    .then(response => {
      done();
      closeDrugRequestModal();
      form.reset();
      Shifa.ui.toast('تم إرسال طلب الدواء بنجاح.');

      /* Mirror it into the local notification feed so the existing
         reminder UI keeps working. */
      if (typeof createDrugRequest === 'function') {
        createDrugRequest({
          id: Shifa.pick(Shifa.toItem(response) || {}, 'id', 'requestId'),
          medicine: medicineName,
          quantity: quantity
        });
      }
    })
    .catch(error => {
      done();
      Shifa.ui.toast(error.message);
    });
}

/* Any button carrying data-medicine opens the request form. */
document.addEventListener('click', function (event) {
  const button = event.target.closest('.reserve-btn, [data-request-medicine]');
  if (!button) return;
  event.preventDefault();
  openDrugRequestModal(
    button.getAttribute('data-medicine') ||
    button.getAttribute('data-request-medicine') || ''
  );
});


/* ---- pharmacy-directory.html ------------------------------------- */

if (document.getElementById('pharmaciesList')) {

  let pharmacyResults = [];
  let pharmacyFilterTimer = null;

  const pharmaciesList = document.getElementById('pharmaciesList');
  const pharmaciesCount = document.getElementById('pharmacy-results-count');
  const pharmaciesEmpty = document.getElementById('pharmacy-no-results');

  function readPharmacyFilters() {
    const searchInput = document.getElementById('pharmacySearchInput');
    const locationSelect = document.getElementById('locationSelect');
    const activePill = document.querySelector('#filterPillsContainer .is-active, #filterPillsContainer [aria-pressed="true"]');
    return {
      search: searchInput ? searchInput.value.trim() : '',
      location: locationSelect ? locationSelect.value.trim() : '',
      tag: activePill ? (activePill.getAttribute('data-filter') || '') : ''
    };
  }

  function filterPharmaciesLocally(list, filters) {
    return list.filter(pharmacy => {
      if (filters.search) {
        const haystack = (pharmacy.name + ' ' + pharmacy.address).toLowerCase();
        if (haystack.indexOf(filters.search.toLowerCase()) === -1) return false;
      }
      if (filters.location) {
        const wanted = Shifa.geo.normalize(filters.location);
        const actual = Shifa.geo.normalize(pharmacy.area) ||
                       Shifa.geo.normalize(pharmacy.address);
        if (wanted && actual && wanted !== actual) return false;
      }
      if (filters.tag === '24h' && String(pharmacy.workingHours).indexOf('24') === -1) return false;
      return true;
    });
  }

  function pharmacyCardHtml(pharmacy) {
    const esc = Shifa.ui.escape;
    const href = pharmacy.id != null
      ? 'pharmacy-details.html?id=' + encodeURIComponent(pharmacy.id)
      : 'pharmacy-details.html';

    const badges = [];
    if (pharmacy.workingHours) {
      badges.push('<span class="px-space-2xs py-0.5 rounded-md bg-state-success-subtle text-state-success font-label-sm text-label-sm font-semibold flex items-center gap-1">' +
        '<span class="w-1.5 h-1.5 rounded-full bg-state-success"></span><span>' +
        esc(pharmacy.workingHours) + '</span></span>');
    }
    if (pharmacy.acceptsInsurance) {
      badges.push('<span class="px-space-2xs py-0.5 rounded-md bg-state-info-subtle text-state-info font-label-sm text-label-sm">يقبل التأمين</span>');
    }
    if (pharmacy.hasColdChain) {
      badges.push('<span class="px-space-2xs py-0.5 rounded-md bg-secondary-fixed text-on-secondary-fixed-variant font-label-sm text-label-sm">سلسلة تبريد</span>');
    }
    if (pharmacy.status) {
      badges.push('<span class="px-space-2xs py-0.5 rounded-md bg-surface-container-high text-text-primary font-label-sm text-label-sm">' +
        esc(pharmacy.status) + '</span>');
    }

    const ratingRow = pharmacy.rating
      ? '<div class="flex items-center gap-1">' +
          '<span class="material-symbols-outlined text-state-warning text-base">star</span>' +
          '<strong class="text-text-body font-semibold">' + esc(pharmacy.rating.toFixed(1)) + '</strong>' +
          (pharmacy.reviewsCount
            ? '<span class="text-text-muted font-label-sm text-label-sm">(' +
                esc(pharmacy.reviewsCount) + ' تقييم)</span>'
            : '') +
        '</div>'
      : '<div></div>';

    return '' +
      '<article class="pharmacy-card bg-surface-container-lowest rounded-xl p-space-md shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-space-md group"' +
        ' data-pharmacy-id="' + esc(pharmacy.id == null ? '' : pharmacy.id) + '"' +
        ' data-phone="' + esc(pharmacy.phone) + '">' +
        '<div class="flex flex-col gap-space-xs">' +
          '<div class="flex items-start justify-between gap-space-sm">' +
            '<div class="flex items-center gap-space-sm">' +
              '<div class="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center text-text-primary shrink-0">' +
                '<span class="material-symbols-outlined text-3xl">medication</span></div>' +
              '<div class="flex flex-col">' +
                '<div class="flex items-center gap-space-2xs">' +
                  '<h2 class="font-headline-md text-headline-md text-text-heading font-semibold">' +
                    esc(pharmacy.name) + '</h2>' +
                  (pharmacy.governmentApproved
                    ? '<span class="material-symbols-outlined text-text-primary text-lg" title="صيدلية معتمدة ورسمية">verified</span>'
                    : '') +
                '</div>' +
                (pharmacy.governmentApproved
                  ? '<span class="font-label-sm text-label-sm text-text-muted">معتمدة من وزارة الصحة</span>'
                  : '') +
              '</div>' +
            '</div>' +
          '</div>' +
          (pharmacy.address
            ? '<div class="flex items-start gap-space-2xs text-text-muted font-body-sm text-body-sm pt-space-3xs">' +
                '<span class="material-symbols-outlined text-base text-text-primary shrink-0 mt-0.5">location_on</span>' +
                '<span>' + esc(pharmacy.address) + '</span></div>'
            : '') +
          (badges.length
            ? '<div class="flex flex-wrap items-center gap-space-2xs pt-space-3xs">' + badges.join('') + '</div>'
            : '') +
          '<div class="flex items-center justify-between text-text-muted font-body-sm text-body-sm pt-space-3xs">' +
            ratingRow +
            (pharmacy.phone
              ? '<div class="flex items-center gap-1 text-text-primary font-label-md text-label-md" dir="ltr">' +
                  '<span class="material-symbols-outlined text-sm">call</span>' +
                  '<span>' + esc(pharmacy.phone) + '</span></div>'
              : '<div></div>') +
          '</div>' +
        '</div>' +
        '<div class="flex items-center gap-space-xs pt-space-xs">' +
          '<a class="flex-1 py-space-2xs bg-primary text-on-primary rounded-lg font-headline-sm text-headline-sm hover:bg-text-heading transition-colors flex items-center justify-center gap-space-2xs shadow-sm"' +
            ' href="' + esc(href) + '">' +
            '<span>عرض الصيدلية</span>' +
            '<span class="material-symbols-outlined text-base">arrow_back</span></a>' +
          (pharmacy.phone
            ? '<a class="call-pharmacy-btn px-space-md py-space-2xs bg-surface-subtle text-text-primary rounded-lg font-label-md text-label-md hover:bg-surface-container-high transition-colors flex items-center gap-1 shadow-sm"' +
                ' title="اتصال فوري" href="tel:' + esc(pharmacy.phone) + '">' +
                '<span class="material-symbols-outlined text-base">phone_in_talk</span>' +
                '<span>اتصال</span></a>'
            : '') +
        '</div>' +
      '</article>';
  }

  function renderPharmacies(list) {
    if (pharmaciesEmpty) pharmaciesEmpty.classList.add('hidden');

    if (!list.length) {
      pharmaciesList.innerHTML = '';
      if (pharmaciesEmpty) {
        pharmaciesEmpty.classList.remove('hidden');
      } else {
        Shifa.ui.empty(pharmaciesList, 'لا توجد صيدليات مطابقة');
      }
      if (pharmaciesCount) pharmaciesCount.textContent = '0 صيدليات';
      return;
    }

    pharmaciesList.innerHTML = list.map(pharmacyCardHtml).join('');
    if (pharmaciesCount) {
      pharmaciesCount.textContent = list.length + ' ' +
        (list.length === 1 ? 'صيدلية' : 'صيدليات');
    }
  }

  function loadPharmacies() {
    const filters = readPharmacyFilters();

    Shifa.ui.skeleton(pharmaciesList, 4);
    if (pharmaciesCount) pharmaciesCount.textContent = 'جارٍ التحميل…';
    if (pharmaciesEmpty) pharmaciesEmpty.classList.add('hidden');

    Shifa.api.pharmacies.search({
      name: filters.search,
      area: Shifa.geo.normalize(filters.location) || filters.location
    })
      .then(response => {
        pharmacyResults = Shifa.toList(response).map(normalizePharmacy).filter(Boolean);
        renderPharmacies(filterPharmaciesLocally(pharmacyResults, filters));
      })
      .catch(error => {
        if (pharmaciesCount) pharmaciesCount.textContent = '';
        Shifa.ui.failure(pharmaciesList, error, loadPharmacies);
      });
  }

  function filterPharmacies() {
    clearTimeout(pharmacyFilterTimer);
    pharmacyFilterTimer = setTimeout(loadPharmacies, 300);
  }

  window.filterPharmacies = filterPharmacies;

  document.addEventListener('DOMContentLoaded', function () {
    const searchInput = document.getElementById('pharmacySearchInput');
    if (searchInput) searchInput.addEventListener('input', filterPharmacies);

    const locationSelect = document.getElementById('locationSelect');
    if (locationSelect) locationSelect.addEventListener('change', filterPharmacies);

    const executeBtn = document.getElementById('executeSearchBtn');
    if (executeBtn) executeBtn.addEventListener('click', loadPharmacies);

    const resetBtn = document.getElementById('resetFiltersBtn');
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        if (searchInput) searchInput.value = '';
        if (locationSelect) locationSelect.value = '';
        loadPharmacies();
      });
    }

    document.querySelectorAll('#filterPillsContainer [data-filter]').forEach(pill => {
      pill.addEventListener('click', function () {
        document.querySelectorAll('#filterPillsContainer [data-filter]')
          .forEach(other => other.classList.remove('is-active'));
        pill.classList.add('is-active');
        loadPharmacies();
      });
    });

    loadPharmacies();
  });
}


/* ---- pharmacy-details.html --------------------------------------- */

if (document.querySelector('[data-pharmacy-field="name"]')) {

  function setPharmacyField(field, value) {
    const node = document.querySelector('[data-pharmacy-field="' + field + '"]');
    if (!node || value === undefined || value === null || value === '') return;
    node.textContent = value;
  }

  function loadPharmacyDetails() {
    document.querySelectorAll('[data-shifa-unbacked]').forEach(node => {
      node.classList.add('hidden');
    });

    const id = Shifa.queryParam('id');
    if (!id) {
      Shifa.ui.toast('لم يتم تحديد الصيدلية. اخترها من دليل الصيدليات.');
      return;
    }

    Shifa.api.pharmacies.get(id)
      .then(response => {
        const item = Shifa.toItem(response);
        const pharmacy = normalizePharmacy(item);
        if (!pharmacy) return;

        document.title = pharmacy.name + ' | شفاء';

        setPharmacyField('name', pharmacy.name);
        setPharmacyField('address', pharmacy.address);
        setPharmacyField('workingHours', pharmacy.workingHours);
        setPharmacyField('status', pharmacy.status);
        if (pharmacy.rating) setPharmacyField('rating', pharmacy.rating.toFixed(1));
        if (pharmacy.reviewsCount) {
          setPharmacyField('reviewsCount', '(' + pharmacy.reviewsCount + ' تقييم)');
        }

        /* The call button wraps an icon, so only its href changes; the
           number itself goes into the nested text hook. */
        const phoneLink = document.querySelector('[data-pharmacy-field="phoneLink"]');
        if (phoneLink && pharmacy.phone) {
          phoneLink.setAttribute('href', 'tel:' + pharmacy.phone);
        }
        setPharmacyField('phone', pharmacy.phone);

        renderPharmacyStock(normalizeStocks(item));
      })
      .catch(error => {
        Shifa.ui.toast(error.message);
        if (error.status === 401) Shifa.auth.redirectToLogin();
      });
  }

  function renderPharmacyStock(stocks) {
    const list = document.querySelector('[data-pharmacy-field="medicines"]');
    if (!list) return;

    if (!stocks.length) {
      Shifa.ui.empty(list, 'لا توجد أدوية مسجّلة لهذه الصيدلية حالياً');
      return;
    }

    const esc = Shifa.ui.escape;
    list.innerHTML = stocks.map(stock => {
      const tone = stockTone(stock);
      const name = stock.medicineName || stock.pharmacyName || 'دواء';
      return '<div class="flex items-center justify-between gap-space-sm p-space-sm rounded-xl bg-surface-subtle">' +
        '<div class="flex flex-col">' +
          '<span class="font-headline-sm text-text-heading">' + esc(name) + '</span>' +
          '<span class="' + tone.cls + ' inline-flex w-fit mt-1 px-2 py-0.5 rounded-md font-label-sm text-label-sm">' +
            esc(tone.label) + (stock.quantity ? ' (' + esc(stock.quantity) + ' ' + esc(stock.unit || 'وحدة') + ')' : '') +
          '</span>' +
        '</div>' +
        (stock.price
          ? '<span class="font-headline-sm text-text-primary" dir="ltr">' + esc(stock.price.toFixed(2)) + ' ₪</span>'
          : '') +
      '</div>';
    }).join('');
  }

  document.addEventListener('DOMContentLoaded', loadPharmacyDetails);
  if (document.readyState !== 'loading') loadPharmacyDetails();
}


/* ---- pharmacy-search.html (find a medicine across pharmacies) ----- */

if (document.getElementById('medicine-results-list')) {

  let medicineResults = [];
  let medicineFilterTimer = null;

  const medicineList = document.getElementById('medicine-results-list');
  const medicineCount = document.getElementById('medicine-results-count');
  const medicineEmpty = document.getElementById('medicine-no-results');

  function readMedicineFilters() {
    const query = document.getElementById('medicineQuery');
    const gov = document.getElementById('governorate-select');
    const form = document.getElementById('dosage-form-select');
    return {
      name: query ? query.value.trim() : '',
      area: gov ? gov.value.trim() : '',
      category: form ? form.value.trim() : ''
    };
  }

  function medicineCardHtml(medicine) {
    const esc = Shifa.ui.escape;
    const href = medicine.id != null
      ? 'medicine-details.html?id=' + encodeURIComponent(medicine.id)
      : 'medicine-details.html';

    const stockCount = medicine.stocks.length;
    const availability = stockCount
      ? '<span class="inline-flex items-center gap-1 px-space-xs py-0.5 rounded-full bg-state-success-subtle text-state-success font-label-sm text-label-sm">' +
          '<span class="w-1.5 h-1.5 rounded-full bg-state-success"></span>متوفر في ' +
          esc(stockCount) + ' صيدلية</span>'
      : '';

    const meta = [];
    if (medicine.category) {
      meta.push('<span class="flex items-center gap-1">' +
        '<span class="material-symbols-outlined text-body-sm">category</span>' +
        esc(medicine.category) + '</span>');
    }
    if (medicine.atcCode) {
      meta.push('<span class="flex items-center gap-1" dir="ltr">ATC: ' + esc(medicine.atcCode) + '</span>');
    }
    if (medicine.requiresColdChain) {
      meta.push('<span class="flex items-center gap-1 text-state-info">' +
        '<span class="material-symbols-outlined text-body-sm">ac_unit</span>يتطلب تبريداً</span>');
    }

    const pharmacyStrip = medicine.stocks.slice(0, 3).map(stock =>
      '<div class="flex items-center gap-space-2xs">' +
        '<span class="material-symbols-outlined text-text-primary">storefront</span>' +
        '<span class="font-label-md text-label-md text-on-surface">' + esc(stock.pharmacyName) + '</span>' +
        (stock.address
          ? '<span class="font-body-sm text-body-sm text-text-muted">' + esc(stock.address) + '</span>'
          : '') +
      '</div>').join('');

    return '' +
      '<div class="medicine-card bg-surface-container-lowest rounded-xl p-space-md lg:p-space-lg shadow-sm transition-all hover:shadow-md flex flex-col gap-space-md"' +
        ' data-medicine-id="' + esc(medicine.id == null ? '' : medicine.id) + '">' +
        '<div class="flex flex-col sm:flex-row sm:items-start justify-between gap-space-sm">' +
          '<div class="flex items-start gap-space-md">' +
            '<div class="w-14 h-14 rounded-xl bg-state-success-subtle text-state-success flex items-center justify-center shrink-0">' +
              '<span class="material-symbols-outlined text-headline-xl">medication</span></div>' +
            '<div class="flex flex-col gap-space-3xs">' +
              '<div class="flex flex-wrap items-center gap-space-2xs">' +
                '<h3 class="font-headline-lg text-headline-lg text-text-heading">' + esc(medicine.name) + '</h3>' +
                availability +
                (medicine.isCritical
                  ? '<span class="px-space-xs py-0.5 rounded-full bg-error-container text-state-danger font-label-sm text-label-sm">دواء حرج</span>'
                  : '') +
                '<a class="inline-flex items-center gap-1 px-space-xs py-0.5 rounded-full bg-surface-container-high text-text-primary hover:bg-surface-container-highest font-label-sm text-label-sm transition-colors"' +
                  ' href="' + esc(href) + '">' +
                  '<span class="material-symbols-outlined text-[14px]">visibility</span>' +
                  '<span>عرض كل نقاط التوفر</span></a>' +
              '</div>' +
              (medicine.scientificName || medicine.packageInfo
                ? '<p class="font-body-md text-body-md text-text-muted">' +
                    (medicine.scientificName
                      ? 'الاسم العلمي: <span class="text-text-body font-semibold">' +
                          esc(medicine.scientificName) + '</span>'
                      : '') +
                    (medicine.packageInfo ? ' • ' + esc(medicine.packageInfo) : '') +
                  '</p>'
                : '') +
              (meta.length
                ? '<div class="flex items-center gap-space-sm text-text-muted font-label-sm text-label-sm flex-wrap">' +
                    meta.join('<span>•</span>') + '</div>'
                : '') +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="bg-surface-subtle p-space-sm rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-space-sm">' +
          '<div class="flex flex-col sm:flex-row sm:items-center gap-space-md">' +
            (pharmacyStrip || '<span class="font-body-sm text-body-sm text-text-muted">لا توجد نقاط توفر مسجّلة بعد</span>') +
          '</div>' +
          '<div class="flex items-center gap-space-2xs shrink-0">' +
            '<button class="reserve-btn px-space-md py-space-2xs rounded-lg bg-primary-container text-on-primary font-label-md text-label-md hover:bg-text-heading transition-colors flex items-center gap-space-3xs"' +
              ' data-medicine="' + esc(medicine.name) + '" type="button">' +
              '<span class="material-symbols-outlined text-body-md">bookmark_added</span>' +
              '<span>طلب الدواء</span></button>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function renderMedicines(list) {
    if (medicineEmpty) medicineEmpty.classList.add('hidden');

    if (!list.length) {
      medicineList.innerHTML = '';
      if (medicineEmpty) {
        medicineEmpty.classList.remove('hidden');
      } else {
        Shifa.ui.empty(medicineList, 'لا توجد أدوية مطابقة');
      }
      if (medicineCount) medicineCount.textContent = '0 أدوية';
      return;
    }

    medicineList.innerHTML = list.map(medicineCardHtml).join('');
    if (medicineCount) {
      medicineCount.textContent = list.length + ' ' +
        (list.length === 1 ? 'دواء' : 'أدوية');
    }
  }

  function loadMedicines() {
    const filters = readMedicineFilters();

    Shifa.ui.skeleton(medicineList, 4);
    if (medicineCount) medicineCount.textContent = 'جارٍ التحميل…';
    if (medicineEmpty) medicineEmpty.classList.add('hidden');

    /* These three names are the only documented query parameters in the
       entire API, so they are passed through exactly as specified. */
    Shifa.api.medicines.search({
      name: filters.name,
      area: Shifa.geo.normalize(filters.area) || filters.area,
      category: filters.category
    })
      .then(response => {
        medicineResults = Shifa.toList(response).map(normalizeMedicine).filter(Boolean);
        renderMedicines(medicineResults);
      })
      .catch(error => {
        if (medicineCount) medicineCount.textContent = '';
        Shifa.ui.failure(medicineList, error, loadMedicines);
      });
  }

  function filterMedicines() {
    clearTimeout(medicineFilterTimer);
    medicineFilterTimer = setTimeout(loadMedicines, 300);
  }

  function sortMedicines(criteria) {
    const sorted = medicineResults.slice();
    if (criteria === 'stock') {
      sorted.sort((a, b) => b.stocks.length - a.stocks.length);
    } else if (criteria === 'name') {
      sorted.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    }
    renderMedicines(sorted);
  }

  window.filterMedicines = filterMedicines;
  window.sortMedicines = sortMedicines;

  document.addEventListener('DOMContentLoaded', function () {
    const query = document.getElementById('medicineQuery');
    if (query) query.addEventListener('input', filterMedicines);

    ['governorate-select', 'dosage-form-select'].forEach(id => {
      const element = document.getElementById(id);
      if (element) element.addEventListener('change', filterMedicines);
    });

    /* data-sort carries distance/stock/updated. Only stock maps onto a
       field the API returns; the others keep the server order. */
    document.querySelectorAll('#sort-tabs [data-sort]').forEach(button => {
      button.addEventListener('click', function () {
        document.querySelectorAll('#sort-tabs [data-sort]')
          .forEach(other => other.classList.remove('bg-primary-container', 'text-on-primary'));
        button.classList.add('bg-primary-container', 'text-on-primary');
        sortMedicines(button.getAttribute('data-sort'));
      });
    });

    loadMedicines();
  });
}


/* ---- medicine-details.html --------------------------------------- */

if (document.getElementById('pharmacy-feed-list')) {

  let medicineDetail = null;

  const feedList = document.getElementById('pharmacy-feed-list');
  const feedCount = document.getElementById('pharmacy-feed-count');
  const feedEmpty = document.getElementById('pharmacy-feed-no-results');

  function setMedicineField(field, value) {
    const node = document.querySelector('[data-medicine-field="' + field + '"]');
    if (!node || value === undefined || value === null || value === '') return;
    node.textContent = value;
  }

  function feedCardHtml(stock) {
    const esc = Shifa.ui.escape;
    const tone = stockTone(stock);

    const rows = [];
    if (stock.address) {
      rows.push('<div class="flex items-center gap-1 text-text-muted font-body-sm text-body-sm">' +
        '<span class="material-symbols-outlined text-[18px]">location_on</span>' +
        '<span>' + esc(stock.address) + '</span></div>');
    }
    if (stock.phone) {
      rows.push('<div class="flex items-center gap-1 text-text-primary font-body-sm text-body-sm" dir="ltr">' +
        '<span class="material-symbols-outlined text-[18px]">call</span>' +
        '<span>' + esc(stock.phone) + '</span></div>');
    }
    if (stock.batchNumber) {
      rows.push('<div class="font-label-sm text-label-sm text-text-muted" dir="ltr">Batch: ' +
        esc(stock.batchNumber) + '</div>');
    }
    if (stock.expiryDate) {
      rows.push('<div class="font-label-sm text-label-sm text-text-muted">تنتهي الصلاحية: ' +
        esc(formatExpiry(stock.expiryDate)) + '</div>');
    }

    return '' +
      '<article class="pharmacy-feed-card bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col gap-space-sm">' +
        '<div class="flex items-start justify-between gap-space-sm">' +
          '<div class="flex flex-col gap-1">' +
            '<span class="font-headline-md text-headline-md text-text-heading">' +
              esc(stock.pharmacyName) + '</span>' +
            '<span class="' + tone.cls + ' inline-flex w-fit px-2 py-0.5 rounded-md font-label-sm text-label-sm">' +
              esc(tone.label) + '</span>' +
          '</div>' +
          (stock.price
            ? '<span class="font-headline-sm text-text-primary" dir="ltr">' +
                esc(stock.price.toFixed(2)) + ' ₪</span>'
            : '') +
        '</div>' +
        (stock.quantity
          ? '<div class="font-label-md text-label-md text-text-body">الكمية المؤكدة: ' +
              esc(stock.quantity) + ' ' + esc(stock.unit || 'وحدة') + '</div>'
          : '') +
        rows.join('') +
        '<div class="flex items-center gap-space-2xs pt-space-2xs">' +
          '<button class="reserve-btn flex-1 py-space-2xs rounded-lg bg-primary-container text-on-primary font-label-md text-label-md hover:bg-text-heading transition-colors"' +
            ' data-medicine="' + esc(medicineDetail ? medicineDetail.name : '') + '" type="button">طلب الدواء</button>' +
          (stock.address
            ? '<a class="px-space-sm py-space-2xs rounded-lg bg-surface-container-highest text-secondary font-label-md text-label-md transition-colors"' +
                ' target="_blank" rel="noopener"' +
                ' href="https://www.google.com/maps/search/?api=1&query=' +
                  encodeURIComponent(stock.pharmacyName + ' ' + stock.address) + '">الخريطة</a>'
            : '') +
        '</div>' +
      '</article>';
  }

  function renderFeed(stocks) {
    if (feedEmpty) feedEmpty.classList.add('hidden');

    if (!stocks.length) {
      feedList.innerHTML = '';
      if (feedEmpty) {
        feedEmpty.classList.remove('hidden');
      } else {
        Shifa.ui.empty(feedList, 'لا توجد صيدليات تُسجّل توفر هذا الدواء حالياً');
      }
      if (feedCount) feedCount.textContent = '0';
      return;
    }

    feedList.innerHTML = stocks.map(feedCardHtml).join('');
    if (feedCount) feedCount.textContent = String(stocks.length);
  }

  function applyFeedFilters() {
    if (!medicineDetail) return;

    const activeGov = document.querySelector('#governorate-tabs [data-gov].is-active') ||
                      document.querySelector('#governorate-tabs [data-gov][aria-pressed="true"]');
    const activeStock = document.querySelector('#stock-status-pills [data-stock].is-active') ||
                        document.querySelector('#stock-status-pills [data-stock][aria-pressed="true"]');

    const gov = activeGov ? activeGov.getAttribute('data-gov') : 'all';
    const stockFilter = activeStock ? activeStock.getAttribute('data-stock') : 'all';

    let stocks = medicineDetail.stocks.slice();

    if (gov && gov !== 'all') {
      const wanted = Shifa.geo.normalize(gov);
      stocks = stocks.filter(stock => {
        const actual = Shifa.geo.normalize(stock.area) || Shifa.geo.normalize(stock.address);
        return !wanted || !actual || wanted === actual;
      });
    }

    if (stockFilter === 'available') stocks = stocks.filter(s => s.quantity > 15);
    else if (stockFilter === 'critical') stocks = stocks.filter(s => s.quantity > 0 && s.quantity <= 15);
    else if (stockFilter === 'out') stocks = stocks.filter(s => s.quantity === 0);

    renderFeed(stocks);
  }

  function loadMedicineDetails() {
    document.querySelectorAll('[data-shifa-unbacked]').forEach(node => {
      node.classList.add('hidden');
    });

    const id = Shifa.queryParam('id');
    if (!id) {
      Shifa.ui.toast('لم يتم تحديد الدواء. اختره من صفحة البحث.');
      Shifa.ui.empty(feedList, 'اختر دواءً من صفحة البحث لعرض نقاط التوفر');
      return;
    }

    Shifa.ui.skeleton(feedList, 3);

    Shifa.api.medicines.get(id)
      .then(response => {
        medicineDetail = normalizeMedicine(Shifa.toItem(response));
        if (!medicineDetail) return;

        document.title = medicineDetail.name + ' | شفاء';

        setMedicineField('name', medicineDetail.name);
        setMedicineField('scientificName', medicineDetail.scientificName);
        setMedicineField('category', medicineDetail.category);
        setMedicineField('atcCode', medicineDetail.atcCode);
        setMedicineField('packageInfo', medicineDetail.packageInfo);
        setMedicineField('manufacturer', medicineDetail.manufacturer);
        setMedicineField('storageConditions', medicineDetail.storageConditions);
        setMedicineField('dosage', medicineDetail.dosage);
        setMedicineField('description', medicineDetail.description);

        renderFeed(medicineDetail.stocks);
      })
      .catch(error => {
        Shifa.ui.failure(feedList, error, loadMedicineDetails);
      });
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('#governorate-tabs [data-gov]').forEach(tab => {
      tab.addEventListener('click', function () {
        document.querySelectorAll('#governorate-tabs [data-gov]')
          .forEach(other => other.classList.remove('is-active'));
        tab.classList.add('is-active');
        applyFeedFilters();
      });
    });

    document.querySelectorAll('#stock-status-pills [data-stock]').forEach(pill => {
      pill.addEventListener('click', function () {
        document.querySelectorAll('#stock-status-pills [data-stock]')
          .forEach(other => other.classList.remove('is-active'));
        pill.classList.add('is-active');
        applyFeedFilters();
      });
    });

    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) sortSelect.addEventListener('change', applyFeedFilters);

    loadMedicineDetails();
  });
}




/* --------------------------------------------------------------------
   SECTION 7: Doctor dashboard (my-profile.html)

   GET /api/doctors/me fills the form, PUT /api/doctors/me saves it.
   Both save buttons used to be pure animation — nothing was persisted
   anywhere, not even to localStorage.

   UpdateDoctorProfileRequestDto requires fullName, phone, specialization,
   licenseNumber, facilityId, workDays, workHours and
   consultationDurationMinutes. The page had no control for facilityId and
   no id on the session-duration select; both were added.
   -------------------------------------------------------------------- */

if (document.getElementById('working-hours-table')) {

  /* data-day on each .day-row is English; the API stores free text, so
     Arabic names are what get serialised into workDays. */
  const DAY_NAMES_AR = {
    sunday: 'الأحد',
    monday: 'الإثنين',
    tuesday: 'الثلاثاء',
    wednesday: 'الأربعاء',
    thursday: 'الخميس',
    friday: 'الجمعة',
    saturday: 'السبت'
  };

  function profileValue(id) {
    const element = document.getElementById(id);
    return element ? element.value.trim() : '';
  }

  function setProfileValue(id, value) {
    const element = document.getElementById(id);
    if (!element || value === undefined || value === null || value === '') return;
    element.value = value;
  }

  /* --- working hours -------------------------------------------------
     The DTO models the whole week as two strings, so the per-day table
     is flattened: every enabled day goes into workDays, and workHours
     takes the window from the first enabled row.
     TODO(api): a per-day schedule needs a structured endpoint. */

  function collectWorkDays() {
    const days = [];
    document.querySelectorAll('#working-hours-table .day-row').forEach(row => {
      const toggle = row.querySelector('.day-toggle');
      if (toggle && !toggle.checked) return;
      const key = row.getAttribute('data-day');
      const label = row.querySelector('.day-name-label');
      days.push(DAY_NAMES_AR[key] || (label ? label.textContent.trim() : key));
    });
    return days.join('، ');
  }

  function collectWorkHours() {
    const rows = document.querySelectorAll('#working-hours-table .day-row');
    for (let i = 0; i < rows.length; i++) {
      const toggle = rows[i].querySelector('.day-toggle');
      if (toggle && !toggle.checked) continue;
      const times = rows[i].querySelectorAll('.day-time-input:not(.evening-time)');
      if (times.length >= 2 && times[0].value && times[1].value) {
        return times[0].value + ' - ' + times[1].value;
      }
    }
    return '';
  }

  /* Ticks the day rows that appear in the stored workDays string. */
  function applyWorkDays(workDays) {
    if (!workDays) return;
    const stored = String(workDays);
    document.querySelectorAll('#working-hours-table .day-row').forEach(row => {
      const key = row.getAttribute('data-day');
      const arabic = DAY_NAMES_AR[key] || '';
      const enabled = (arabic && stored.indexOf(arabic) !== -1) ||
                      stored.toLowerCase().indexOf(String(key).toLowerCase()) !== -1;
      const toggle = row.querySelector('.day-toggle');
      if (toggle) {
        toggle.checked = enabled;
        /* Reuse the page's own row-state renderer so the badge and the
           disabled styling stay consistent. */
        if (typeof refreshDayRow === 'function') refreshDayRow(row);
      }
    });
  }

  function applyWorkHours(workHours) {
    if (!workHours) return;
    const match = String(workHours).match(/(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/);
    if (!match) return;
    document.querySelectorAll('#working-hours-table .day-row').forEach(row => {
      const times = row.querySelectorAll('.day-time-input:not(.evening-time)');
      if (times.length >= 2) {
        times[0].value = match[1].padStart(5, '0');
        times[1].value = match[2].padStart(5, '0');
      }
    });
  }

  /* --- facility picker ----------------------------------------------- */

  function loadFacilityOptions(selectedId) {
    const select = document.getElementById('hospital-name');
    if (!select || select.tagName !== 'SELECT') return Promise.resolve();

    return Shifa.api.facilities.list()
      .then(response => {
        const facilities = Shifa.toList(response).map(normalizeFacility).filter(Boolean);
        if (!facilities.length) {
          select.innerHTML = '<option value="">لا توجد منشآت متاحة</option>';
          return;
        }
        select.innerHTML = '<option value="">اختر المنشأة</option>' +
          facilities.map(facility =>
            '<option value="' + Shifa.ui.escape(facility.id) + '">' +
              Shifa.ui.escape(facility.name) + '</option>').join('');
        if (selectedId != null) select.value = String(selectedId);
      })
      .catch(() => {
        select.innerHTML = '<option value="">تعذّر تحميل المنشآت</option>';
      });
  }

  /* --- load ----------------------------------------------------------- */

  let currentProfile = null;

  function loadDoctorDashboard() {
    if (!Shifa.auth.isAuthed()) {
      Shifa.auth.redirectToLogin('my-profile.html');
      return;
    }

    Shifa.api.doctors.me()
      .then(response => {
        const doctor = normalizeDoctor(Shifa.toItem(response));
        if (!doctor) return;
        currentProfile = doctor;

        setProfileValue('doctor-fullname', doctor.name);
        setProfileValue('doctor-speciality', doctor.specialization);
        setProfileValue('license-number', doctor.licenseNumber);
        setProfileValue('exp-years', doctor.experience || '');
        setProfileValue('bio-textarea', doctor.bio);
        setProfileValue('phone-number', doctor.phone);
        if (doctor.durationMinutes) {
          setProfileValue('session-duration', String(doctor.durationMinutes));
        }

        applyWorkDays(doctor.workDays);
        applyWorkHours(doctor.workHours);

        /* Keep the character counter in step with the loaded bio. */
        const bio = document.getElementById('bio-textarea');
        const counter = document.getElementById('char-counter');
        if (bio && counter) counter.textContent = String(bio.value.length);

        return loadFacilityOptions(doctor.facilityId);
      })
      .catch(error => {
        Shifa.ui.toast(error.message);
        if (error.status === 401) Shifa.auth.redirectToLogin('my-profile.html');
      });
  }

  /* --- save ----------------------------------------------------------- */

  function saveDoctorDashboard(button) {
    const payload = {
      fullName: profileValue('doctor-fullname'),
      phone: profileValue('phone-number'),
      specialization: profileValue('doctor-speciality'),
      licenseNumber: profileValue('license-number'),
      yearsOfExperience: Number(profileValue('exp-years')) || 0,
      bio: profileValue('bio-textarea'),
      facilityId: Number(profileValue('hospital-name')) || 0,
      workDays: collectWorkDays(),
      workHours: collectWorkHours(),
      consultationDurationMinutes: Number(profileValue('session-duration')) || 0,
      /* No control exists for coordinates; send back what was loaded. */
      latitude: currentProfile ? currentProfile.latitude : undefined,
      longitude: currentProfile ? currentProfile.longitude : undefined
    };

    /* Fail here rather than letting the API reject a required field. */
    const missing = [];
    if (!payload.fullName) missing.push('الاسم الكامل');
    if (!payload.phone) missing.push('رقم الهاتف');
    if (!payload.specialization) missing.push('التخصص');
    if (!payload.licenseNumber) missing.push('رقم الترخيص');
    if (!payload.facilityId) missing.push('المنشأة');
    if (!payload.workDays) missing.push('أيام العمل');
    if (!payload.workHours) missing.push('ساعات العمل');
    if (!payload.consultationDurationMinutes) missing.push('مدة الكشف');

    if (missing.length) {
      Shifa.ui.toast('يرجى استكمال: ' + missing.join('، '));
      return;
    }

    if (!Shifa.validate.phone(payload.phone)) {
      Shifa.ui.toast('رقم الهاتف يجب أن يتكون من 10 أرقام ويبدأ بـ 05.');
      return;
    }

    const done = Shifa.ui.busy(button, 'جارٍ الحفظ…');

    Shifa.api.doctors.updateMe(payload)
      .then(() => {
        done();
        Shifa.auth.mergeSession({ fullName: payload.fullName, phone: payload.phone });
        Shifa.ui.toast('تم حفظ التعديلات بنجاح.');
      })
      .catch(error => {
        done();
        Shifa.ui.toast(error.message);
      });
  }

  document.addEventListener('DOMContentLoaded', function () {
    ['save-all-btn', 'save-floating-btn'].forEach(id => {
      const button = document.getElementById(id);
      if (!button) return;
      button.addEventListener('click', function (event) {
        event.preventDefault();
        saveDoctorDashboard(button);
      });
    });

    loadDoctorDashboard();
  });
}


/* --------------------------------------------------------------------
   SECTION 8: Appointment Notifications Feature
   Client-side notification component. Still localStorage-backed: the API
   exposes POST /api/appointments/book but no endpoint to list a patient's
   appointments, so this remains the store behind reminders.
   TODO(api): replace once GET /api/appointments/my exists.
   -------------------------------------------------------------------- */
(function () {
  'use strict';

  const NOTIFICATIONS_KEY = 'shifa_notifications_v1';
  const APPOINTMENTS_KEY = 'shifa_appointments_v1';
  const DRUG_REQUESTS_KEY = 'shifa_drug_requests_v1';
  let notificationPanel = null;
  let notificationsInitialized = false;

  function readStorage(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function writeStorage(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (error) {}
  }

  function getNotifications() { return readStorage(NOTIFICATIONS_KEY, []); }
  function getAppointments() { return readStorage(APPOINTMENTS_KEY, []); }
  function getDrugRequests() { return readStorage(DRUG_REQUESTS_KEY, []); }

  function saveNotifications(items) { writeStorage(NOTIFICATIONS_KEY, items); }
  function saveAppointments(items) { writeStorage(APPOINTMENTS_KEY, items); }
  function saveDrugRequests(items) { writeStorage(DRUG_REQUESTS_KEY, items); }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function formatNotificationTime(timestamp) {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('ar', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(date);
  }

  function notificationIcon(type) {
    if (type === 'confirmation') return 'event_available';
    if (type === 'reminder') return 'alarm';
    if (type === 'cancellation') return 'event_busy';
    if (type.indexOf('drug_') === 0) {
      if (type === 'drug_submitted') return 'medication';
      if (type === 'drug_review') return 'manage_search';
      if (type === 'drug_found') return 'inventory_2';
      if (type === 'drug_fulfilled') return 'task_alt';
      if (type === 'drug_rejected') return 'block';
    }
    return 'notifications';
  }

  function notificationTone(type) {
    if (type === 'confirmation') return 'success';
    if (type === 'reminder') return 'warning';
    if (type === 'cancellation') return 'danger';
    if (type === 'drug_submitted') return 'success';
    if (type === 'drug_review') return 'warning';
    if (type === 'drug_found') return 'info';
    if (type === 'drug_fulfilled') return 'success';
    if (type === 'drug_rejected') return 'danger';
    return 'info';
  }

  function createNotification(data) {
    const notifications = getNotifications();
    const item = {
      id: data.id || ('notification_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8)),
      type: data.type || 'info',
      title: data.title || 'إشعار جديد',
      message: data.message || '',
      appointmentId: data.appointmentId || null,
      drugRequestId: data.drugRequestId || null,
      createdAt: data.createdAt || new Date().toISOString(),
      read: false
    };
    notifications.unshift(item);
    saveNotifications(notifications.slice(0, 100));
    updateNotificationBadge();
    renderNotificationList();
    return item;
  }

  function hasNotificationForAppointment(appointmentId, type) {
    return getNotifications().some(function (item) {
      return item.appointmentId === appointmentId && item.type === type;
    });
  }

  function sendBookingConfirmation(appointment) {
    if (!appointment) return;
    if (!hasNotificationForAppointment(appointment.id, 'confirmation')) {
      createNotification({
        type: 'confirmation',
        title: 'تم تأكيد حجز الموعد',
        message: `تم تأكيد موعدك مع ${appointment.doctor} ${appointment.dayLabel ? 'يوم ' + appointment.dayLabel : ''}${appointment.time ? ' الساعة ' + appointment.time : ''}.`,
        appointmentId: appointment.id
      });
    }
  }

  function sendAppointmentReminder(appointment) {
    if (!appointment || appointment.status === 'cancelled') return;
    if (!hasNotificationForAppointment(appointment.id, 'reminder')) {
      createNotification({
        type: 'reminder',
        title: 'تذكير بالموعد',
        message: `لديك موعد قريب مع ${appointment.doctor}${appointment.dayLabel ? ' يوم ' + appointment.dayLabel : ''}${appointment.time ? ' الساعة ' + appointment.time : ''}.`,
        appointmentId: appointment.id
      });
    }
  }

  function sendCancellationNotification(appointment) {
    if (!appointment) return;
    createNotification({
      type: 'cancellation',
      title: 'تم إلغاء الموعد',
      message: `تم إلغاء الموعد مع ${appointment.doctor}${appointment.dayLabel ? ' يوم ' + appointment.dayLabel : ''}${appointment.time ? ' الساعة ' + appointment.time : ''}.`,
      appointmentId: appointment.id
    });
  }

  function hasNotificationForDrugRequest(requestId, type) {
    return getNotifications().some(function (item) {
      return item.drugRequestId === requestId && item.type === type;
    });
  }

  function createDrugRequest(data) {
    const request = {
      id: data.id || ('drug_request_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8)),
      medicine: data.medicine || 'الدواء المطلوب',
      pharmacy: data.pharmacy || '',
      quantity: data.quantity || 1,
      status: 'submitted',
      createdAt: new Date().toISOString()
    };
    const requests = getDrugRequests();
    requests.unshift(request);
    saveDrugRequests(requests.slice(0, 50));
    sendDrugRequestSubmitted(request);
    return request;
  }

  function sendDrugRequestNotification(request, type, title, message) {
    if (!request || hasNotificationForDrugRequest(request.id, type)) return;
    createNotification({
      type: type,
      title: title,
      message: message,
      drugRequestId: request.id
    });
  }

  function sendDrugRequestSubmitted(request) {
    sendDrugRequestNotification(request, 'drug_submitted', 'تم إرسال طلب الدواء', `تم استلام طلبك للدواء ${request.medicine}${request.pharmacy ? ' من ' + request.pharmacy : ''} بنجاح.`);
  }

  function sendDrugRequestUnderReview(request) {
    if (!request) return;
    request.status = 'under_review';
    updateDrugRequest(request);
    sendDrugRequestNotification(request, 'drug_review', 'طلب الدواء قيد المراجعة', `يجري الآن التحقق من توفر ${request.medicine} ومطابقة بيانات الطلب.`);
  }

  function sendMedicineFoundNotification(request) {
    if (!request) return;
    request.status = 'medicine_found';
    updateDrugRequest(request);
    sendDrugRequestNotification(request, 'drug_found', 'تم العثور على الدواء', `تم العثور على ${request.medicine}${request.pharmacy ? ' في ' + request.pharmacy : ''}. يمكنك متابعة الطلب من خلال المنصة.`);
  }

  function sendDrugRequestFulfilled(request) {
    if (!request) return;
    request.status = 'fulfilled';
    updateDrugRequest(request);
    sendDrugRequestNotification(request, 'drug_fulfilled', 'تم تنفيذ طلب الدواء', `تم تنفيذ طلب ${request.medicine} بنجاح. يمكنك مراجعة تفاصيل الطلب.`);
  }

  function sendDrugRequestRejected(request, reason) {
    if (!request) return;
    request.status = 'rejected';
    request.rejectionReason = reason || 'تعذر توفير الدواء حالياً.';
    updateDrugRequest(request);
    sendDrugRequestNotification(request, 'drug_rejected', 'تعذر تنفيذ طلب الدواء', `تعذر تنفيذ طلب ${request.medicine}. ${request.rejectionReason}`);
  }

  function updateDrugRequest(request) {
    const requests = getDrugRequests();
    const index = requests.findIndex(function (item) { return item.id === request.id; });
    if (index === -1) return;
    requests[index] = request;
    saveDrugRequests(requests);
  }

  function simulateDrugRequestLifecycle(request, outcome) {
    if (!request) return;
    const finalOutcome = outcome === 'rejected' ? 'rejected' : 'fulfilled';
    setTimeout(function () { sendDrugRequestUnderReview(request); }, 1500);
    if (finalOutcome === 'rejected') {
      setTimeout(function () { sendDrugRequestRejected(request, 'لم يتم العثور على الدواء ضمن الصيدليات المتاحة حالياً.'); }, 3500);
      return;
    }
    setTimeout(function () { sendMedicineFoundNotification(request); }, 3500);
    setTimeout(function () { sendDrugRequestFulfilled(request); }, 6000);
  }

  function createAppointmentFromBooking(data) {
    const preferred = String(data.preferredDay || 'أقرب موعد متاح');
    let reminderAt = Date.now() + 23 * 60 * 60 * 1000;
    let appointmentAt = Date.now() + 24 * 60 * 60 * 1000;

    if (preferred === 'خلال 3 أيام') {
      appointmentAt = Date.now() + 3 * 24 * 60 * 60 * 1000;
      reminderAt = appointmentAt - 24 * 60 * 60 * 1000;
    } else if (preferred === 'غداً') {
      appointmentAt = Date.now() + 24 * 60 * 60 * 1000;
      reminderAt = appointmentAt - 24 * 60 * 60 * 1000;
    } else if (data.time && /\d/.test(data.time)) {
      appointmentAt = Date.now() + 24 * 60 * 60 * 1000;
      reminderAt = appointmentAt - 24 * 60 * 60 * 1000;
    }

    const appointment = {
      id: 'appointment_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
      patientName: data.patientName || 'المريض',
      doctor: data.doctor || 'الطبيب',
      specialty: data.specialty || '',
      type: data.type || 'clinic',
      dayLabel: preferred,
      time: data.time || '',
      appointmentAt: new Date(appointmentAt).toISOString(),
      reminderAt: new Date(reminderAt).toISOString(),
      status: 'confirmed',
      createdAt: new Date().toISOString()
    };
    const appointments = getAppointments();
    appointments.unshift(appointment);
    saveAppointments(appointments.slice(0, 50));
    return appointment;
  }

  function cancelAppointment(appointmentId) {
    const appointments = getAppointments();
    const index = appointments.findIndex(function (item) { return item.id === appointmentId; });
    if (index === -1) return;
    const appointment = appointments[index];
    if (appointment.status === 'cancelled') return;
    appointment.status = 'cancelled';
    appointment.cancelledAt = new Date().toISOString();
    appointments[index] = appointment;
    saveAppointments(appointments);
    sendCancellationNotification(appointment);
    renderNotificationList();
    updateNotificationBadge();
  }

  function markNotificationAsRead(notificationId) {
    const notifications = getNotifications();
    const item = notifications.find(function (notification) { return notification.id === notificationId; });
    if (!item) return;
    item.read = true;
    saveNotifications(notifications);
    renderNotificationList();
    updateNotificationBadge();
  }

  function markAllNotificationsAsRead() {
    const notifications = getNotifications().map(function (item) {
      item.read = true;
      return item;
    });
    saveNotifications(notifications);
    renderNotificationList();
    updateNotificationBadge();
  }

  function checkAppointmentReminders() {
    const now = Date.now();
    getAppointments().forEach(function (appointment) {
      if (appointment.status !== 'confirmed') return;
      const reminderAt = new Date(appointment.reminderAt).getTime();
      if (!Number.isNaN(reminderAt) && now >= reminderAt) {
        sendAppointmentReminder(appointment);
      }
    });
  }

  function renderNotificationList() {
    if (!notificationPanel) return;
    const list = notificationPanel.querySelector('[data-notification-list]');
    if (!list) return;

    const notifications = getNotifications();
    const appointments = getAppointments().filter(function (item) { return item.status === 'confirmed'; });
    const drugRequests = getDrugRequests().slice(0, 10);

    const notificationMarkup = notifications.length ? notifications.map(function (item) {
      const tone = notificationTone(item.type);
      return `<button type="button" class="shifa-notification-item ${item.read ? 'is-read' : 'is-unread'}" data-read-notification="${escapeHtml(item.id)}">
        <span class="shifa-notification-icon ${tone}"><span class="material-symbols-outlined">${notificationIcon(item.type)}</span></span>
        <span class="shifa-notification-copy"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.message)}</span><small>${escapeHtml(formatNotificationTime(item.createdAt))}</small></span>
        ${item.read ? '' : '<span class="shifa-unread-dot" aria-label="غير مقروء"></span>'}
      </button>`;
    }).join('') : `<div class="shifa-empty-state"><span class="material-symbols-outlined">notifications_off</span><p>لا توجد إشعارات حالياً</p></div>`;

    const appointmentMarkup = appointments.length ? appointments.map(function (appointment) {
      return `<div class="shifa-appointment-card">
        <div><strong>${escapeHtml(appointment.doctor)}</strong><span>${escapeHtml(appointment.specialty)}</span><small>${escapeHtml(appointment.dayLabel)}${appointment.time ? ' · ' + escapeHtml(appointment.time) : ''}</small></div>
        <button type="button" class="shifa-cancel-appointment" data-cancel-appointment="${escapeHtml(appointment.id)}">إلغاء الموعد</button>
      </div>`;
    }).join('') : `<div class="shifa-empty-state compact"><span class="material-symbols-outlined">event_available</span><p>لا توجد مواعيد مؤكدة</p></div>`;

    const drugRequestMarkup = drugRequests.length ? drugRequests.map(function (request) {
      const labels = {submitted:'تم إرسال الطلب',under_review:'قيد المراجعة',medicine_found:'تم العثور على الدواء',fulfilled:'تم تنفيذ الطلب',rejected:'مرفوض'};
      return `<div class="shifa-appointment-card shifa-drug-request-card"><div><strong>${escapeHtml(request.medicine)}</strong><span>${escapeHtml(labels[request.status] || 'طلب دواء')}${request.pharmacy ? ' · ' + escapeHtml(request.pharmacy) : ''}</span><small>${escapeHtml(formatNotificationTime(request.createdAt))}</small></div></div>`;
    }).join('') : `<div class="shifa-empty-state compact"><span class="material-symbols-outlined">medication\</span><p>لا توجد طلبات أدوية</p></div>`;

    list.innerHTML = `<section class="shifa-notification-section"><div class="shifa-section-heading"><h3>الإشعارات</h3><button type="button" data-mark-all-read>تحديد الكل كمقروء</button></div>${notificationMarkup}</section>
      <section class="shifa-notification-section"><div class="shifa-section-heading"><h3>مواعيدي القادمة</h3></div>${appointmentMarkup}</section>
      <section class="shifa-notification-section"><div class="shifa-section-heading"><h3>طلبات الأدوية</h3></div>${drugRequestMarkup}</section>`;
  }

  function updateNotificationBadge() {
    const unread = getNotifications().filter(function (item) { return !item.read; }).length;
    document.querySelectorAll('[data-shifa-notification-bell]').forEach(function (button) {
      let badge = button.querySelector('.shifa-notification-badge');
      if (unread > 0) {
        if (!badge) {
          badge = document.createElement('span');
          badge.className = 'shifa-notification-badge';
          button.appendChild(badge);
        }
        badge.textContent = unread > 99 ? '99+' : String(unread);
      } else if (badge) {
        badge.remove();
      }
    });
  }

  function createNotificationComponent() {
    if (document.getElementById('shifa-notification-panel')) return;

    const overlay = document.createElement('div');
    overlay.id = 'shifa-notification-overlay';
    overlay.className = 'shifa-notification-overlay';

    /* A div, not an aside: the panel is appended to <body>, and pages that
       style their sidebar with `.shifa-app-shell > aside` (pharmacy-details.css)
       would otherwise capture it and drop it into the page flow. */
    notificationPanel = document.createElement('div');
    notificationPanel.id = 'shifa-notification-panel';
    notificationPanel.className = 'shifa-notification-panel';
    notificationPanel.setAttribute('role', 'dialog');
    notificationPanel.setAttribute('aria-modal', 'true');
    notificationPanel.setAttribute('aria-label', 'مركز الإشعارات');
    notificationPanel.innerHTML = `<div class="shifa-notification-head"><div><span class="material-symbols-outlined">notifications_active</span><div><h2>الإشعارات</h2><p>تأكيدات المواعيد وتحديثات طلبات الأدوية</p></div></div><button type="button" data-close-notifications aria-label="إغلاق"><span class="material-symbols-outlined">close</span></button></div><div class="shifa-notification-list" data-notification-list></div>`;

    document.body.appendChild(overlay);
    document.body.appendChild(notificationPanel);

    overlay.addEventListener('click', closeNotificationPanel);
    notificationPanel.addEventListener('click', function (event) {
      const readButton = event.target.closest('[data-read-notification]');
      if (readButton) markNotificationAsRead(readButton.getAttribute('data-read-notification'));
      const cancelButton = event.target.closest('[data-cancel-appointment]');
      if (cancelButton) cancelAppointment(cancelButton.getAttribute('data-cancel-appointment'));
      if (event.target.closest('[data-mark-all-read]')) markAllNotificationsAsRead();
      if (event.target.closest('[data-close-notifications]')) closeNotificationPanel();
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closeNotificationPanel();
    });
  }

  function openNotificationPanel() {
    createNotificationComponent();
    renderNotificationList();
    notificationPanel.classList.add('is-open');
    document.getElementById('shifa-notification-overlay').classList.add('is-open');
    document.body.classList.add('shifa-notifications-open');
  }

  function closeNotificationPanel() {
    if (!notificationPanel) return;
    notificationPanel.classList.remove('is-open');
    const overlay = document.getElementById('shifa-notification-overlay');
    if (overlay) overlay.classList.remove('is-open');
    document.body.classList.remove('shifa-notifications-open');
  }

  function wireNotificationBells() {
    const buttons = document.querySelectorAll('button[aria-label*="الإشعارات"], button[aria-label*="التنبيهات"], button[aria-label*="التنبيه"]');
    buttons.forEach(function (button) {
      if (button.dataset.shifaNotificationWired) return;
      button.dataset.shifaNotificationWired = '1';
      button.dataset.shifaNotificationBell = '1';
      button.classList.add('shifa-notification-trigger');
      button.addEventListener('click', openNotificationPanel);
    });
    updateNotificationBadge();
  }

  function initializeNotifications() {
    if (notificationsInitialized) return;
    notificationsInitialized = true;
    createNotificationComponent();
    wireNotificationBells();
    checkAppointmentReminders();
    setInterval(checkAppointmentReminders, 60 * 1000);
    window.addEventListener('storage', function (event) {
      if (event.key === NOTIFICATIONS_KEY || event.key === APPOINTMENTS_KEY || event.key === DRUG_REQUESTS_KEY) {
        renderNotificationList();
        updateNotificationBadge();
      }
    });
  }

  // Public API for the feature and for future pages.
  window.ShifaNotifications = {
    createNotification: createNotification,
    sendBookingConfirmation: sendBookingConfirmation,
    sendAppointmentReminder: sendAppointmentReminder,
    sendCancellationNotification: sendCancellationNotification,
    markNotificationAsRead: markNotificationAsRead,
    markAllNotificationsAsRead: markAllNotificationsAsRead,
    cancelAppointment: cancelAppointment,
    getNotifications: getNotifications,
    getAppointments: getAppointments,
    createAppointmentFromBooking: createAppointmentFromBooking,
    createDrugRequest: createDrugRequest,
    sendDrugRequestSubmitted: sendDrugRequestSubmitted,
    sendDrugRequestUnderReview: sendDrugRequestUnderReview,
    sendMedicineFoundNotification: sendMedicineFoundNotification,
    sendDrugRequestFulfilled: sendDrugRequestFulfilled,
    sendDrugRequestRejected: sendDrugRequestRejected,
    getDrugRequests: getDrugRequests,
    simulateDrugRequestLifecycle: simulateDrugRequestLifecycle
  };

  window.addEventListener('DOMContentLoaded', initializeNotifications);
  // script.js is loaded at the end of most pages, so initialize immediately too.
  if (document.readyState !== 'loading') initializeNotifications();

  // Expose the required functions globally for existing/future markup.
  window.sendBookingConfirmation = sendBookingConfirmation;
  window.sendAppointmentReminder = sendAppointmentReminder;
  window.sendCancellationNotification = sendCancellationNotification;
  window.markNotificationAsRead = markNotificationAsRead;
  window.cancelAppointment = cancelAppointment;
  window.createAppointmentFromBooking = createAppointmentFromBooking;
  window.createDrugRequest = createDrugRequest;
  window.sendDrugRequestSubmitted = sendDrugRequestSubmitted;
  window.sendDrugRequestUnderReview = sendDrugRequestUnderReview;
  window.sendMedicineFoundNotification = sendMedicineFoundNotification;
  window.sendDrugRequestFulfilled = sendDrugRequestFulfilled;
  window.sendDrugRequestRejected = sendDrugRequestRejected;
})();
