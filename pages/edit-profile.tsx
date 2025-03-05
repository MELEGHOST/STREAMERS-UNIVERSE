"use client";

import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import styles from './profile.module.css';
import { useRouter } from 'next/router';

export default function EditProfile() {
  const [socialLinks, setSocialLinks] = useState({
    twitter: '',
    youtube: '',
    discord: '',
    description: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const accessToken = Cookies.get('twitch_access_token');

    if (!accessToken) {
      setError('Not authenticated');
      setLoading(false);
      router.push('/auth');
      return;
    }

    const fetchSocialLinks = async () => {
      try {
        const response = await fetch('/api/twitch/socials', {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch social links: ${response.status}`);
        }

        const data = await response.json();
        setSocialLinks(data);
      } catch (error: any) { // Явно указываем тип any или Error
        console.error('Error fetching social links:', error);
        setError(error.message || 'Failed to load social links'); // Безопасный доступ через || для fallback
      } finally {
        setLoading(false);
      }
    };

    fetchSocialLinks();
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSocialLinks((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/twitch/socials', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ socialLinks }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update social links: ${response.status}`);
      }

      alert('Profile updated successfully!');
      router.push('/profile');
    } catch (error: any) { // Явно указываем тип any или Error
      console.error('Error updating social links:', error);
      setError(error.message || 'Failed to update profile');
    }
  };

  if (loading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  if (error) {
    return (
      <div className={styles.profileContainer}>
        <div className={styles.error}>
          {error}
          <button className={styles.button} onClick={() => router.push('/auth')}>
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.profileContainer}>
      <h1>Edit Profile</h1>
      <form onSubmit={handleSubmit} className={styles.editForm}>
        <textarea
          name="description"
          value={socialLinks.description}
          onChange={handleChange}
          placeholder="Description"
          className={styles.textarea}
        />
        <input
          type="text"
          name="twitter"
          value={socialLinks.twitter}
          onChange={handleChange}
          placeholder="Twitter URL"
          className={styles.input}
        />
        <input
          type="text"
          name="youtube"
          value={socialLinks.youtube}
          onChange={handleChange}
          placeholder="YouTube URL"
          className={styles.input}
        />
        <input
          type="text"
          name="discord"
          value={socialLinks.discord}
          onChange={handleChange}
          placeholder="Discord Username"
          className={styles.input}
        />
        <button type="submit" className={styles.button}>
          Save Changes
        </button>
        <button type="button" className={styles.button} onClick={() => router.push('/profile')}>
          Back to Profile
        </button>
      </form>
    </div>
  );
}
