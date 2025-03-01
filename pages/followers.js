import React, { useState, useEffect } from 'react';
import { useAuth } from '../src/context/AuthContext';
import styled from 'styled-components';

const FollowersContainer = styled.div`
  padding: 20px;
  background-color: #f5f5f5;
  max-width: 800px;
  margin: 20px auto;
  color: #333;
`;

const RoleButton = styled.button`
  padding: 5px 10px;
  margin: 5px;
  background-color: #e74c3c;
  color: white;
  border: none;
  border-radius: 3px;
  cursor: pointer;

  &:hover {
    background-color: #c0392b;
  }
`;

export default function Followers() {
  const { user, isAuthenticated } = useAuth();
  const [followers, setFollowers] = useState([]);
  const [roles, setRoles] = useState({});

  useEffect(() => {
    if (!isAuthenticated) window.location.href = '/auth';
    else {
      const followersData = JSON.parse(localStorage.getItem(`followers_${user.id}`)) || [];
      setFollowers(followersData);
      const savedRoles = JSON.parse(localStorage.getItem(`roles_${user.id}`)) || {};
      setRoles(savedRoles);
    }
  }, [isAuthenticated, user?.id]);

  if (!isAuthenticated) return null;

  const isStreamer = user?.isStreamer || false;

  const handleAssignRole = (followerId, role) => {
    const updatedRoles = { ...roles, [followerId]: role };
    setRoles(updatedRoles);
    localStorage.setItem(`roles_${user.id}`, JSON.stringify(updatedRoles));
    console.log(`Assigned ${role} to follower ${followerId}`);
  };

  return (
    <FollowersContainer>
      <h1>Мои подписчики</h1>
      {followers.length > 0 ? (
        followers.map((follower) => (
          <p key={follower.id}>
            {follower.name} (Twitch ID: {follower.id})
            {isStreamer && (
              <>
                <RoleButton onClick={() => handleAssignRole(follower.id, 'moderator')}>
                  Назначить модератором
                </RoleButton>
                <RoleButton onClick={() => handleAssignRole(follower.id, 'trusted')}>
                  Назначить доверенным
                </RoleButton>
                {roles[follower.id] && <span> Роль: {roles[follower.id]}</span>}
              </>
            )}
          </p>
        ))
      ) : (
        <p>У вас нет подписчиков</p>
      )}
    </FollowersContainer>
  );
}
