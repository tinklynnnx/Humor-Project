"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";
import { createClient } from "@/lib/supabase/client";

export default function ProfilePage() {
    const [supabase] = useState(() => createClient());
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [avatarUrl, setAvatarUrl] = useState("");
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState("");

    useEffect(() => { loadProfile(); }, []);

    async function loadProfile() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            router.replace("/login");
            return;
        }
        setUser(user);
        const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
        if (profile) {
            setFirstName(profile.first_name ?? "");
            setLastName(profile.last_name ?? "");
            setAvatarUrl(profile.avatar_url ?? "");
        }
        setLoading(false);
    }

    async function saveProfile() {
        if (!user) return;
        if (!firstName.trim() || !lastName.trim()) {
            setMessage("Please enter both your first and last name.");
            return;
        }
        const { error } = await supabase.from("profiles").update({ first_name: firstName.trim(), last_name: lastName.trim() }).eq("id", user.id);
        setMessage(error ? error.message : "Profile saved successfully ♡");
    }

    async function uploadAvatar(event: React.ChangeEvent<HTMLInputElement>) {
        if (!user) return;
        const file = event.target.files?.[0];
        if (!file) return;
        setUploading(true);
        setMessage("");
        const extension = file.name.split(".").pop() || "jpg";
        const path = `${user.id}/avatar.${extension}`;
        const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
        if (uploadError) {
            setMessage(uploadError.message);
            setUploading(false);
            return;
        }
        const { data } = supabase.storage.from("avatars").getPublicUrl(path);
        const { error } = await supabase.from("profiles").update({ avatar_url: data.publicUrl }).eq("id", user.id);
        if (error) setMessage(error.message);
        else {
            setAvatarUrl(`${data.publicUrl}?t=${Date.now()}`);
            setMessage("Profile photo updated ♡");
        }
        setUploading(false);
    }

    async function logout() {
        await supabase.auth.signOut();
        router.replace("/");
        router.refresh();
    }

    if (loading) return <main className="site-page"><Navbar /><div className="page-loading"><div className="loading-heart">♡</div><p>Loading your profile...</p></div></main>;

    const displayName = `${firstName} ${lastName}`.trim();
    const initials = `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase() || "♡";

    return (
        <main className="site-page">
            <Navbar />
            <section className="profile-page">
                <div className="profile-title-row">
                    <div><p className="eyebrow">YOUR ACCOUNT</p><h1>My <span>Profile.</span></h1></div>
                    <span className="profile-bow">୨୧</span>
                </div>

                <div className="profile-layout">
                    <aside className="profile-sidebar">
                        <div className="profile-avatar-large">
                            {avatarUrl ? <img src={avatarUrl} alt="Profile" /> : <span>{initials}</span>}
                        </div>
                        <h2>{displayName || "Your Name"}</h2>
                        <p>{user?.email}</p>
                        <div className="profile-badge">✦ EDM GIRL ✦</div>
                        <Link href="/my-events" className="profile-side-link">♡ My Events</Link>
                    </aside>

                    <div className="profile-content">
                        <div className="profile-card">
                            <div className="card-title"><span className="card-icon">♡</span><div><p className="eyebrow">ABOUT YOU</p><h2>Profile details</h2></div></div>
                            <div className="profile-form">
                                <label>First name</label>
                                <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First name" />
                                <label>Last name</label>
                                <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last name" />
                                <button onClick={saveProfile} className="primary-button">Save Profile ♡</button>
                            </div>
                        </div>

                        <div className="profile-card">
                            <div className="card-title"><span className="card-icon">✧</span><div><p className="eyebrow">YOUR PHOTO</p><h2>Profile picture</h2></div></div>
                            <p className="profile-card-description">Choose a photo for your profile.</p>
                            <label className="upload-button">{uploading ? "Uploading..." : "Choose a photo ♡"}<input type="file" accept="image/*" onChange={uploadAvatar} disabled={uploading} hidden /></label>
                        </div>

                        {message && <div className="profile-message">♡ {message}</div>}

                        <div className="account-row">
                            <div><p className="eyebrow">ACCOUNT</p><h3>Sign out</h3></div>
                            <button onClick={logout} className="logout-button">Log out</button>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
