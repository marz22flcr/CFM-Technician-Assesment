import React, { useState } from 'react';
import { View } from '../types';
import { ADMIN_PASSWORD } from '../constants';

interface AdminLoginProps {
  navigate: (view: View) => void;
}

const AdminLogin: React.FC<AdminLoginProps> = ({ navigate }) => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (password === ADMIN_PASSWORD) {
            navigate('admin');
        } else {
            setError('Invalid Admin Password.');
            setPassword('');
        }
    };

    return (
        <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-2xl shadow-xl border border-gray-100">
            <h2 className="text-2xl font-bold text-cfm-dark mb-4">Admin Login</h2>
            <p className="text-gray-600 mb-6">Enter the administrative password to access the results summary.</p>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
                    <input
                        type="password"
                        id="password"
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setError(''); }}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-cfm-blue focus:border-cfm-blue sm:text-sm"
                        required
                    />
                </div>
                {error && <p className="text-sm text-error font-medium">{error}</p>}
                <button
                    type="submit"
                    className="w-full bg-cfm-blue text-white py-2 px-4 rounded-lg font-semibold hover:bg-cfm-dark transition duration-150 shadow-md"
                >
                    Log In
                </button>
            </form>
            <button
                onClick={() => navigate('auth')}
                className="mt-4 w-full text-sm text-gray-500 hover:text-cfm-blue transition duration-150"
            >
                Back to Trainee Login
            </button>
        </div>
    );
};

export default AdminLogin;