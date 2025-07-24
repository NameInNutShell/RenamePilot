// Global variables
const userCount = 100;
let isActive = true;

interface UserProfile {
  userId: string;
  displayName: string;
}

class UserManager {
  private users: UserProfile[] = [];

  constructor(initialData: UserProfile[]) {
    this.users = initialData;
  }

  addUser(user: UserProfile) {
    this.users.push(user);
  }

  findUser(id: string) {
    for (let i = 0; i < this.users.length; i++) {
      const u = this.users[i];
      if (u.userId === id) {
        return u;
      }
    }
    return null;
  }
}

function processUserData(data: any[]) {
  const res = data.map((item) => item.name);
  return res;
}

// Main logic
const initialUsers = [{ userId: 'u001', displayName: 'Chris' }];
const manager = new UserManager(initialUsers);

const temp = processUserData(initialUsers);
console.log('Processed Names:', temp);
