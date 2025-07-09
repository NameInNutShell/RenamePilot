function isPrime(n: number): boolean {
  if (n < 2) return false;
  for (let i = 2; i * i <= n; i++) {
    if (n % i === 0) return false;
  }
  return true;
}

function getPrimesUpTo(limit: number): number[] {
  const primes: number[] = [];
  for (let i = 2; i <= limit; i++) {
    if (isPrime(i)) {
      primes.push(i);
    }
  }
  return primes;
}

function printPrimes(primes: number[]): void {
  console.log("소수 목록을 다시 출력:");
  for (const prime of primes) {
    console.log(prime);
  }
}

// 메인 로직
const limit = 50;
const primes = getPrimesUpTo(limit);

console.log(`0부터 ${limit}까지의 소수:`);
console.log(primes.join(", "));  // 첫 번째 출력 (배열 자체)

printPrimes(primes);             // 두 번째 출력 (for문을 통해)


/*
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
}*/