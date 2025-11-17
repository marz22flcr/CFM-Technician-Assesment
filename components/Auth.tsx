import React, { useState } from 'react';
import { View, User, TraineeList, FirestoreDB, Trainee } from '../types';
import { USER_KEY } from '../constants';
import { addTrainee } from '../services/firebaseService';

interface AuthProps {
  setUser: (user: User) => void;
  navigate: (view: View) => void;
  trainees: TraineeList;
  db: FirestoreDB | null;
  isFirebaseReady: boolean;
}

const Auth: React.FC<AuthProps> = ({ setUser, navigate, trainees, db, isFirebaseReady }) => {
  const [isSigningUp, setIsSigningUp] = useState(false);
  
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');

  const [signupData, setSignupData] = useState({
    name: '',
    username: '',
    password: '',
    confirmPassword: '',
    email: '',
    id: ''
  });
  const [signupError, setSignupError] = useState('');

  const handleLoginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLoginData({ ...loginData, [e.target.name]: e.target.value });
    setLoginError('');
  };
  
  const handleSignupChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSignupData({ ...signupData, [e.target.name]: e.target.value });
    setSignupError('');
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const username = loginData.username.trim();
    const password = loginData.password.trim();

    if (!username || !password) {
      setLoginError('Username and Password are required.');
      return;
    }

    const trainee = trainees[username as keyof typeof trainees];

    if (trainee && trainee.password === password) {
      const userObj: User = {
        name: trainee.name,
        email: trainee.email,
        id: trainee.id,
        userId: username
      };

      localStorage.setItem(USER_KEY, JSON.stringify(userObj));
      setUser(userObj);
      navigate('lobby');
    } else {
      setLoginError('Invalid username or password.');
      setLoginData({ username: '', password: '' });
    }
  };
  
  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupError('');

    const { name, username, password, confirmPassword, email, id } = signupData;
    const trimmedUsername = username.trim();

    if (!name.trim() || !trimmedUsername || !password.trim()) {
        setSignupError('Full Name, Username, and Password are required.');
        return;
    }
    if (password !== confirmPassword) {
        setSignupError('Passwords do not match.');
        return;
    }
    if (trimmedUsername.length < 3) {
        setSignupError('Username must be at least 3 characters long.');
        return;
    }
    if (/\s/.test(trimmedUsername)) {
        setSignupError('Username cannot contain spaces.');
        return;
    }
    if (password.trim().length < 6) {
        setSignupError('Password must be at least 6 characters long.');
        return;
    }
    if (trainees[trimmedUsername]) {
        setSignupError('Username is already taken. Please choose another.');
        return;
    }
    if (!isFirebaseReady || !db) {
        setSignupError('Cannot create account: Database not connected. Please try again later.');
        return;
    }

    try {
        const traineeData: Trainee = {
            name: name.trim(),
            password: password.trim(),
            email: email.trim(),
            id: id.trim(),
        };

        await addTrainee(db, trimmedUsername, traineeData);
        
        const userObj: User = {
            name: traineeData.name,
            email: traineeData.email,
            id: traineeData.id,
            userId: trimmedUsername
        };

        localStorage.setItem(USER_KEY, JSON.stringify(userObj));
        setUser(userObj);
        navigate('lobby');

    } catch (error) {
        console.error("Signup failed:", error);
        setSignupError('An error occurred while creating the account. Please try again.');
    }
  };

  const renderLoginForm = () => (
    <>
      <h2 className="text-2xl font-bold text-cfm-dark mb-4">Trainee Login</h2>
      <p className="text-gray-600 mb-6">Please enter your credentials to begin the assessment.</p>
      <form onSubmit={handleLoginSubmit} className="space-y-4">
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-700">Username</label>
          <input
            type="text" id="username" name="username" value={loginData.username} onChange={handleLoginChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-cfm-blue focus:border-cfm-blue sm:text-sm"
            placeholder="e.g. jdelacruz" required autoComplete="username"
          />
        </div>
        <div>
          <label htmlFor="password"className="block text-sm font-medium text-gray-700">Password</label>
          <input
            type="password" id="password" name="password" value={loginData.password} onChange={handleLoginChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-cfm-blue focus:border-cfm-blue sm:text-sm"
            placeholder="Enter your password" required autoComplete="current-password"
          />
        </div>
        {loginError && <p className="text-sm text-error font-medium">{loginError}</p>}
        <button type="submit" className="w-full bg-cfm-blue text-white py-2 px-4 rounded-lg font-semibold hover:bg-cfm-dark transition duration-150 shadow-md">
          Login
        </button>
      </form>
      <p className="text-center text-sm text-gray-500 mt-4">
        Don't have an account?{' '}
        <button onClick={() => setIsSigningUp(true)} className="font-semibold text-cfm-blue hover:underline">
            Create one
        </button>
      </p>
    </>
  );

  const renderSignupForm = () => (
    <>
      <h2 className="text-2xl font-bold text-cfm-dark mb-4">Create New Account</h2>
      <p className="text-gray-600 mb-6">Fill out the form below to register.</p>
      <form onSubmit={handleSignupSubmit} className="space-y-4">
        <div>
          <label htmlFor="signup-name" className="block text-sm font-medium text-gray-700">Full Name</label>
          <input type="text" id="signup-name" name="name" value={signupData.name} onChange={handleSignupChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-cfm-blue focus:border-cfm-blue sm:text-sm" required />
        </div>
        <div>
          <label htmlFor="signup-username" className="block text-sm font-medium text-gray-700">Username</label>
          <input type="text" id="signup-username" name="username" value={signupData.username} onChange={handleSignupChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-cfm-blue focus:border-cfm-blue sm:text-sm" required />
        </div>
        <div>
          <label htmlFor="signup-password"className="block text-sm font-medium text-gray-700">Password</label>
          <input type="password" id="signup-password" name="password" value={signupData.password} onChange={handleSignupChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-cfm-blue focus:border-cfm-blue sm:text-sm" required autoComplete="new-password" />
        </div>
        <div>
          <label htmlFor="signup-confirmPassword"className="block text-sm font-medium text-gray-700">Confirm Password</label>
          <input type="password" id="signup-confirmPassword" name="confirmPassword" value={signupData.confirmPassword} onChange={handleSignupChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-cfm-blue focus:border-cfm-blue sm:text-sm" required autoComplete="new-password" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="signup-email" className="block text-sm font-medium text-gray-700">Email (Optional)</label>
            <input type="email" id="signup-email" name="email" value={signupData.email} onChange={handleSignupChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-cfm-blue focus:border-cfm-blue sm:text-sm" />
          </div>
          <div>
            <label htmlFor="signup-id" className="block text-sm font-medium text-gray-700">Trainee ID (Optional)</label>
            <input type="text" id="signup-id" name="id" value={signupData.id} onChange={handleSignupChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-cfm-blue focus:border-cfm-blue sm:text-sm" />
          </div>
        </div>

        {signupError && <p className="text-sm text-error font-medium">{signupError}</p>}
        <button type="submit" className="w-full bg-success text-white py-2 px-4 rounded-lg font-semibold hover:bg-green-700 transition duration-150 shadow-md">
          Create Account & Start
        </button>
      </form>
      <p className="text-center text-sm text-gray-500 mt-4">
        Already have an account?{' '}
        <button onClick={() => setIsSigningUp(false)} className="font-semibold text-cfm-blue hover:underline">
            Login
        </button>
      </p>
    </>
  );

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-2xl shadow-xl border border-gray-100">
      {isSigningUp ? renderSignupForm() : renderLoginForm()}
      <button
        onClick={() => navigate('admin-login')}
        className="mt-6 w-full text-sm text-gray-500 hover:text-cfm-blue transition duration-150"
      >
        Access Admin/Summary View
      </button>
    </div>
  );
};

export default Auth;
