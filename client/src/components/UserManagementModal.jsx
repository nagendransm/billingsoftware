import React, { useState, useEffect } from 'react';

export default function UserManagementModal({ isOpen, onClose, currentUser, lang = 'en' }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form state for creating new user
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('user');
  const [newPassword, setNewPassword] = useState('');
  const [savingUser, setSavingUser] = useState(false);

  // Edit / Password reset state
  const [editingUser, setEditingUser] = useState(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('user');
  const [editPassword, setEditPassword] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete confirmation
  const [deletingUser, setDeletingUser] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/users');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setUsers(data.data);
      } else {
        setError(data.message || 'Failed to load users');
      }
    } catch (err) {
      console.error(err);
      setError('Error connecting to server to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      setShowAddForm(false);
      setEditingUser(null);
      setDeletingUser(null);
      setError('');
      setSuccessMsg('');
    }
  }, [isOpen]);

  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (deletingUser) {
          setDeletingUser(null);
        } else if (editingUser) {
          setEditingUser(null);
        } else if (showAddForm) {
          setShowAddForm(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, showAddForm, editingUser, deletingUser]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!newUsername.trim() || !newPassword.trim() || !newName.trim()) {
      setError('All fields are required');
      return;
    }

    setSavingUser(true);
    try {
      const res = await fetch('/api/auth/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: newUsername.trim(),
          password: newPassword.trim(),
          name: newName.trim(),
          role: newRole
        })
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`User '${newUsername}' created successfully!`);
        setNewUsername('');
        setNewName('');
        setNewPassword('');
        setNewRole('user');
        setShowAddForm(false);
        fetchUsers();
      } else {
        setError(data.message || 'Failed to create user');
      }
    } catch (err) {
      console.error(err);
      setError('Server error creating user');
    } finally {
      setSavingUser(false);
    }
  };

  const handleStartEdit = (u) => {
    setEditingUser(u);
    setEditName(u.name || '');
    setEditRole(u.role || 'user');
    setEditPassword('');
    setError('');
    setSuccessMsg('');
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    setSavingEdit(true);
    setError('');
    setSuccessMsg('');

    try {
      const payload = {
        name: editName.trim(),
        role: editingUser.role === 'root' ? 'root' : editRole
      };
      if (editPassword.trim()) {
        payload.password = editPassword.trim();
      }

      const res = await fetch(`/api/auth/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`User '${editingUser.username}' updated successfully!`);
        setEditingUser(null);
        fetchUsers();
      } else {
        setError(data.message || 'Failed to update user');
      }
    } catch (err) {
      console.error(err);
      setError('Server error updating user');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    setError('');
    setSuccessMsg('');

    try {
      const res = await fetch(`/api/auth/users/${deletingUser.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`User '${deletingUser.username}' deleted.`);
        setDeletingUser(null);
        fetchUsers();
      } else {
        setError(data.message || 'Failed to delete user');
      }
    } catch (err) {
      console.error(err);
      setError('Server error deleting user');
    }
  };

  if (!isOpen) return null;

  const isCurrentRoot = currentUser?.role === 'root';
  const isCurrentAdmin = currentUser?.role === 'admin' || isCurrentRoot;

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 select-none animate-fade-in text-xs font-sans">
      <div className="bg-white rounded-lg border border-slate-300 w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Title Bar */}
        <div className="bg-[#6a1b6b] text-white px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-base font-bold">👥</span>
            <div>
              <h2 className="text-sm font-bold tracking-wide">
                User Management & Access Control / பயனர் மேலாண்மை
              </h2>
              <p className="text-[10px] text-purple-200">
                Logged in as: <span className="font-bold uppercase tracking-wider">{currentUser?.username || 'root'}</span> ({currentUser?.role || 'root'})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-6 w-6 rounded hover:bg-white/20 text-white font-bold flex items-center justify-center text-sm transition-colors"
            title="Close [Esc]"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          
          {/* Notifications */}
          {error && (
            <div className="p-2.5 bg-rose-50 border border-rose-300 rounded text-rose-800 text-xs font-bold flex items-center justify-between">
              <span>⚠️ {error}</span>
              <button onClick={() => setError('')} className="text-rose-600 hover:text-rose-900 font-bold ml-2">✕</button>
            </div>
          )}
          {successMsg && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-300 rounded text-emerald-800 text-xs font-bold flex items-center justify-between">
              <span>✓ {successMsg}</span>
              <button onClick={() => setSuccessMsg('')} className="text-emerald-600 hover:text-emerald-900 font-bold ml-2">✕</button>
            </div>
          )}

          {/* Action Header */}
          <div className="flex items-center justify-between bg-slate-100 p-2.5 rounded border border-slate-200">
            <div>
              <span className="font-bold text-slate-800 text-xs">Total Users: {users.length}</span>
              <span className="text-[11px] text-slate-500 ml-2">
                (Master Root has unrestricted privileges over all Admin and Staff accounts)
              </span>
            </div>
            {isCurrentAdmin && !showAddForm && (
              <button
                onClick={() => {
                  setShowAddForm(true);
                  setEditingUser(null);
                  setError('');
                }}
                className="px-3 py-1 bg-[#6a1b6b] hover:bg-[#521353] text-white font-bold rounded shadow-xs text-xs flex items-center space-x-1 transition-colors"
              >
                <span>➕ Add New User / புதிய பயனர்</span>
              </button>
            )}
          </div>

          {/* Add User Form Drawer */}
          {showAddForm && (
            <form onSubmit={handleCreateUser} className="bg-purple-50/70 border border-purple-200 rounded p-3.5 space-y-3">
              <div className="flex items-center justify-between border-b border-purple-200 pb-2">
                <span className="font-bold text-purple-900 text-xs">➕ Create New User Account</span>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-xs text-slate-500 hover:text-slate-800 font-semibold"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                    Username / பயனர் பெயர் *
                  </label>
                  <input
                    type="text"
                    required
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                    placeholder="e.g. cashier1"
                    className="w-full px-2 py-1 border border-slate-300 rounded text-xs focus:border-purple-700 focus:outline-none bg-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                    Full Name / முழுப் பெயர் *
                  </label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Ramesh Kumar"
                    className="w-full px-2 py-1 border border-slate-300 rounded text-xs focus:border-purple-700 focus:outline-none bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                    Role / அனுமதி நிலை *
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="w-full px-2 py-1 border border-slate-300 rounded text-xs focus:border-purple-700 focus:outline-none bg-white font-semibold"
                  >
                    <option value="user">User / Billing Staff (Billing Only)</option>
                    <option value="admin">Admin (Manager Access)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                    Password / கடவுச்சொல் *
                  </label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-2 py-1 border border-slate-300 rounded text-xs focus:border-purple-700 focus:outline-none bg-white"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingUser}
                  className="px-4 py-1 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded font-bold text-xs"
                >
                  {savingUser ? 'Saving...' : 'Save User / உருவாக்கு'}
                </button>
              </div>
            </form>
          )}

          {/* Edit User Form Drawer */}
          {editingUser && (
            <form onSubmit={handleSaveEdit} className="bg-amber-50/80 border border-amber-300 rounded p-3.5 space-y-3">
              <div className="flex items-center justify-between border-b border-amber-200 pb-2">
                <span className="font-bold text-amber-900 text-xs">
                  ✏️ Edit User: <strong className="font-mono">{editingUser.username}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="text-xs text-slate-500 hover:text-slate-800 font-semibold"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                    Full Name / முழுப் பெயர் *
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-2 py-1 border border-slate-300 rounded text-xs focus:border-purple-700 focus:outline-none bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                    Role / அனுமதி நிலை
                  </label>
                  {editingUser.role === 'root' ? (
                    <div className="px-2 py-1 bg-purple-100 border border-purple-300 rounded text-purple-900 font-bold text-xs">
                      👑 Master Root (Permanent)
                    </div>
                  ) : (
                    <select
                      value={editRole}
                      disabled={!isCurrentRoot && editingUser.role === 'admin'}
                      onChange={(e) => setEditRole(e.target.value)}
                      className="w-full px-2 py-1 border border-slate-300 rounded text-xs focus:border-purple-700 focus:outline-none bg-white font-semibold disabled:bg-slate-100"
                    >
                      <option value="user">User / Billing Staff</option>
                      <option value="admin">Admin</option>
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                    New Password / புதிய கடவுச்சொல்
                  </label>
                  <input
                    type="password"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="Leave blank to keep unchanged"
                    className="w-full px-2 py-1 border border-slate-300 rounded text-xs focus:border-purple-700 focus:outline-none bg-white"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-1">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-4 py-1 bg-amber-700 hover:bg-amber-800 disabled:opacity-50 text-white rounded font-bold text-xs"
                >
                  {savingEdit ? 'Updating...' : 'Update User / புதுப்பி'}
                </button>
              </div>
            </form>
          )}

          {/* Delete Confirmation Modal / Prompt */}
          {deletingUser && (
            <div className="p-3 bg-rose-50 border-2 border-rose-400 rounded text-rose-900 space-y-2">
              <div className="font-bold text-xs flex items-center space-x-1">
                <span>⚠️ Are you sure you want to remove user:</span>
                <span className="font-mono bg-rose-200 px-1 py-0.5 rounded">{deletingUser.username}</span>
                <span>({deletingUser.name})?</span>
              </div>
              <p className="text-[11px] text-rose-700">
                This action cannot be undone. All future login sessions for this account will be terminated.
              </p>
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setDeletingUser(null)}
                  className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteUser}
                  className="px-3 py-1 bg-rose-700 hover:bg-rose-800 text-white rounded font-bold text-xs"
                >
                  Confirm Delete / நீக்கு
                </button>
              </div>
            </div>
          )}

          {/* Users Table */}
          <div className="border border-slate-300 rounded overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-200 border-b border-slate-300 text-slate-700 font-bold">
                  <th className="p-2 w-12 text-center">ID</th>
                  <th className="p-2">Username</th>
                  <th className="p-2">Full Name</th>
                  <th className="p-2">Role / Access</th>
                  <th className="p-2">Created</th>
                  <th className="p-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="p-4 text-center text-slate-500 font-semibold">
                      Loading users list...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-4 text-center text-slate-500">
                      No users found.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => {
                    const isRoot = u.role === 'root' || u.username === 'root';
                    const isSelf = currentUser && currentUser.id === u.id;
                    const canEdit = isCurrentRoot || (isCurrentAdmin && !isRoot);
                    const canDelete = !isRoot && !isSelf && (isCurrentRoot || (isCurrentAdmin && u.role === 'user'));

                    return (
                      <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-2 text-center font-mono text-slate-500">{u.id}</td>
                        <td className="p-2 font-mono font-bold text-slate-800">
                          {u.username}
                          {isSelf && (
                            <span className="ml-1.5 text-[9px] bg-blue-100 text-blue-800 px-1 py-0.2 rounded font-sans font-normal">
                              (You)
                            </span>
                          )}
                        </td>
                        <td className="p-2 text-slate-700">{u.name}</td>
                        <td className="p-2">
                          {isRoot ? (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-300">
                              <span>👑</span>
                              <span>Root Master</span>
                            </span>
                          ) : u.role === 'admin' ? (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-900 border border-rose-300">
                              <span>🛡️</span>
                              <span>Admin</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-300">
                              <span>👤</span>
                              <span>User (Billing)</span>
                            </span>
                          )}
                        </td>
                        <td className="p-2 text-[11px] text-slate-500">
                          {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'System'}
                        </td>
                        <td className="p-2 text-right space-x-1.5">
                          {canEdit && (
                            <button
                              onClick={() => handleStartEdit(u)}
                              className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 font-semibold rounded text-[11px] transition-colors"
                              title="Edit user details / password"
                            >
                              ✏️ Edit
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => {
                                setDeletingUser(u);
                                setEditingUser(null);
                                setError('');
                              }}
                              className="px-2 py-0.5 bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-700 font-bold rounded text-[11px] transition-colors"
                              title="Delete user"
                            >
                              🗑️ Remove
                            </button>
                          )}
                          {isRoot && (
                            <span className="text-[10px] text-slate-400 font-semibold italic">
                              Protected
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Quick Help Card */}
          <div className="bg-slate-50 border border-slate-200 rounded p-2.5 text-[11px] text-slate-600 space-y-1">
            <span className="font-bold text-slate-700 block">📌 Access Level Guidelines:</span>
            <ul className="list-disc pl-4 space-y-0.5 text-[10px]">
              <li><strong className="text-purple-900">Root Master:</strong> Full unrestricted system access. Manages all Admin and User accounts. Cannot be deleted or demoted.</li>
              <li><strong className="text-rose-900">Admin:</strong> Store manager access to products, reports, masters, settings, and cashier accounts.</li>
              <li><strong className="text-blue-900">User / Staff:</strong> Billing and thermal receipt printing only. Restricted from administrative settings and user modification.</li>
            </ul>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-100 border-t border-slate-300 px-4 py-2 flex items-center justify-between text-xs">
          <span className="text-[11px] text-slate-500 font-medium">
            Press <kbd className="px-1 py-0.5 bg-white border border-slate-300 rounded font-mono text-[10px]">Esc</kbd> to exit
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded text-xs transition-colors"
          >
            Close / மூடு
          </button>
        </div>

      </div>
    </div>
  );
}
