import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import axios from '../../lib/axios';

export default function Profile(){
  const router = useRouter();
  const { username } = router.query;
  const [me, setMe] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get('/auth/me');
        setMe(res.data);
      } catch (err) {
        // not logged in or error
        setMe(null);
      }
    })();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Profile: {username}</h1>
      {me ? (
        <div className="bg-white p-4 rounded shadow">
          <p><strong>Name:</strong> {me.name}</p>
          <p><strong>Email:</strong> {me.email}</p>
        </div>
      ) : (
        <p className="text-sm text-gray-600">Login to see profile details.</p>
      )}
    </div>
  );
}
