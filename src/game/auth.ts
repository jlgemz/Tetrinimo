export interface User {
  id: string;
  username: string;
  passwordHash: string; // mock
  totalScore: number;
  gamesPlayed: number;
  avatar: string;
}

const USERS_KEY = 'tetris_users';
const CURRENT_USER_KEY = 'tetris_current_user';
const AVATARS = ['🐼', '🐧', '🦊', '🐸', '🐙', '🐵', '🦄', '🐯', '🐨', '🦁'];

export const auth = {
  getUsers(): User[] {
    const data = localStorage.getItem(USERS_KEY);
    return data ? JSON.parse(data) : [];
  },

  saveUsers(users: User[]) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  },

  getCurrentUser(): User | null {
    const data = localStorage.getItem(CURRENT_USER_KEY);
    return data ? JSON.parse(data) : null;
  },

  setCurrentUser(user: User | null) {
    if (user) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(CURRENT_USER_KEY);
    }
  },

  signup(
  username: string,
  passwordHash: string)
  : {success: boolean;error?: string;user?: User;} {
    const users = this.getUsers();
    if (users.find((u) => u.username === username)) {
      return { success: false, error: 'Username already exists' };
    }

    const newUser: User = {
      id: Math.random().toString(36).substring(2, 9),
      username,
      passwordHash,
      totalScore: 0,
      gamesPlayed: 0,
      avatar: AVATARS[Math.floor(Math.random() * AVATARS.length)]
    };

    users.push(newUser);
    this.saveUsers(users);
    this.setCurrentUser(newUser);
    return { success: true, user: newUser };
  },

  login(
  username: string,
  passwordHash: string)
  : {success: boolean;error?: string;user?: User;} {
    const users = this.getUsers();
    const user = users.find(
      (u) => u.username === username && u.passwordHash === passwordHash
    );

    if (!user) {
      return { success: false, error: 'Invalid username or password' };
    }

    this.setCurrentUser(user);
    return { success: true, user };
  },

  logout() {
    this.setCurrentUser(null);
  },

  updateUserStats(score: number) {
    const currentUser = this.getCurrentUser();
    if (!currentUser) return;

    const users = this.getUsers();
    const userIndex = users.findIndex((u) => u.id === currentUser.id);

    if (userIndex !== -1) {
      users[userIndex].totalScore += score;
      users[userIndex].gamesPlayed += 1;
      this.saveUsers(users);
      this.setCurrentUser(users[userIndex]);
    }
  }
};