/**
 * In-Memory Store - Gerçek veri toplama için geçici çözüm
 */

interface ActiveUser {
  visitorId: string;
  sessionId: string;
  shop: string;
  lastSeen: number;
  isActive: boolean;
}

class MemoryStore {
  private users: Map<string, ActiveUser> = new Map();
  private shopUsers: Map<string, Set<string>> = new Map();

  addUser(visitorId: string, sessionId: string, shop: string): void {
    const user: ActiveUser = {
      visitorId,
      sessionId,
      shop,
      lastSeen: Date.now(),
      isActive: true,
    };

    this.users.set(visitorId, user);

    if (!this.shopUsers.has(shop)) {
      this.shopUsers.set(shop, new Set());
    }
    this.shopUsers.get(shop)!.add(visitorId);
  }

  updateUser(visitorId: string): void {
    const user = this.users.get(visitorId);
    if (user) {
      user.lastSeen = Date.now();
      user.isActive = true;
    }
  }

  removeUser(visitorId: string): void {
    const user = this.users.get(visitorId);
    if (user) {
      this.users.delete(visitorId);
      const shopUsers = this.shopUsers.get(user.shop);
      if (shopUsers) {
        shopUsers.delete(visitorId);
      }
    }
  }

  getActiveUsersCount(shop: string): number {
    const shopUsers = this.shopUsers.get(shop);
    if (!shopUsers) return 0;

    const now = Date.now();
    const activeThreshold = 30000; // 30 saniye

    let activeCount = 0;
    for (const visitorId of shopUsers) {
      const user = this.users.get(visitorId);
      if (user && (now - user.lastSeen) < activeThreshold) {
        activeCount++;
      }
    }

    return activeCount;
  }

  cleanup(): void {
    const now = Date.now();
    const inactiveThreshold = 60000; // 1 dakika

    for (const [visitorId, user] of this.users) {
      if ((now - user.lastSeen) > inactiveThreshold) {
        this.removeUser(visitorId);
      }
    }
  }

  getAllUsers(): ActiveUser[] {
    return Array.from(this.users.values());
  }

  getShopUsers(shop: string): ActiveUser[] {
    const shopUsers = this.shopUsers.get(shop);
    if (!shopUsers) return [];

    return Array.from(shopUsers)
      .map(visitorId => this.users.get(visitorId))
      .filter((user): user is ActiveUser => user !== undefined);
  }
}

export const memoryStore = new MemoryStore();

// Her 30 saniyede bir cleanup yap
setInterval(() => {
  memoryStore.cleanup();
}, 30000);
