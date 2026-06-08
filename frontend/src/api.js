const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";


// Signup function - creates new user
export async function signup(user) {
  const res = await fetch(`${API_BASE}/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(user),
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.detail || "Signup failed");
  }
  return res.json();
}

// Login function - gets token (access_token)
export async function login(credentials) {
  const formBody = new URLSearchParams(credentials);
  const res = await fetch(`${API_BASE}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: formBody.toString(),
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.detail || "Login failed");
  }
  return res.json();
}

// Fetch all investments for logged-in user
export async function fetchInvestments(token) {
  const res = await fetch(`${API_BASE}/investments`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Fetch investments failed with status ${res.status}`);
  }
  return res.json();
}

// Add new investment
export async function addInvestment(investment, token) {
  const res = await fetch(`${API_BASE}/investments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(investment),
  });
  if (!res.ok) {
    throw new Error(`Add investment failed with status ${res.status}`);
  }
  return res.json();
}

// Update existing investment by id
export async function updateInvestment(id, investment, token) {
  const res = await fetch(`${API_BASE}/investments/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(investment),
  });
  if (!res.ok) {
    throw new Error(`Update investment failed with status ${res.status}`);
  }
  return res.json();
}

// Delete investment by id
export async function deleteInvestment(id, token) {
  const res = await fetch(`${API_BASE}/investments/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    throw new Error(`Delete investment failed with status ${res.status}`);
  }
  return res.json();
}
