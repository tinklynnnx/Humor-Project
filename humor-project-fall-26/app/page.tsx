import Link from "next/link";
import Navbar from "@/app/components/Navbar";

export default function Home() {
    return (
        <main className="site-page">
            <Navbar />
            <section className="hero">
                <div className="hero-content">
                    <p className="eyebrow">NYC • EDM • NIGHTLIFE</p>
                    <h1>Find your <span>next night.</span></h1>
                    <p className="hero-description">Discover EDM events, save your favorites, and plan your next night out.</p>
                    <div className="hero-buttons">
                        <Link href="/events" className="primary-button">See Events ♡</Link>
                        <Link href="/login" className="secondary-button">Log in</Link>
                    </div>
                </div>
                <div className="hero-card-stack" aria-hidden="true">
                    <div className="floating-card card-back">♡</div>
                    <div className="floating-card card-middle">✦</div>
                    <div className="floating-card card-front">
                        <span className="mini-label">TONIGHT</span>
                        <strong>Music.</strong>
                        <strong>Friends.</strong>
                        <strong>Memories.</strong>
                        <span className="card-heart">♡</span>
                    </div>
                </div>
            </section>

            <section className="home-section">
                <div className="section-heading">
                    <div>
                        <p className="eyebrow">EDM. YOUR WAY.</p>
                        <h2>Pick a night. Save it. Go.</h2>
                    </div>
                    <span className="heading-bow">୨୧</span>
                </div>
                <div className="feature-grid">
                    <Link href="/events" className="feature-card"><span className="feature-number">01</span><div className="feature-icon">♫</div><h3>Explore</h3><p>Find NYC EDM events.</p><span className="feature-link">Events →</span></Link>
                    <Link href="/my-events" className="feature-card"><span className="feature-number">02</span><div className="feature-icon">♡</div><h3>Save</h3><p>Keep your favorites close.</p><span className="feature-link">My Events →</span></Link>
                    <Link href="/profile" className="feature-card"><span className="feature-number">03</span><div className="feature-icon">✧</div><h3>Personalize</h3><p>Make your profile yours.</p><span className="feature-link">Profile →</span></Link>
                </div>
            </section>

            <footer className="footer">
                <div><strong>EDM<span>.</span></strong><p>Made for music lovers ♡</p></div>
                <div className="footer-links"><Link href="/">Home</Link><Link href="/events">Events</Link><Link href="/my-events">My Events</Link><Link href="/profile">Profile</Link></div>
            </footer>
        </main>
    );
}
