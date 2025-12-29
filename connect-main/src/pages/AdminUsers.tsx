// src/pages/AdminUsers.tsx
import React, { useEffect, useState } from "react";

type AdminUser = {
  id: string;
  email: string | null;
  full_name: string;
  outpost: string;
  last_sign_in_at: string | null;
};

const AdminUsersPage: React.FC = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [editFullName, setEditFullName] = useState("");
  const [editOutpost, setEditOutpost] = useState("");

  async function loadUsers() {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/admin-users", {
        headers: {
          // אם הגדרת ADMIN_API_SECRET בשרת:
          // "x-admin-secret": "...."
        },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to load users");
      }

      const data = await res.json();
      setUsers(data.users);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "שגיאה בטעינת המשתמשים");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  function openEdit(user: AdminUser) {
    setEditingUser(user);
    setEditFullName(user.full_name || "");
    setEditOutpost(user.outpost || "");
  }

  function closeEdit() {
    setEditingUser(null);
    setEditFullName("");
    setEditOutpost("");
  }

  async function saveEdit() {
    if (!editingUser) return;
    try {
      setSaving(true);
      setError(null);

      const res = await fetch("/api/admin-users", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          // "x-admin-secret": "...." אם צריך
        },
        body: JSON.stringify({
          id: editingUser.id,
          full_name: editFullName,
          outpost: editOutpost,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to update user");
      }

      // עדכון ברשימה המקומית
      setUsers((prev) =>
        prev.map((u) =>
          u.id === editingUser.id
            ? { ...u, full_name: editFullName, outpost: editOutpost }
            : u
        )
      );

      closeEdit();
    } catch (e: any) {
      console.error(e);
      setError(e.message || "שגיאה בעדכון המשתמש");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: "24px" }}>
      <h1>ניהול משתמשים</h1>

      {loading && <p>טוען משתמשים...</p>}
      {error && (
        <p style={{ color: "red", marginBottom: "12px" }}>
          שגיאה: {error}
        </p>
      )}

      {!loading && !error && (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ borderBottom: "1px solid #ccc", textAlign: "right" }}>
                אימייל
              </th>
              <th style={{ borderBottom: "1px solid #ccc", textAlign: "right" }}>
                שם מלא
              </th>
              <th style={{ borderBottom: "1px solid #ccc", textAlign: "right" }}>
                מוצב
              </th>
              <th style={{ borderBottom: "1px solid #ccc" }}>פעולות</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td style={{ borderBottom: "1px solid #eee", padding: "4px 8px" }}>
                  {u.email}
                </td>
                <td style={{ borderBottom: "1px solid #eee", padding: "4px 8px" }}>
                  {u.full_name}
                </td>
                <td style={{ borderBottom: "1px solid #eee", padding: "4px 8px" }}>
                  {u.outpost}
                </td>
                <td style={{ borderBottom: "1px solid #eee", padding: "4px 8px" }}>
                  <button onClick={() => openEdit(u)}>עריכה</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* מודאל עריכה פשוט */}
      {editingUser && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: "#fff",
              padding: "24px",
              borderRadius: "12px",
              minWidth: "320px",
            }}
          >
            <h2>עריכת משתמש</h2>
            <p style={{ fontSize: "14px", color: "#666" }}>
              {editingUser.email}
            </p>

            <label style={{ display: "block", marginTop: "12px" }}>
              שם מלא:
              <input
                style={{ width: "100%", marginTop: 4 }}
                value={editFullName}
                onChange={(e) => setEditFullName(e.target.value)}
              />
            </label>

            <label style={{ display: "block", marginTop: "12px" }}>
              מוצב:
              <input
                style={{ width: "100%", marginTop: 4 }}
                value={editOutpost}
                onChange={(e) => setEditOutpost(e.target.value)}
              />
            </label>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
                marginTop: 16,
              }}
            >
              <button onClick={closeEdit} disabled={saving}>
                ביטול
              </button>
              <button onClick={saveEdit} disabled={saving}>
                {saving ? "שומר..." : "שמירה"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsersPage;
