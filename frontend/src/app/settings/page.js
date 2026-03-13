"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import NavBar from "../../components/NavBar";
import { api, getCurrentUser, setSession, clearSession } from "../../lib/api";

function EyeIcon({ open }) {
  return open ? (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState("");
  const [usernameMsg, setUsernameMsg] = useState("");
  const [bio, setBio] = useState("");
  const [profilePhoto, setProfilePhoto] = useState("");
  const [favoriteGenres, setFavoriteGenres] = useState("");
  const [profileMsg, setProfileMsg] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwMsg, setPwMsg] = useState("");

  useEffect(() => {
    const current = getCurrentUser();
    if (!current) {
      router.push("/login");
      return;
    }
    setUser(current);
    setUsername(current.username || "");
    api.publicProfile(current.username).then((data) => {
      setBio(data.user.bio || "");
      setProfilePhoto(data.user.profilePhoto || "");
      setFavoriteGenres((data.user.favoriteGenres || []).join(", "));
    }).catch(() => {});
  }, [router]);

  async function saveProfile(e) {
    e.preventDefault();
    setProfileMsg("");
    try {
      const genres = favoriteGenres.split(",").map((g) => g.trim()).filter(Boolean);
      await api.updateProfile({ bio, profile_photo: profilePhoto, favorite_genres: genres });
      setProfileMsg("Profile updated!");
    } catch (err) {
      setProfileMsg(err.message);
    }
  }

  async function changePassword(e) {
    e.preventDefault();
    setPwMsg("");
    if (newPassword !== confirmPassword) {
      setPwMsg("Passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      setPwMsg("New password must be at least 6 characters");
      return;
    }
    try {
      await api.changePassword({ currentPassword, newPassword });
      setPwMsg("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPwMsg(err.message);
    }
  }

  async function changeUsername(e) {
    e.preventDefault();
    setUsernameMsg("");

    const nextUsername = String(username || "").trim();
    if (!nextUsername) {
      setUsernameMsg("Username is required");
      return;
    }

    try {
      const data = await api.changeUsername({ username: nextUsername });
      setSession(data.token, data.user);
      setUser(data.user);
      setUsername(data.user.username || nextUsername);
      setUsernameMsg("Username updated successfully!");
    } catch (err) {
      setUsernameMsg(err.message || "Failed to update username");
    }
  }

  function handleLogout() {
    clearSession();
    router.push("/login");
  }

  if (!user) {
    return (
      <main>
        <NavBar />
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-mist/60">Loading...</p>
        </div>
      </main>
    );
  }

  return (
    <main>
      <NavBar />
      <section className="mx-auto w-full max-w-3xl px-4 py-8 md:px-6">
        <h1 className="font-display text-5xl tracking-wide text-gold">Settings</h1>
        <p className="mt-1 text-sm text-mist/60">Manage your account and preferences.</p>

        {/* Profile Settings */}
        <form onSubmit={saveProfile} className="card-surface mt-8 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-mist">Profile</h2>
          <div className="mt-4 grid gap-4">
            <div>
              <label className="mb-1 block text-sm text-mist/60">Bio</label>
              <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} placeholder="Write something about yourself..." className="w-full rounded-xl border border-white/20 bg-[#102032] px-4 py-3 outline-none focus:border-ember" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-mist/60">Profile Photo URL</label>
              <input value={profilePhoto} onChange={(e) => setProfilePhoto(e.target.value)} placeholder="https://..." className="w-full rounded-xl border border-white/20 bg-[#102032] px-4 py-3 outline-none focus:border-ember" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-mist/60">Favorite Genres</label>
              <input value={favoriteGenres} onChange={(e) => setFavoriteGenres(e.target.value)} placeholder="Action, Drama, Sci-Fi" className="w-full rounded-xl border border-white/20 bg-[#102032] px-4 py-3 outline-none focus:border-ember" />
            </div>
            <button type="submit" className="w-full rounded-xl bg-ember px-4 py-3 text-white">Save Profile</button>
            {profileMsg && <p className="text-sm text-gold">{profileMsg}</p>}
          </div>
        </form>

        {/* Change Password */}
        <form onSubmit={changePassword} className="card-surface mt-6 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-mist">Change Password</h2>
          <div className="mt-4 grid gap-4">
            <div className="relative">
              <label className="mb-1 block text-sm text-mist/60">Current Password</label>
              <input required type={showCurrent ? "text" : "password"} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="w-full rounded-xl border border-white/20 bg-[#102032] px-4 py-3 pr-11 outline-none focus:border-ember" />
              <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-[38px] text-mist/50 hover:text-mist">
                <EyeIcon open={showCurrent} />
              </button>
            </div>
            <div className="relative">
              <label className="mb-1 block text-sm text-mist/60">New Password</label>
              <input required type={showNew ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full rounded-xl border border-white/20 bg-[#102032] px-4 py-3 pr-11 outline-none focus:border-ember" />
              <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-[38px] text-mist/50 hover:text-mist">
                <EyeIcon open={showNew} />
              </button>
            </div>
            <div className="relative">
              <label className="mb-1 block text-sm text-mist/60">Confirm New Password</label>
              <input required type={showConfirm ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full rounded-xl border border-white/20 bg-[#102032] px-4 py-3 pr-11 outline-none focus:border-ember" />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-[38px] text-mist/50 hover:text-mist">
                <EyeIcon open={showConfirm} />
              </button>
            </div>
            <button type="submit" className="w-full rounded-xl bg-ember px-4 py-3 text-white">Change Password</button>
            {pwMsg && <p className="text-sm text-gold">{pwMsg}</p>}
          </div>
        </form>

        {/* Change Username */}
        <form onSubmit={changeUsername} className="card-surface mt-6 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-mist">Change Username</h2>
          <p className="mt-1 text-xs text-mist/60">Use 3-30 characters: letters, numbers, and underscores only.</p>
          <div className="mt-4 grid gap-4">
            <div>
              <label className="mb-1 block text-sm text-mist/60">New Username</label>
              <input
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-xl border border-white/20 bg-[#102032] px-4 py-3 outline-none focus:border-ember"
              />
            </div>
            <button type="submit" className="w-full rounded-xl bg-ember px-4 py-3 text-white">Update Username</button>
            {usernameMsg && <p className="text-sm text-gold">{usernameMsg}</p>}
          </div>
        </form>

        {/* Account Actions */}
        <div className="card-surface mt-6 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-mist">Account</h2>
          <div className="mt-4 flex flex-col gap-3">
            <div className="flex items-center justify-between rounded-xl bg-white/5 p-4">
              <div>
                <p className="text-sm font-medium text-mist">Username</p>
                <p className="text-xs text-mist/50">@{user.username}</p>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-white/5 p-4">
              <div>
                <p className="text-sm font-medium text-mist">Email</p>
                <p className="text-xs text-mist/50">{user.email}</p>
              </div>
            </div>
            <button onClick={handleLogout} className="mt-2 w-full rounded-xl border border-red-500/50 px-4 py-3 text-red-400 hover:bg-red-500/10">
              Logout
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
