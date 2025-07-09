class UserService {
    private db: Database;
        
    constructor(database: Database) {
        this.db = database;
    }
        
    async getUserById(id: number): Promise<User> {
      const result = await this.db.query('SELECT * FROM users WHERE id = ?', [id]);
      const userData = result[0];
      return new User(userData);
    }
        
    processUserData(data: any) {
      const temp = data.map(item => item.name);
      return temp;
    }
}