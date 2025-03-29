/**
 * Имитация хранилища данных для использования вместо Prisma
 * Предоставляет базовые функции для работы с данными в памяти
 */

// Имитационные данные для пользователей
const users = new Map();
const follows = new Map();
const userRoles = new Map();

// Инициализация некоторых тестовых данных
function initMockData() {
  // Добавление нескольких пользователей
  addUser({
    id: 'su-user-1',
    twitchId: '12345678',
    username: 'coolstreamer',
    displayName: 'Cool Streamer',
    profileImage: '/images/default-avatar-1.png',
    userType: 'streamer',
    createdAt: new Date('2023-01-15')
  });
  
  addUser({
    id: 'su-user-2',
    twitchId: '87654321',
    username: 'viewer123',
    displayName: 'Awesome Viewer',
    profileImage: '/images/default-avatar-2.png',
    userType: 'viewer',
    createdAt: new Date('2023-02-20')
  });
  
  addUser({
    id: 'su-user-3',
    twitchId: '23456789',
    username: 'gamer_pro',
    displayName: 'Pro Gamer',
    profileImage: '/images/default-avatar-3.png',
    userType: 'streamer',
    createdAt: new Date('2023-03-10')
  });
  
  // Добавляем больше пользователей для лучшего тестирования
  addUser({
    id: 'su-user-4',
    twitchId: '34567890',
    username: 'gaming_legend',
    displayName: 'Gaming Legend',
    profileImage: '/images/default-avatar-4.png',
    userType: 'streamer',
    createdAt: new Date('2023-05-15')
  });
  
  addUser({
    id: 'su-user-5',
    twitchId: '45678901',
    username: 'casual_viewer',
    displayName: 'Casual Viewer',
    profileImage: '/images/default-avatar-5.png',
    userType: 'viewer',
    createdAt: new Date('2023-06-10')
  });
  
  addUser({
    id: 'su-user-6',
    twitchId: '56789012',
    username: 'stream_fan',
    displayName: 'Stream Fan',
    profileImage: '/images/default-avatar-1.png',
    userType: 'viewer',
    createdAt: new Date('2023-07-05')
  });
  
  // Добавление подписок
  addFollow({
    id: 'follow-1',
    followerId: 'su-user-2',
    followedId: 'su-user-1',
    createdAt: new Date('2023-03-15')
  });
  
  addFollow({
    id: 'follow-2',
    followerId: 'su-user-3',
    followedId: 'su-user-1',
    createdAt: new Date('2023-04-20')
  });
  
  // Добавление еще подписок
  addFollow({
    id: 'follow-3',
    followerId: 'su-user-4',
    followedId: 'su-user-1',
    createdAt: new Date('2023-05-20')
  });
  
  addFollow({
    id: 'follow-4',
    followerId: 'su-user-5',
    followedId: 'su-user-1',
    createdAt: new Date('2023-06-15')
  });
  
  addFollow({
    id: 'follow-5',
    followerId: 'su-user-6',
    followedId: 'su-user-1',
    createdAt: new Date('2023-07-10')
  });
  
  // Добавление ролей
  addUserRole({
    userId: 'su-user-2',
    assignerId: 'su-user-1',
    roleName: 'moderator'
  });
}

// Функции для работы с пользователями
function addUser(user) {
  users.set(user.id, user);
  return user;
}

function getUserById(id) {
  return users.get(id) || null;
}

function getUserByTwitchId(twitchId) {
  return Array.from(users.values()).find(user => user.twitchId === twitchId) || null;
}

function findUsersByTwitchIds(twitchIds) {
  return Array.from(users.values()).filter(user => 
    twitchIds.includes(user.twitchId)
  );
}

// Функции для работы с подписками
function addFollow(follow) {
  follows.set(follow.id, follow);
  return follow;
}

function getFollowers(userId) {
  return Array.from(follows.values())
    .filter(follow => follow.followedId === userId)
    .map(follow => ({
      ...follow,
      follower: getUserById(follow.followerId)
    }));
}

// Функции для работы с ролями
function addUserRole(role) {
  const key = `${role.userId}_${role.assignerId}`;
  userRoles.set(key, role);
  return role;
}

function getUserRolesByAssigner(assignerId) {
  return Array.from(userRoles.values())
    .filter(role => role.assignerId === assignerId);
}

function updateUserRole(userId, assignerId, roleName) {
  const key = `${userId}_${assignerId}`;
  
  if (!roleName) {
    userRoles.delete(key);
    return null;
  }
  
  const role = {
    userId,
    assignerId,
    roleName
  };
  
  userRoles.set(key, role);
  return role;
}

// Инициализация данных при первой загрузке
initMockData();

export const mockDb = {
  users: {
    findUnique: async ({ where }) => {
      if (where.id) return getUserById(where.id);
      if (where.twitchId) return getUserByTwitchId(where.twitchId);
      return null;
    },
    findMany: async ({ where }) => {
      if (where.twitchId?.in) {
        return findUsersByTwitchIds(where.twitchId.in);
      }
      return [];
    }
  },
  follow: {
    findMany: async ({ where }) => {
      const followers = getFollowers(where.followedId);
      return followers;
    }
  },
  userRole: {
    findMany: async ({ where }) => {
      if (where.assignerId) {
        return getUserRolesByAssigner(where.assignerId);
      }
      return [];
    },
    upsert: async ({ create }) => {
      return updateUserRole(create.userId, create.assignerId, create.roleName);
    },
    deleteMany: async ({ where }) => {
      if (where.userId && where.assignerId) {
        updateUserRole(where.userId, where.assignerId, null);
        return { count: 1 };
      }
      return { count: 0 };
    }
  }
}; 