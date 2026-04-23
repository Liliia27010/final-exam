// Track which customer is currently selected
let selectedCustomerId = null;

// ─── Form Setup ───────────────────────────────────────────────────────────────

function buildForm() {
  const formContainer = document.getElementById("customer-form");

  formContainer.innerHTML = `
    <form id="customer-form-el" novalidate>
      <div class="form-group">
        <label for="first_name">First Name <span class="required">*</span></label>
        <input type="text" id="first_name" name="first_name" placeholder="e.g. Jane" required />
      </div>

      <div class="form-group">
        <label for="last_name">Last Name <span class="required">*</span></label>
        <input type="text" id="last_name" name="last_name" placeholder="e.g. Smith" required />
      </div>

      <div class="form-group">
        <label for="email">Email <span class="required">*</span></label>
        <input type="email" id="email" name="email" placeholder="e.g. jane@example.com" required />
      </div>

      <div class="form-group">
        <label for="phone">Phone</label>
        <input type="tel" id="phone" name="phone" placeholder="e.g. +358 40 123 4567" />
      </div>

      <div class="form-group">
        <label for="birth_date">Birth Date</label>
        <input type="date" id="birth_date" name="birth_date" />
      </div>

      <p id="form-status" class="form-status" aria-live="polite"></p>

      <div class="form-actions">
        <button type="submit" id="btn-save" class="btn btn-primary">Add Customer</button>
        <button type="button" id="btn-delete" class="btn btn-danger" style="display:none">Delete Customer</button>
        <button type="button" id="btn-clear" class="btn btn-secondary">Clear</button>
      </div>
    </form>
  `;

  document.getElementById("customer-form-el").addEventListener("submit", handleSave);
  document.getElementById("btn-delete").addEventListener("click", handleDelete);
  document.getElementById("btn-clear").addEventListener("click", clearForm);
}

// ─── Form Helpers ─────────────────────────────────────────────────────────────

function getFormData() {
  return {
    first_name: document.getElementById("first_name").value.trim(),
    last_name:  document.getElementById("last_name").value.trim(),
    email:      document.getElementById("email").value.trim(),
    phone:      document.getElementById("phone").value.trim(),
    birth_date: document.getElementById("birth_date").value || null,
  };
}

function populateForm(person) {
  document.getElementById("first_name").value = person.first_name  || "";
  document.getElementById("last_name").value  = person.last_name   || "";
  document.getElementById("email").value       = person.email       || "";
  document.getElementById("phone").value       = person.phone       || "";
  document.getElementById("birth_date").value = person.birth_date
    ? person.birth_date.slice(0, 10)
    : "";
}

function clearForm() {
  selectedCustomerId = null;
  document.getElementById("customer-form-el").reset();
  document.getElementById("btn-save").textContent    = "Add Customer";
  document.getElementById("btn-delete").style.display = "none";
  setStatus("", "");
  highlightSelected(null);
}

function setStatus(msg, type) {
  const el = document.getElementById("form-status");
  el.textContent = msg;
  el.className = "form-status " + (type || "");
}

// ─── API Calls ────────────────────────────────────────────────────────────────

async function handleSave(e) {
  e.preventDefault();
  const data = getFormData();

  if (!data.first_name || !data.last_name || !data.email) {
    setStatus("First name, last name and email are required.", "error");
    return;
  }

  try {
    let res, json;

    if (selectedCustomerId) {
      res  = await fetch(`/api/persons/${selectedCustomerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      json = await res.json();
      if (!res.ok) throw new Error(json.error || "Update failed");
      setStatus("Customer updated successfully.", "success");
    } else {
      res  = await fetch("/api/persons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      json = await res.json();
      if (!res.ok) throw new Error(json.error || "Add failed");
      setStatus("Customer added successfully.", "success");
    }

    await loadCustomers();
    selectCustomer(json.person);
  } catch (err) {
    setStatus(err.message, "error");
  }
}

async function handleDelete() {
  if (!selectedCustomerId) return;

  const confirmed = confirm("Delete this customer? This cannot be undone.");
  if (!confirmed) return;

  try {
    const res  = await fetch(`/api/persons/${selectedCustomerId}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Delete failed");

    setStatus("Customer deleted.", "success");
    clearForm();
    await loadCustomers();
  } catch (err) {
    setStatus(err.message, "error");
  }
}

// ─── Customer Selection ───────────────────────────────────────────────────────

function selectCustomer(person) {
  selectedCustomerId = person.id;
  populateForm(person);
  document.getElementById("btn-save").textContent    = "Update Customer";
  document.getElementById("btn-delete").style.display = "inline-block";
  setStatus("", "");
  highlightSelected(person.id);
}

function highlightSelected(id) {
  document.querySelectorAll(".customer-card").forEach(card => {
    card.classList.toggle("selected", Number(card.dataset.id) === id);
  });
}

// ─── Load & Render List ───────────────────────────────────────────────────────

async function loadCustomers() {
  const container = document.getElementById("customer-list");

  try {
    const res = await fetch("/api/persons");
    if (!res.ok) throw new Error("Failed to fetch data");

    const data = await res.json();
    container.innerHTML = "";

    if (data.length === 0) {
      container.innerHTML = "<p class='empty-state'>No customers found. Add one using the form.</p>";
      return;
    }

    data.forEach(person => {
      const div = document.createElement("div");
      div.className  = "customer-card";
      div.dataset.id = person.id;

      const initials = (person.first_name[0] + person.last_name[0]).toUpperCase();
      const dobStr   = person.birth_date
        ? new Date(person.birth_date).toLocaleDateString("fi-FI")
        : "—";

      div.innerHTML = `
        <div class="card-avatar">${initials}</div>
        <div class="card-body">
          <strong>${person.first_name} ${person.last_name}</strong>
          <span class="card-detail"> ${person.email}</span>
          <span class="card-detail"> ${person.phone || "—"}</span>
          <span class="card-detail"> ${dobStr}</span>
        </div>
      `;

      div.addEventListener("click", () => selectCustomer(person));
      container.appendChild(div);
    });

    if (selectedCustomerId) highlightSelected(selectedCustomerId);

  } catch (err) {
    console.error(err);
    container.innerHTML = "<p style='color:red;'>Error loading customers.</p>";
  }
}

// ─── Init ─────────────────────────────────────────────────────────────────────
buildForm();
loadCustomers();