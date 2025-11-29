import { useState } from 'react';
import { useRouter } from 'next/router';
import axios from '../lib/axios';

export default function Signup(){
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const submit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('/auth/register', { name, email, password });
      localStorage.setItem('token', res.data.token);
      router.push('/home');
    } catch (err) {
      alert(err.response?.data?.message || 'Signup failed');
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white p-6 rounded shadow">
      <h2 className="text-xl font-semibold mb-4">Sign Up</h2>
      <form onSubmit={submit} className="space-y-4">
        <input className="w-full border px-3 py-2 rounded" placeholder="Name" value={name} onChange={e => setName(e.target.value)} />
        <input className="w-full border px-3 py-2 rounded" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
        <input type="password" className="w-full border px-3 py-2 rounded" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
        <button className="w-full bg-green-600 text-white py-2 rounded">Create account</button>
      </form>
    </div>
  );
}
