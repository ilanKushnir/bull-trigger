import React, { useEffect, useState } from 'react';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Admin, useApi } from '../services/websocketService';

// Icons as simple components
const AdminIcon = () => <span className="text-lg">👤</span>;
const SuperAdminIcon = () => <span className="text-lg">👑</span>;
const UserIcon = () => <span className="text-lg">👥</span>;
const EditIcon = () => <span className="text-sm">✏️</span>;
const DeleteIcon = () => <span className="text-sm">🗑️</span>;
const PlusIcon = () => <span className="text-sm">➕</span>;
const TelegramIcon = () => <span className="text-sm">📱</span>;
const EmailIcon = () => <span className="text-sm">📧</span>;
const SaveIcon = () => <span className="text-sm">💾</span>;
const CancelIcon = () => <span className="text-sm">❌</span>;
const CheckIcon = () => <span className="text-sm">✅</span>;
const WarningIcon = () => <span className="text-lg">⚠️</span>;

export default function Users() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [allUsers, setAllUsers] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<Admin | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'admins' | 'all'>('admins');
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    telegramId: '',
    isAdmin: false
  });
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const api = useApi();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    console.log('🔍 Fetching admin data...');
    
    const [adminsResult, usersResult] = await Promise.all([
      api.getAdmins(),
      api.getUsers()
    ]);

    console.log('🔍 Admins result:', adminsResult);
    console.log('🔍 Users result:', usersResult);

    if (adminsResult.success && adminsResult.data) {
      console.log('✅ Setting admins:', adminsResult.data);
      setAdmins(adminsResult.data);
    } else {
      console.error('❌ Failed to fetch admins:', adminsResult.error);
    }

    if (usersResult.success && usersResult.data) {
      console.log('✅ Setting users:', usersResult.data);
      setAllUsers(usersResult.data);
    } else {
      console.error('❌ Failed to fetch users:', usersResult.error);
    }

    setLoading(false);
  };

  const validateForm = async () => {
    const errors: { [key: string]: string } = {};

    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email format';
    }

    if (formData.telegramId && formData.telegramId.trim()) {
      const telegramId = formData.telegramId.trim();
      if (!/^\d+$/.test(telegramId)) {
        errors.telegramId = 'Telegram ID must be a number';
      } else {
        // Check if Telegram ID is already taken (only for new users or when changing ID)
        if (!editingUser || editingUser.telegramId !== telegramId) {
          const validationResult = await api.validateTelegramId(telegramId);
          if (validationResult.success && validationResult.data && !validationResult.data.available) {
            errors.telegramId = 'This Telegram ID is already in use';
          }
        }
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!(await validateForm())) {
      return;
    }

    setIsSubmitting(true);

    try {
      const adminData = {
        email: formData.email.trim(),
        name: formData.name.trim() || undefined,
        telegramId: formData.telegramId.trim() || undefined,
        isAdmin: formData.isAdmin
      };

      let result;
      if (editingUser) {
        result = await api.updateAdmin(editingUser.id, adminData);
      } else {
        result = await api.createAdmin(adminData);
      }

      if (result.success) {
        await fetchData();
        resetForm();
      } else {
        setFormErrors({ submit: result.error || 'Failed to save user' });
      }
    } catch (error) {
      setFormErrors({ submit: 'An unexpected error occurred' });
    }

    setIsSubmitting(false);
  };

  const handleEdit = (user: Admin) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      name: user.name || '',
      telegramId: user.telegramId || '',
      isAdmin: user.isAdmin
    });
    setFormErrors({});
    setShowCreateForm(true);
  };

  const handleDelete = async (user: Admin) => {
    if (!confirm(`Are you sure you want to delete ${user.email}?`)) {
      return;
    }

    const result = await api.deleteAdmin(user.id);
    if (result.success) {
      await fetchData();
    } else {
      alert(result.error || 'Failed to delete user');
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      name: '',
      telegramId: '',
      isAdmin: false
    });
    setFormErrors({});
    setEditingUser(null);
    setShowCreateForm(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getUserIcon = (user: Admin) => {
    return user.isAdmin ? <SuperAdminIcon /> : <UserIcon />;
  };

  const currentUsers = activeTab === 'admins' ? admins : allUsers;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-blue-400">Loading admin data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-blue-400 mb-2">
            👥 Users Management
          </h1>
          <p className="text-gray-400">
            Manage Telegram admin permissions and user roles
          </p>
        </div>
        <Button 
          className="bg-blue-600 hover:bg-blue-700 flex items-center space-x-2"
          onClick={() => setShowCreateForm(true)}
        >
          <PlusIcon />
          <span>Add User</span>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Admins</p>
                <p className="text-2xl font-bold text-green-500">{admins.length}</p>
              </div>
              <div className="flex items-center justify-center w-10 h-10 bg-green-600/20 rounded-lg">
                <SuperAdminIcon />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Users</p>
                <p className="text-2xl font-bold text-blue-400">{allUsers.length}</p>
              </div>
              <div className="flex items-center justify-center w-10 h-10 bg-blue-600/20 rounded-lg">
                <UserIcon />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">With Telegram</p>
                <p className="text-2xl font-bold text-purple-400">
                  {allUsers.filter(u => u.telegramId).length}
                </p>
              </div>
              <div className="flex items-center justify-center w-10 h-10 bg-purple-600/20 rounded-lg">
                <TelegramIcon />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tab Navigation */}
      <Card>
        <CardContent className="p-6">
          <div className="flex space-x-4">
            <Button
              onClick={() => setActiveTab('admins')}
              variant={activeTab === 'admins' ? 'default' : 'outline'}
              className={`flex items-center space-x-2 ${activeTab === 'admins' ? 'bg-blue-600 text-white' : ''}`}
            >
              <span>👑</span>
              <span>Admins Only ({admins.length})</span>
            </Button>
            <Button
              onClick={() => setActiveTab('all')}
              variant={activeTab === 'all' ? 'default' : 'outline'}
              className={`flex items-center space-x-2 ${activeTab === 'all' ? 'bg-blue-600 text-white' : ''}`}
            >
              <span>👥</span>
              <span>All Users ({allUsers.length})</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* User List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl text-white flex items-center space-x-2">
            {activeTab === 'admins' ? <SuperAdminIcon /> : <UserIcon />}
            <span>{activeTab === 'admins' ? 'Admin Users' : 'All Users'} ({currentUsers.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-700">
                <tr>
                  <th className="text-left p-4 font-medium text-gray-300">User</th>
                  <th className="text-left p-4 font-medium text-gray-300">Role</th>
                  <th className="text-left p-4 font-medium text-gray-300">Telegram</th>
                  <th className="text-left p-4 font-medium text-gray-300">Created</th>
                  <th className="text-left p-4 font-medium text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentUsers.map((user) => (
                  <tr key={user.id} className="border-b border-gray-700 hover:bg-gray-900 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center space-x-3">
                        {getUserIcon(user)}
                        <div>
                          <div className="text-white font-medium">{user.email}</div>
                          {user.name && (
                            <div className="text-sm text-gray-400">{user.name}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge variant={user.isAdmin ? 'success' : 'default'}>
                        {user.isAdmin ? 'Admin' : 'User'}
                      </Badge>
                    </td>
                    <td className="p-4">
                      {user.telegramId ? (
                        <div className="flex items-center space-x-2">
                          <TelegramIcon />
                          <span className="text-white">{user.telegramId}</span>
                        </div>
                      ) : (
                        <span className="text-gray-500">Not set</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className="text-gray-300">{formatDate(user.createdAt)}</span>
                    </td>
                    <td className="p-4">
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(user)}
                          className="flex items-center"
                        >
                          <EditIcon />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(user)}
                          className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white flex items-center"
                        >
                          <DeleteIcon />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Form Modal */}
      {showCreateForm && (
        <Card className="border-blue-500">
          <CardHeader>
            <CardTitle className="text-xl text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AdminIcon />
                <span>{editingUser ? 'Edit User' : 'Add New User'}</span>
              </div>
              <Button 
                size="sm" 
                onClick={resetForm}
                variant="outline"
                className="flex items-center"
              >
                <CancelIcon />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email Address *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2">
                      <EmailIcon />
                    </span>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                      placeholder="admin@example.com"
                      required
                    />
                  </div>
                  {formErrors.email && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.email}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Telegram User ID
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2">
                      <TelegramIcon />
                    </span>
                    <input
                      type="text"
                      value={formData.telegramId}
                      onChange={(e) => setFormData({ ...formData, telegramId: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                      placeholder="123456789"
                    />
                  </div>
                  {formErrors.telegramId && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.telegramId}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Optional. User can get this from @userinfobot on Telegram
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    User Role
                  </label>
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={!formData.isAdmin}
                        onChange={() => setFormData({ ...formData, isAdmin: false })}
                        className="text-blue-600"
                      />
                      <span className="text-white">Regular User</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={formData.isAdmin}
                        onChange={() => setFormData({ ...formData, isAdmin: true })}
                        className="text-blue-600"
                      />
                      <span className="text-white">Admin</span>
                    </label>
                  </div>
                </div>
              </div>

              {formErrors.submit && (
                <div className="p-3 bg-red-900 border border-red-500 rounded-md">
                  <p className="text-red-300 text-sm flex items-center space-x-2">
                    <WarningIcon />
                    <span>{formErrors.submit}</span>
                  </p>
                </div>
              )}

              <div className="flex space-x-3">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-green-600 hover:bg-green-700 flex items-center space-x-1"
                >
                  <SaveIcon />
                  <span>{isSubmitting ? 'Saving...' : editingUser ? 'Update User' : 'Create User'}</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                  className="flex items-center space-x-1"
                >
                  <CancelIcon />
                  <span>Cancel</span>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 