
import React, { useState } from 'react';
import { View, User } from '../types';
import { USER_KEY } from '../constants';

interface AuthProps {
  setUser: (user: User) => void;
  navigate: (view: View) => void;
}

const Auth: React.FC<AuthProps> = ({ setUser, navigate }) => {
  const [formData, setFormData] = useState({ name: '', emailOrId: '' });
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = formData.name.trim();
    const emailOrId = formData.emailOrId.trim();

    if (!name || !emailOrId) {
      setError('Both Full Name and Email/Trainee ID are required.');
      return;
    }

    const userObj: User = {
      name,
      email: emailOrId.includes('@') ? emailOrId : '',
      id: !emailOrId.includes('@') ? emailOrId : '',
      userId: `user-${Date.now()}`
    };

    localStorage.setItem(USER_KEY, JSON.stringify(userObj));
    setUser(userObj);
    navigate('lobby');
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-2xl shadow-xl border border-gray-100">
      <h2 className="text-2xl font-bold text-cfm-dark mb-4">Trainee Identification</h2>
      <p className="text-gray-600 mb-6">Please enter your details to begin the assessment.</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">Full Name</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-cfm-blue focus:border-cfm-blue sm:text-sm"
            placeholder="Juan Dela Cruz"
            required
          />
        </div>
        <div>
          <label htmlFor="emailOrId" className="block text-sm font-medium text-gray-700">Email or Trainee ID</label>
          <input
            type="text"
            id="emailOrId"
            name="emailOrId"
            value={formData.emailOrId}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-cfm-blue focus:border-cfm-blue sm:text-sm"
            placeholder="juan@cfmti.com or TID12345"
            required
          />
        </div>
        {error && <p className="text-sm text-error font-medium">{error}</p>}
        <button
          type="submit"
          className="w-full bg-cfm-blue text-white py-2 px-4 rounded-lg font-semibold hover:bg-cfm-dark transition duration-150 shadow-md"
        >
          Start Session
        </button>
      </form>
      <button
        onClick={() => navigate('admin-login')}
        className="mt-4 w-full text-sm text-gray-500 hover:text-cfm-blue transition duration-150"
      >
        Access Admin/Summary View
      </button>
    </div>
  );
};

export default Auth;
