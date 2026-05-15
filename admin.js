const adminKeyInput = document.getElementById("adminKey");
const loadAdminBtn = document.getElementById("loadAdminBtn");
const refreshAdminBtn = document.getElementById("refreshAdminBtn");
const adminMessage = document.getElementById("adminMessage");
const adminDashboard = document.getElementById("adminDashboard");
const adminUserCount = document.getElementById("adminUserCount");
const adminWordCount = document.getElementById("adminWordCount");
const adminSessionCount = document.getElementById("adminSessionCount");
const adminUsersBody = document.getElementById("adminUsersBody");

const adminKeyStorage = "adminKey";

function showAdminMessage(message, type) {
  adminMessage.textContent = message;
  adminMessage.className = `auth-message ${type || ""}`;
}

function formatDate(value) {
  if (!value) {
    return "Not set";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function renderUsers(users) {
  adminUsersBody.innerHTML = "";

  if (!users.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 4;
    cell.textContent = "No users yet";
    row.appendChild(cell);
    adminUsersBody.appendChild(row);
    return;
  }

  users.forEach(function (user) {
    const row = document.createElement("tr");
    const values = [user.id, user.name, user.phone, formatDate(user.created_at)];

    values.forEach(function (value) {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.appendChild(cell);
    });

    adminUsersBody.appendChild(row);
  });
}

async function loadAdmin() {
  const key = adminKeyInput.value.trim();

  if (!key) {
    showAdminMessage("Enter your admin key.", "warning");
    adminKeyInput.focus();
    return;
  }

  showAdminMessage("Loading...", "");

  try {
    const response = await fetch("/api/admin/stats", {
      headers: {
        "x-admin-key": key
      }
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Cannot load admin data");
    }

    sessionStorage.setItem(adminKeyStorage, key);
    adminUserCount.textContent = data.users;
    adminWordCount.textContent = data.words;
    adminSessionCount.textContent = data.sessions;
    renderUsers(data.recentUsers || []);
    adminDashboard.classList.remove("hidden");
    showAdminMessage("Loaded.", "success");
  } catch (err) {
    adminDashboard.classList.add("hidden");
    showAdminMessage(err.message, "warning");
  }
}

loadAdminBtn.addEventListener("click", loadAdmin);
refreshAdminBtn.addEventListener("click", loadAdmin);

adminKeyInput.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    loadAdmin();
  }
});

const savedAdminKey = sessionStorage.getItem(adminKeyStorage);

if (savedAdminKey) {
  adminKeyInput.value = savedAdminKey;
  loadAdmin();
}
