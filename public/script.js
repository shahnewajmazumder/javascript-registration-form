// Client-side logic for the registration form.
// Validation rules mirror the ones in server.js, so users get instant feedback
// and the server still has the final say.

const form = document.getElementById("registrationForm");
const submitBtn = document.getElementById("submitBtn");
const message = document.getElementById("message");
const success = document.getElementById("success");

const fields = {
    name: document.getElementById("name"),
    email: document.getElementById("email"),
    phone: document.getElementById("phone"),
    password: document.getElementById("password"),
    confirmPassword: document.getElementById("confirmPassword"),
};

const touched = {};

/* ---------- Live membership card ---------- */
const mcard = document.getElementById("mcard");
const cardName = document.getElementById("cardName");
const cardEmail = document.getElementById("cardEmail");
const cardPhone = document.getElementById("cardPhone");

document.getElementById("cardDate").textContent =
    "Since " + new Date().toLocaleDateString("en-IN", { month: "short", year: "numeric" });

function updateCard() {
    const name = fields.name.value.trim();
    const email = fields.email.value.trim();
    const digits = fields.phone.value.padEnd(10, "•");

    cardName.textContent = name || "Your name";
    cardName.classList.toggle("is-empty", !name);
    cardEmail.textContent = email || "you@example.com";
    cardEmail.classList.toggle("is-empty", !email);
    cardPhone.textContent = "+91 " + digits.slice(0, 5) + " " + digits.slice(5);
}

// Card follows the cursor (skipped on touch devices and for reduced motion)
const canTilt =
    window.matchMedia("(hover: hover)").matches &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (canTilt) {
    window.addEventListener("pointermove", (e) => {
        const x = e.clientX / window.innerWidth;
        const y = e.clientY / window.innerHeight;
        mcard.style.setProperty("--ry", ((x - 0.35) * 22).toFixed(1) + "deg");
        mcard.style.setProperty("--rx", ((0.5 - y) * 14).toFixed(1) + "deg");
        mcard.style.setProperty("--sx", (x * 100).toFixed(0) + "%");
    });
}

/* ---------- Validation rules ---------- */
const rules = {
    name(value) {
        const v = value.trim();
        if (!v) return "Enter your full name.";
        if (v.length < 2) return "Name must have at least 2 characters.";
        if (v.length > 100) return "Name must be 100 characters or fewer.";
        return "";
    },
    email(value) {
        const v = value.trim();
        if (!v) return "Enter your email address.";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "Enter a valid email, like name@example.com.";
        return "";
    },
    phone(value) {
        const v = value.trim();
        if (!v) return "Enter your mobile number.";
        if (!/^[6-9]\d{9}$/.test(v)) return "Enter a 10-digit Indian mobile number starting with 6, 7, 8 or 9.";
        return "";
    },
    password(value) {
        if (!value) return "Create a password.";
        if (value.length < 8) return "Password must have at least 8 characters.";
        if (value.length > 72) return "Password must be 72 characters or fewer.";
        return "";
    },
    confirmPassword(value) {
        if (!value) return "Re-enter your password.";
        if (value !== fields.password.value) return "Passwords don't match.";
        return "";
    },
};

/* ---------- Helpers ---------- */
function setError(id, text) {
    const input = fields[id];
    const group = input.closest(".form-group");
    const errorEl = document.getElementById(id + "Error");

    errorEl.textContent = text;
    group.classList.toggle("invalid", Boolean(text));
    group.classList.toggle("valid", !text && input.value !== "");
    input.setAttribute("aria-invalid", text ? "true" : "false");
}

function validateField(id) {
    const text = rules[id](fields[id].value);
    setError(id, text);
    return !text;
}

function showMessage(text, type) {
    message.textContent = text;
    message.className = text ? type + "-msg" : "";
}

function setLoading(isLoading) {
    submitBtn.disabled = isLoading;
    submitBtn.classList.toggle("loading", isLoading);
}

/* ---------- Password strength ---------- */
const strengthEl = document.getElementById("strength");
const strengthText = document.getElementById("strengthText");
const strengthLabels = ["", "Weak", "Fair", "Good", "Strong"];

function updateStrength(value) {
    if (!value) {
        strengthEl.classList.remove("active");
        return;
    }
    let score = 0;
    if (value.length >= 8) score++;
    if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score++;
    if (/\d/.test(value)) score++;
    if (/[^A-Za-z0-9]/.test(value)) score++;
    if (value.length < 8) score = Math.min(score, 1);

    const level = Math.max(score, 1);
    strengthEl.classList.add("active");
    strengthEl.dataset.level = level;
    strengthText.textContent = strengthLabels[level];
}

/* ---------- Events ---------- */
Object.keys(fields).forEach((id) => {
    const input = fields[id];

    input.addEventListener("blur", () => {
        touched[id] = true;
        validateField(id);
    });

    input.addEventListener("input", () => {
        if (id === "phone") input.value = input.value.replace(/\D/g, "").slice(0, 10);
        if (id === "password") {
            updateStrength(input.value);
            if (touched.confirmPassword) validateField("confirmPassword");
        }
        if (touched[id]) validateField(id);
        updateCard();
        showMessage("", "");
    });
});

// Show / hide password
document.querySelectorAll(".toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
        const input = document.getElementById(btn.dataset.target);
        const show = input.type === "password";
        input.type = show ? "text" : "password";
        btn.classList.toggle("shown", show);
        btn.setAttribute("aria-label", show ? "Hide password" : "Show password");
    });
});

form.addEventListener("submit", async (event) => {
    event.preventDefault();
    showMessage("", "");

    // Validate every field and focus the first problem
    let firstInvalid = null;
    Object.keys(fields).forEach((id) => {
        touched[id] = true;
        if (!validateField(id) && !firstInvalid) firstInvalid = fields[id];
    });
    if (firstInvalid) {
        firstInvalid.focus();
        return;
    }

    const payload = {
        name: fields.name.value.trim(),
        email: fields.email.value.trim().toLowerCase(),
        phone: fields.phone.value.trim(),
        password: fields.password.value,
    };

    setLoading(true);

    try {
        const response = await fetch("/api/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        const data = await response.json().catch(() => ({}));

        if (response.status === 201) {
            showSuccess(payload.email);
        } else if (response.status === 409) {
            setError("email", data.message || "This email is already registered.");
            fields.email.focus();
        } else {
            showMessage(data.message || "Something went wrong. Please try again.", "error");
        }
    } catch (err) {
        showMessage("Can't reach the server. Check your connection and try again.", "error");
    } finally {
        setLoading(false);
    }
});

/* ---------- Success view ---------- */
function showSuccess(email) {
    document.getElementById("successEmail").textContent = email;
    mcard.classList.add("issued");
    form.hidden = true;
    success.hidden = false;
}

document.getElementById("againBtn").addEventListener("click", () => {
    form.reset();
    Object.keys(fields).forEach((id) => {
        touched[id] = false;
        setError(id, "");
        fields[id].closest(".form-group").classList.remove("valid");
    });
    updateStrength("");
    mcard.classList.remove("issued");
    updateCard();
    showMessage("", "");
    success.hidden = true;
    form.hidden = false;
    fields.name.focus();
});