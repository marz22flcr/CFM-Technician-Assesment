import React, { useState } from 'react';
import { View, User, TraineeList } from '../types';
import { USER_KEY } from '../constants';

interface AuthProps {
  setUser: (user: User) => void;
  navigate: (view: View) => void;
  trainees: TraineeList;
}

const Auth: React.FC<AuthProps> = ({ setUser, navigate, trainees }) => {
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const username = formData.username.trim();
    const password = formData.password.trim();

    if (!username || !password) {
      setError('Username and Password are required.');
      return;
    }

    const trainee = trainees[username as keyof typeof trainees];

    if (trainee && trainee.password === password) {
      const userObj: User = {
        name: trainee.name,
        email: trainee.email,
        id: trainee.id,
        userId: `user-${username}-${Date.now()}`
      };

      localStorage.setItem(USER_KEY, JSON.stringify(userObj));
      setUser(userObj);
      navigate('lobby');
    } else {
      setError('Invalid username or password.');
      setFormData({ username: '', password: '' });
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-2xl shadow-xl border border-gray-100">
      <h2 className="text-2xl font-bold text-cfm-dark mb-4">Trainee Login</h2>
      <p className="text-gray-600 mb-6">Please enter your credentials to begin the assessment.</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-700">Username</label>
          <input
            type="text"
            id="username"
            name="username"
            value={formData.username}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-cfm-blue focus:border-cfm-blue sm:text-sm"
            placeholder="e.g. jdelacruz"
            required
            autoComplete="username"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-cfm-blue focus:border-cfm-blue sm:text-sm"
            placeholder="Enter your password"
            required
            autoComplete="current-password"
          />
        </div>
        {error && <p className="text-sm text-error font-medium">{error}</p>}
        <button
          type="submit"
          className="w-full bg-cfm-blue text-white py-2 px-4 rounded-lg font-semibold hover:bg-cfm-dark transition duration-150 shadow-md"
        >
          Login
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